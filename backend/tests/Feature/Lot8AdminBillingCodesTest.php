<?php

namespace Tests\Feature;

use App\Enums\PairStatus;
use App\Enums\Role;
use App\Models\Client;
use App\Models\Network;
use App\Models\Optician;
use App\Models\Pair;
use App\Models\User;
use App\Services\BillingReviewService;
use App\Services\CodeLotService;
use App\Support\AssignedCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

class Lot8AdminBillingCodesTest extends TestCase
{
    use RefreshDatabase;

    public function test_r8_01_admin_can_open_notification_journal_opticien_cannot(): void
    {
        $admin = User::factory()->admin()->create();
        $opticien = User::factory()->opticienAdmin()->create();

        $this->actingAs($admin)->get('/admin/notification-logs')->assertOk();
        $this->actingAs($opticien)->get('/admin/notification-logs')->assertForbidden();
    }

    public function test_r8_02_admin_dashboard_and_consultation_opticien_forbidden(): void
    {
        $admin = User::factory()->admin()->create();
        $opticien = User::factory()->opticienAdmin()->create();
        $shop = Optician::query()->create(['name' => 'Optique KPI', 'city' => 'Lyon']);
        $owner = User::factory()->create(['role' => Role::Client, 'email' => 'c.kpi@example.com']);
        $client = Client::query()->create([
            'user_id' => $owner->id,
            'first_name' => 'Camille',
            'last_name' => 'Kpi',
            'email' => $owner->email,
            'phone' => '0600000000',
            'consent_email' => true,
            'consent_sms' => true,
        ]);
        $open = new Pair;
        $open->forceFill([
            'client_id' => $client->id,
            'origin_optician_id' => $shop->id,
            'assigned_code' => 'FR8801AA',
            'status' => PairStatus::ARecuperer,
            'type' => 'Vue',
            'brand' => 'Gucci',
            'colors' => ['Noir'],
            'registered_at' => now(),
            'found_at' => now(),
            'pickup_code' => 'ABCDEF',
        ])->save();
        $archived = new Pair;
        $archived->forceFill([
            'client_id' => $client->id,
            'origin_optician_id' => $shop->id,
            'assigned_code' => 'FR8802BB',
            'status' => PairStatus::Archivee,
            'type' => 'Vue',
            'brand' => 'Ray-Ban',
            'colors' => ['Noir'],
            'registered_at' => now(),
        ])->save();

        $this->actingAs($admin)->get('/admin')->assertOk();
        Livewire::test(\App\Filament\Widgets\PdvStatsWidget::class)->assertSee('Restitutions en cours');
        $this->actingAs($admin)->get('/admin/pairs')->assertOk()->assertSee('FR8802BB')->assertSee('FR8801AA');
        $this->actingAs($admin)->get('/admin/restitutions')->assertOk()->assertSee('FR8801AA')->assertDontSee('FR8802BB');
        $this->actingAs($admin)->get('/admin/clients')->assertOk()->assertSee('c.kpi@example.com');

        $this->actingAs($opticien)->get('/admin')->assertForbidden();
        $this->actingAs($opticien)->get('/admin/pairs')->assertForbidden();
    }

    public function test_r8_04_blocked_opticien_cannot_login(): void
    {
        $user = User::factory()->opticienAdmin()->create(['email' => 'opticien.block@example.com']);
        $user->block();

        $this->postJson('/api/v1/auth/login', [
            'email' => 'opticien.block@example.com',
            'password' => 'Password1',
            'space' => 'opticien',
        ])
            ->assertUnauthorized()
            ->assertJsonPath('errors.0.message', 'Identifiants incorrects.');
    }

    public function test_r9_01_code_lot_generates_unique_fr_codes_and_csv(): void
    {
        $lot = app(CodeLotService::class)->create('Lot graveur Toulouse', 3);
        $this->assertCount(3, $lot->items);
        foreach ($lot->items as $item) {
            $this->assertTrue(AssignedCode::isValid($item->code));
        }
        $this->assertCount(3, $lot->items->pluck('code')->unique());

        $csv = app(CodeLotService::class)->csv($lot->fresh());
        $this->assertStringStartsWith("code\n", $csv);
        $this->assertSame('exported', $lot->fresh()->status);
        $this->assertStringContainsString($lot->items->first()->code, $csv);

        $generated = AssignedCode::generateUnique();
        $this->assertFalse($lot->items->pluck('code')->contains($generated));
    }

    public function test_r10_01_billing_review_flags_missing_siret_and_tariff(): void
    {
        $network = Network::query()->create(['name' => 'Réseau Test', 'active' => true]);
        Optician::query()->create([
            'name' => 'Optique Sans Siret',
            'network_id' => $network->id,
        ]);
        $issues = app(BillingReviewService::class)->issues();
        $messages = collect($issues)->pluck('message')->all();
        $this->assertTrue(collect($messages)->contains(fn (string $message) => str_contains($message, 'SIRET')));
        $this->assertTrue(collect($messages)->contains(fn (string $message) => str_contains($message, 'tarif')));
    }

    public function test_r10_02_qonto_sync_is_skipped_without_secret(): void
    {
        config(['services.qonto.secret' => '']);
        $log = app(BillingReviewService::class)->syncQonto();
        $this->assertSame('skipped', $log->status);
        $this->assertDatabaseHas('qonto_sync_logs', ['status' => 'skipped']);
    }
}
