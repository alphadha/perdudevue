<?php

namespace Tests\Feature;

use App\Enums\PairStatus;
use App\Enums\Role;
use App\Models\Client;
use App\Models\Network;
use App\Models\NetworkTariff;
use App\Models\Optician;
use App\Models\Pair;
use App\Models\User;
use App\Services\BillingReviewService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class Lot10BillingTest extends TestCase
{
    use RefreshDatabase;

    public function test_r10_01_flags_missing_siret_network_and_duplicate(): void
    {
        $network = Network::query()->create(['name' => 'Réseau Test', 'active' => true]);
        Optician::query()->create([
            'name' => 'Optique Sans Siret',
            'network_id' => $network->id,
        ]);
        Optician::query()->create([
            'name' => 'Optique Doublon A',
            'siret' => '12345678901234',
        ]);
        Optician::query()->create([
            'name' => 'Optique Doublon B',
            'siret' => '12345678901234',
        ]);

        $messages = collect(app(BillingReviewService::class)->issues())->pluck('message');
        $this->assertTrue($messages->contains(fn (string $message) => str_contains($message, 'SIRET manquant')));
        $this->assertTrue($messages->contains(fn (string $message) => str_contains($message, 'tarif')));
        $this->assertTrue($messages->contains(fn (string $message) => str_contains($message, 'doublon')));
        $this->assertTrue($messages->contains(fn (string $message) => str_contains($message, 'Aucun réseau')));
    }

    public function test_r10_02_qonto_never_calls_http(): void
    {
        Http::fake();

        config(['services.qonto.secret' => '']);
        $skipped = app(BillingReviewService::class)->syncQonto();
        $this->assertSame('skipped', $skipped->status);

        config(['services.qonto.secret' => 'test-secret']);
        $queued = app(BillingReviewService::class)->syncQonto();
        $this->assertSame('queued', $queued->status);

        Http::assertNothingSent();
    }

    public function test_r10_03_admin_opens_billing_pages_opticien_forbidden(): void
    {
        $admin = User::factory()->admin()->create();
        $opticien = User::factory()->opticienAdmin()->create();

        $this->actingAs($admin)->get('/admin/billing-review')->assertOk()->assertSee('Anomalies');
        $this->actingAs($admin)->get('/admin/qonto-sync')->assertOk()->assertSee('QONTO_SECRET');

        $this->actingAs($opticien)->get('/admin/billing-review')->assertForbidden();
        $this->actingAs($opticien)->get('/admin/qonto-sync')->assertForbidden();
    }

    public function test_r10_04_preview_counts_month_pairs_and_indicative_amount(): void
    {
        $network = Network::query()->create(['name' => 'Indépendants', 'active' => true]);
        NetworkTariff::query()->create([
            'network_id' => $network->id,
            'label' => 'Paire',
            'unit' => 'per_pair',
            'amount_cents' => 250,
            'currency' => 'EUR',
        ]);
        $shop = Optician::query()->create([
            'name' => 'Optique Indicative',
            'siret' => '11111111111111',
            'network_id' => $network->id,
            'billing_email' => 'factu@example.com',
            'billing_iban' => 'FR7611111111111111111111111',
            'qonto_id' => 'cp-1',
        ]);
        $owner = User::factory()->create(['role' => Role::Client, 'email' => 'bill.client@example.com']);
        $client = Client::query()->create([
            'user_id' => $owner->id,
            'first_name' => 'Bill',
            'last_name' => 'Client',
            'email' => $owner->email,
            'phone' => '0600000001',
        ]);
        $pair = new Pair;
        $pair->forceFill([
            'client_id' => $client->id,
            'origin_optician_id' => $shop->id,
            'assigned_code' => 'FR1010AA',
            'status' => PairStatus::Active,
            'type' => 'Vue',
            'brand' => 'Gucci',
            'colors' => ['Noir'],
            'registered_at' => now(),
        ])->save();

        $row = collect(app(BillingReviewService::class)->previews())
            ->firstWhere('shop', 'Optique Indicative');
        $this->assertNotNull($row);
        $this->assertSame(1, $row['pairs']);
        $this->assertSame('Indépendants', $row['network']);
        $this->assertStringContainsString('indicatif', $row['amount_label']);
        $this->assertStringContainsString('2,50', $row['amount_label']);
    }
}
