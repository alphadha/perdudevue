<?php

namespace Tests\Feature;

use App\Enums\PairStatus;
use App\Enums\Role;
use App\Mail\PairFoundMail;
use App\Models\Client;
use App\Models\Optician;
use App\Models\Pair;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Lot4RestitutionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_restitutions_require_auth(): void
    {
        $this->postJson('/api/v1/opticien/restitutions/identify', ['assigned_code' => 'FR5487OK'])
            ->assertUnauthorized();
    }

    public function test_r4_01_depositary_does_not_see_owner_pii(): void
    {
        Mail::fake();
        [$adminA, $shopA] = $this->shopWithAdmin('Optique A', 'opticien.a@example.com');
        [$adminB, $shopB] = $this->shopWithAdmin('Optique B', 'opticien.b@example.com');
        $client = $this->seedClient($shopA, 'client.c1@example.com', 'Camille', 'Leroy');
        $this->activePair($shopA, $client, 'FR5488OK');

        Sanctum::actingAs($adminB);
        $identify = $this->postJson('/api/v1/opticien/restitutions/identify', [
            'assigned_code' => 'FR5488OK',
        ])->assertOk();
        $this->assertArrayNotHasKey('client', $identify->json('data'));
        $identify->assertJsonMissing(['email' => 'client.c1@example.com']);
        $identify->assertJsonMissing(['first_name' => 'Camille']);

        $created = $this->postJson('/api/v1/opticien/restitutions', [
            'assigned_code' => 'FR5488OK',
        ])->assertCreated();
        $created->assertJsonPath('data.status', 'a_recuperer');
        $created->assertJsonPath('data.client', null);
        $created->assertJsonMissing(['email' => 'client.c1@example.com']);
        $created->assertJsonMissing(['phone' => '0612345678']);

        $this->assertSame($shopB->id, Pair::query()->where('assigned_code', 'FR5488OK')->value('depositary_optician_id'));
    }

    public function test_r4_02_found_sends_email_with_public_link_and_pickup_code(): void
    {
        Mail::fake();
        [$adminA, $shopA] = $this->shopWithAdmin();
        [$adminB] = $this->shopWithAdmin('Optique B', 'opticien.b@example.com');
        $client = $this->seedClient($shopA);
        $this->activePair($shopA, $client, 'FR1001AA');

        Sanctum::actingAs($adminB);
        $this->postJson('/api/v1/opticien/restitutions', ['assigned_code' => 'FR1001AA'])
            ->assertCreated();

        $pickup = Pair::query()->where('assigned_code', 'FR1001AA')->value('pickup_code');
        $this->assertSame(6, strlen((string) $pickup));

        Mail::assertSent(PairFoundMail::class, function (PairFoundMail $mail) use ($client, $pickup) {
            return $mail->hasTo($client->email)
                && $mail->pickupCode === $pickup
                && str_contains($mail->publicUrl, '/r/');
        });
        $this->assertDatabaseHas('notification_logs', [
            'type' => 'pair_found',
            'channel' => 'email',
            'status' => 'sent',
            'recipient' => $client->email,
        ]);
    }

    public function test_r4_03_and_r4_04_dashboard_handover_cta_and_waiting_max_5(): void
    {
        Mail::fake();
        [$adminA, $shopA] = $this->shopWithAdmin();
        [$adminB, $shopB] = $this->shopWithAdmin('Optique B', 'opticien.b@example.com');
        $client = $this->seedClient($shopA);

        Sanctum::actingAs($adminB);
        $this->getJson('/api/v1/opticien/dashboard')
            ->assertOk()
            ->assertJsonPath('data.can_hand_over', false)
            ->assertJsonPath('data.waiting_pickup', []);

        for ($i = 0; $i < 6; $i++) {
            $code = sprintf('FR21%02dAA', $i);
            $this->activePair($shopA, $client, $code);
            $this->postJson('/api/v1/opticien/restitutions', [
                'assigned_code' => $code,
            ])->assertCreated();
        }

        $dashboard = $this->getJson('/api/v1/opticien/dashboard')->assertOk();
        $dashboard->assertJsonPath('data.can_hand_over', true);
        $dashboard->assertJsonPath('data.found_count', 6);
        $this->assertCount(5, $dashboard->json('data.waiting_pickup'));

        Sanctum::actingAs($adminA);
        $this->getJson('/api/v1/opticien/dashboard')
            ->assertOk()
            ->assertJsonPath('data.can_hand_over', false)
            ->assertJsonPath('data.found_count', 0);
    }

    public function test_dashboard_waiting_pickup_includes_livraison_demandee(): void
    {
        Mail::fake();
        [$adminA, $shopA] = $this->shopWithAdmin();
        $client = $this->seedClient($shopA);
        $pair = $this->activePair($shopA, $client, 'FR4401ZZ');
        $pair->forceFill([
            'status' => \App\Enums\PairStatus::LivraisonDemandee,
            'depositary_optician_id' => $shopA->id,
            'found_at' => now(),
        ])->save();

        Sanctum::actingAs($adminA);
        $dashboard = $this->getJson('/api/v1/opticien/dashboard')->assertOk();
        $this->assertCount(1, $dashboard->json('data.waiting_pickup'));
        $dashboard->assertJsonPath('data.waiting_pickup.0.assigned_code', 'FR4401ZZ');
        $dashboard->assertJsonPath('data.found_count', 0);
        $dashboard->assertJsonPath('data.can_hand_over', false);
    }

    public function test_r4_05_handover_at_b_masks_unknown_client(): void
    {
        Mail::fake();
        [, $shopA] = $this->shopWithAdmin();
        [$adminB] = $this->shopWithAdmin('Optique B', 'opticien.b@example.com');
        $client = $this->seedClient($shopA, 'client.c1@example.com', 'Camille', 'Leroy');
        $this->activePair($shopA, $client, 'FR3001BB');

        Sanctum::actingAs($adminB);
        $this->postJson('/api/v1/opticien/restitutions', ['assigned_code' => 'FR3001BB'])->assertCreated();
        $pickup = Pair::query()->where('assigned_code', 'FR3001BB')->value('pickup_code');

        $lookup = $this->postJson('/api/v1/opticien/restitutions/lookup', [
            'pickup_code' => $pickup,
        ])->assertOk();
        $lookup->assertJsonPath('data.client', null);
        $lookup->assertJsonMissing(['first_name' => 'Camille']);

        $this->postJson('/api/v1/opticien/restitutions/handover', [
            'pickup_code' => $pickup,
        ])->assertOk()->assertJsonPath('data.status', 'active');

        $pair = Pair::query()->where('assigned_code', 'FR3001BB')->first();
        $this->assertSame(PairStatus::Active, $pair?->status);
        $this->assertNull($pair?->depositary_optician_id);
    }

    public function test_r4_06_handover_shows_name_when_client_of_shop(): void
    {
        Mail::fake();
        [$adminA, $shopA] = $this->shopWithAdmin();
        $client = $this->seedClient($shopA, 'client.c2@example.com', 'Chloe', 'Bernard');
        $this->activePair($shopA, $client, 'FR3002CC');

        Sanctum::actingAs($adminA);
        $this->postJson('/api/v1/opticien/restitutions', ['assigned_code' => 'FR3002CC'])->assertCreated();
        $pickup = Pair::query()->where('assigned_code', 'FR3002CC')->value('pickup_code');

        $this->postJson('/api/v1/opticien/restitutions/lookup', ['pickup_code' => $pickup])
            ->assertOk()
            ->assertJsonPath('data.client.first_name', 'Chloe')
            ->assertJsonPath('data.client.last_name', 'Bernard')
            ->assertJsonMissingPath('data.client.email');
    }

    public function test_r4_07_wrong_pickup_code_does_not_close(): void
    {
        Mail::fake();
        [, $shopA] = $this->shopWithAdmin();
        [$adminB] = $this->shopWithAdmin('Optique B', 'opticien.b@example.com');
        $client = $this->seedClient($shopA);
        $this->activePair($shopA, $client, 'FR3003DD');

        Sanctum::actingAs($adminB);
        $this->postJson('/api/v1/opticien/restitutions', ['assigned_code' => 'FR3003DD'])->assertCreated();

        $this->postJson('/api/v1/opticien/restitutions/handover', ['pickup_code' => 'XXXXXX'])
            ->assertStatus(422)
            ->assertJsonPath('errors.0.field', 'pickup_code');

        $this->assertSame(
            PairStatus::ARecuperer,
            Pair::query()->where('assigned_code', 'FR3003DD')->first()?->status
        );
    }

    public function test_r4_08_inactive_pair_cannot_be_found(): void
    {
        [$adminA, $shopA] = $this->shopWithAdmin();
        [$adminB] = $this->shopWithAdmin('Optique B', 'opticien.b@example.com');
        $client = $this->seedClient($shopA);
        $pair = $this->activePair($shopA, $client, 'FR3004EE');
        $pair->status = PairStatus::Inactive;
        $pair->save();

        Sanctum::actingAs($adminB);
        $this->postJson('/api/v1/opticien/restitutions/identify', ['assigned_code' => 'FR3004EE'])
            ->assertStatus(422);
        $this->postJson('/api/v1/opticien/restitutions', ['assigned_code' => 'FR3004EE'])
            ->assertStatus(422);
        $this->assertSame(PairStatus::Inactive, $pair->fresh()->status);
    }

    public function test_r4_09_after_handover_pair_leaves_restitution_list(): void
    {
        Mail::fake();
        [, $shopA] = $this->shopWithAdmin();
        [$adminB] = $this->shopWithAdmin('Optique B', 'opticien.b@example.com');
        $client = $this->seedClient($shopA);
        $this->activePair($shopA, $client, 'FR3005FF');

        Sanctum::actingAs($adminB);
        $this->postJson('/api/v1/opticien/restitutions', ['assigned_code' => 'FR3005FF'])->assertCreated();
        $this->assertCount(1, $this->getJson('/api/v1/opticien/restitutions')->json('data'));

        $pickup = Pair::query()->where('assigned_code', 'FR3005FF')->value('pickup_code');
        $this->postJson('/api/v1/opticien/restitutions/handover', ['pickup_code' => $pickup])->assertOk();

        $this->getJson('/api/v1/opticien/restitutions')->assertOk()->assertJsonPath('data', []);
        $this->assertSame(PairStatus::Active, Pair::query()->where('assigned_code', 'FR3005FF')->first()?->status);
    }

    public function test_r4_10_resend_is_rate_limited(): void
    {
        Mail::fake();
        [, $shopA] = $this->shopWithAdmin();
        [$adminB] = $this->shopWithAdmin('Optique B', 'opticien.b@example.com');
        $client = $this->seedClient($shopA);
        $this->activePair($shopA, $client, 'FR3006GG');

        Sanctum::actingAs($adminB);
        $uuid = $this->postJson('/api/v1/opticien/restitutions', ['assigned_code' => 'FR3006GG'])
            ->json('data.uuid');

        $this->postJson('/api/v1/opticien/restitutions/'.$uuid.'/resend', ['channels' => ['email', 'sms']])
            ->assertOk();
        $this->assertDatabaseHas('notification_logs', [
            'type' => 'pair_found',
            'channel' => 'sms',
            'status' => 'sent',
        ]);

        for ($i = 0; $i < 4; $i++) {
            $this->postJson('/api/v1/opticien/restitutions/'.$uuid.'/resend', ['channels' => ['email']])
                ->assertOk();
        }
        $this->postJson('/api/v1/opticien/restitutions/'.$uuid.'/resend', ['channels' => ['email']])
            ->assertStatus(429);
    }

    public function test_r4_11_origin_shop_does_not_see_foreign_deposit(): void
    {
        Mail::fake();
        [$adminA, $shopA] = $this->shopWithAdmin();
        [$adminB] = $this->shopWithAdmin('Optique B', 'opticien.b@example.com');
        $client = $this->seedClient($shopA);
        $this->activePair($shopA, $client, 'FR3007HH');

        Sanctum::actingAs($adminB);
        $this->postJson('/api/v1/opticien/restitutions', ['assigned_code' => 'FR3007HH'])->assertCreated();
        $pickup = Pair::query()->where('assigned_code', 'FR3007HH')->value('pickup_code');

        Sanctum::actingAs($adminA);
        $this->getJson('/api/v1/opticien/restitutions')->assertOk()->assertJsonPath('data', []);
        $this->postJson('/api/v1/opticien/restitutions/lookup', ['pickup_code' => $pickup])
            ->assertStatus(422);
        $this->postJson('/api/v1/opticien/restitutions/handover', ['pickup_code' => $pickup])
            ->assertStatus(422);
    }

    /**
     * @return array{0: User, 1: Optician}
     */
    private function shopWithAdmin(string $name = 'Optique A', string $email = 'opticien.a@example.com'): array
    {
        $admin = User::factory()->opticienAdmin()->create(['email' => $email]);
        $shop = Optician::query()->create(['name' => $name, 'address' => '10 rue Test', 'city' => 'Paris', 'postal_code' => '75001']);
        $shop->users()->attach($admin->id);

        return [$admin->fresh(), $shop];
    }

    private function seedClient(
        Optician $shop,
        string $email = 'client.c1@example.com',
        string $first = 'Camille',
        string $last = 'Leroy',
    ): Client {
        $user = User::factory()->create([
            'email' => $email,
            'first_name' => $first,
            'last_name' => $last,
            'role' => Role::Client,
        ]);
        $client = Client::query()->create([
            'user_id' => $user->id,
            'first_name' => $first,
            'last_name' => $last,
            'email' => $email,
            'phone' => '0612345678',
            'consent_email' => true,
            'consent_sms' => true,
        ]);
        $shop->clients()->attach($client->id);

        return $client;
    }

    private function activePair(Optician $shop, Client $client, string $code): Pair
    {
        $pair = new Pair;
        $pair->forceFill([
            'client_id' => $client->id,
            'origin_optician_id' => $shop->id,
            'assigned_code' => $code,
            'status' => PairStatus::Active,
            'type' => 'Vue',
            'brand' => 'Gucci',
            'colors' => ['Noir'],
            'registered_at' => now(),
        ])->save();

        return $pair;
    }
}
