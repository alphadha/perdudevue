<?php

namespace Tests\Feature;

use App\Enums\PairStatus;
use App\Enums\Role;
use App\Models\Client;
use App\Models\Optician;
use App\Models\Pair;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Lot5ClientSpaceTest extends TestCase
{
    use RefreshDatabase;

    public function test_client_pairs_require_auth(): void
    {
        $this->getJson('/api/v1/client/pairs')->assertUnauthorized();
        $this->getJson('/api/v1/client/profile')->assertUnauthorized();
    }

    public function test_opticien_cannot_list_client_pairs(): void
    {
        [$admin] = $this->shopWithAdmin();
        Sanctum::actingAs($admin);
        $this->getJson('/api/v1/client/pairs')->assertForbidden();
    }

    public function test_r5_01_list_follows_figma_status_order_and_hides_a_graver(): void
    {
        [$user, $client, $shop] = $this->ownerWithShop();
        $this->pair($shop, $client, 'FR5001AA', PairStatus::Inactive);
        $this->pair($shop, $client, 'FR5002BB', PairStatus::Active);
        $this->pair($shop, $client, 'FR5003CC', PairStatus::Perdue);
        $this->pair($shop, $client, 'FR5004DD', PairStatus::LivraisonDemandee);
        $this->pair($shop, $client, 'FR5005EE', PairStatus::EnLivraison);
        $this->pair($shop, $client, 'FR5006FF', PairStatus::ARecuperer);
        $this->pair($shop, $client, 'FR5007GG', PairStatus::AGraver);

        Sanctum::actingAs($user);
        $statuses = collect($this->getJson('/api/v1/client/pairs')->assertOk()->json('data'))
            ->pluck('status')
            ->all();

        $this->assertSame([
            'a_recuperer',
            'en_livraison',
            'livraison_demandee',
            'perdue',
            'active',
            'inactive',
        ], $statuses);
    }

    public function test_r5_02_declare_lost_sets_perdue_and_event(): void
    {
        [$user, $client, $shop] = $this->ownerWithShop();
        $pair = $this->pair($shop, $client, 'FR5101AA', PairStatus::Active);

        Sanctum::actingAs($user);
        $this->postJson('/api/v1/client/pairs/'.$pair->uuid.'/lost')
            ->assertOk()
            ->assertJsonPath('data.status', 'perdue')
            ->assertJsonPath('data.events.0.type', 'lost')
            ->assertJsonPath('data.events.0.label', 'Paire signalée comme perdue')
            ->assertJsonPath('data.actions.can_cancel_lost', true)
            ->assertJsonPath('data.actions.can_declare_lost', false);

        $this->assertSame(PairStatus::Perdue, $pair->fresh()->status);
    }

    public function test_r5_03_cancel_lost_returns_active(): void
    {
        [$user, $client, $shop] = $this->ownerWithShop();
        $pair = $this->pair($shop, $client, 'FR5102BB', PairStatus::Perdue);

        Sanctum::actingAs($user);
        $this->postJson('/api/v1/client/pairs/'.$pair->uuid.'/recovered')
            ->assertOk()
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.events.0.type', 'recovered');

        $this->assertSame(PairStatus::Active, $pair->fresh()->status);
    }

    public function test_r5_04_inactivate_is_irreversible_and_blocks_lost(): void
    {
        [$user, $client, $shop] = $this->ownerWithShop();
        $pair = $this->pair($shop, $client, 'FR5103CC', PairStatus::Active);

        Sanctum::actingAs($user);
        $this->postJson('/api/v1/client/pairs/'.$pair->uuid.'/inactivate')
            ->assertOk()
            ->assertJsonPath('data.status', 'inactive')
            ->assertJsonPath('data.actions.can_declare_lost', false)
            ->assertJsonPath('data.actions.can_inactivate', false)
            ->assertJsonPath('data.actions.can_archive', true);

        $this->postJson('/api/v1/client/pairs/'.$pair->uuid.'/lost')->assertStatus(422);
        $this->postJson('/api/v1/client/pairs/'.$pair->uuid.'/inactivate')->assertStatus(422);
        $this->assertFalse($pair->fresh()->status->allowsLostOrFound());
    }

    public function test_r5_05_archive_hides_pair_from_client_and_opticien_keeps_code(): void
    {
        [$user, $client, $shop] = $this->ownerWithShop();
        $admin = User::factory()->opticienAdmin()->create();
        $shop->users()->attach($admin->id);
        $pair = $this->pair($shop, $client, 'FR5104DD', PairStatus::Inactive);

        Sanctum::actingAs($user);
        $this->deleteJson('/api/v1/client/pairs/'.$pair->uuid)->assertOk();
        $this->getJson('/api/v1/client/pairs/'.$pair->uuid)->assertNotFound();

        Sanctum::actingAs($admin);
        $this->getJson('/api/v1/opticien/pairs/'.$pair->uuid)->assertNotFound();

        $this->assertSame(PairStatus::Archivee, $pair->fresh()->status);
        $this->assertSame('FR5104DD', $pair->fresh()->assigned_code);
    }

    public function test_r5_06_a_recuperer_exposes_pickup_and_maps_without_foreign_pii(): void
    {
        [$user, $client, $shopA] = $this->ownerWithShop('Optique A', 'client.c1@example.com');
        $shopB = Optician::query()->create([
            'name' => 'L’Œil Moderne',
            'address' => '15 rue du Taur',
            'city' => 'Toulouse',
            'postal_code' => '31000',
            'phone' => '0561000002',
        ]);
        $pair = $this->pair($shopA, $client, 'FR5105EE', PairStatus::ARecuperer);
        $pair->depositary_optician_id = $shopB->id;
        $pair->pickup_code = 'KSKKYK';
        $pair->save();

        Sanctum::actingAs($user);
        $response = $this->getJson('/api/v1/client/pairs/'.$pair->uuid)->assertOk();
        $response->assertJsonPath('data.pickup_code', 'KSKKYK')
            ->assertJsonPath('data.depositary_shop.name', 'L’Œil Moderne')
            ->assertJsonPath('data.actions.can_recover', true)
            ->assertJsonPath('data.actions.can_request_delivery', true);
        $this->assertStringContainsString('google.com/maps', (string) $response->json('data.depositary_shop.maps_url'));
        $this->assertArrayNotHasKey('email', $response->json('data'));
        $this->assertArrayNotHasKey('client', $response->json('data'));
    }

    public function test_r5_07_client_cannot_see_another_client_pair(): void
    {
        [$userA, $clientA, $shop] = $this->ownerWithShop('Optique A', 'client.c1@example.com');
        [, $clientB] = $this->ownerWithShop('Optique B', 'client.c2@example.com');
        $pairB = $this->pair($shop, $clientB, 'FR5106FF', PairStatus::Active);

        Sanctum::actingAs($userA);
        $this->getJson('/api/v1/client/pairs/'.$pairB->uuid)->assertNotFound();
        $this->postJson('/api/v1/client/pairs/'.$pairB->uuid.'/lost')->assertNotFound();
        $ids = collect($this->getJson('/api/v1/client/pairs')->json('data'))->pluck('uuid');
        $this->assertFalse($ids->contains($pairB->uuid));
        $this->assertNotSame($clientA->id, $clientB->id);
    }

    public function test_client_updates_personal_info_and_account(): void
    {
        [$user, $client] = $this->ownerWithShop();
        Sanctum::actingAs($user);

        $this->patchJson('/api/v1/client/profile', [
            'first_name' => 'Étienne',
            'last_name' => 'Morel',
            'phone' => '0699887766',
        ])->assertOk()
            ->assertJsonPath('data.first_name', 'Étienne')
            ->assertJsonPath('data.phone', '0699887766');

        $this->assertSame('Étienne', $client->fresh()->first_name);
        $this->assertSame('Étienne', $user->fresh()->first_name);

        $this->patchJson('/api/v1/client/account/email', [
            'email' => 'etienne.morel@example.com',
            'current_password' => 'Password1',
        ])->assertOk()->assertJsonPath('data.email', 'etienne.morel@example.com');
        $this->assertSame('etienne.morel@example.com', $client->fresh()->email);

        $this->deleteJson('/api/v1/client/account')->assertOk();
        $this->assertNotNull($user->fresh()->blocked_at);
    }

    public function test_r5_08_sms_off_blocks_pickup_sms(): void
    {
        [$user, $client, $shop] = $this->ownerWithShop();
        $client->consent_sms = false;
        $client->consent_email = true;
        $client->save();
        $pair = $this->pair($shop, $client, 'FR5107GG', PairStatus::ARecuperer);
        $pair->depositary_optician_id = $shop->id;
        $pair->pickup_code = 'ABCDEF';
        $pair->save();

        Sanctum::actingAs($user);
        $this->patchJson('/api/v1/client/profile/consents', [
            'consent_email' => true,
            'consent_sms' => false,
        ])->assertOk()->assertJsonPath('data.consent_sms', false);

        $this->postJson('/api/v1/client/pairs/'.$pair->uuid.'/resend', ['channels' => ['sms']])
            ->assertStatus(422)
            ->assertJsonPath('errors.0.field', 'channels');

        $this->assertDatabaseMissing('notification_logs', [
            'type' => 'pair_found',
            'channel' => 'sms',
            'recipient' => $client->phone,
        ]);
    }

    /**
     * @return array{0: User, 1: Client, 2: Optician}
     */
    private function ownerWithShop(string $shopName = 'Optique A', string $email = 'client.c1@example.com'): array
    {
        $user = User::factory()->create(['email' => $email, 'role' => Role::Client]);
        $client = Client::query()->create([
            'user_id' => $user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'email' => $email,
            'phone' => '0612345678',
            'consent_email' => true,
            'consent_sms' => true,
        ]);
        $shop = Optician::query()->create([
            'name' => $shopName,
            'address' => '10 rue Test',
            'city' => 'Paris',
            'postal_code' => '75001',
            'phone' => '0142000001',
        ]);
        $shop->clients()->attach($client->id);

        return [$user->fresh(), $client, $shop];
    }

    /**
     * @return array{0: User, 1: Optician}
     */
    private function shopWithAdmin(): array
    {
        $admin = User::factory()->opticienAdmin()->create();
        $shop = Optician::query()->create(['name' => 'Optique A']);
        $shop->users()->attach($admin->id);

        return [$admin->fresh(), $shop];
    }

    private function pair(Optician $shop, Client $client, string $code, PairStatus $status): Pair
    {
        $pair = new Pair;
        $pair->forceFill([
            'client_id' => $client->id,
            'origin_optician_id' => $shop->id,
            'assigned_code' => $code,
            'status' => $status,
            'type' => 'Vue',
            'brand' => 'Gucci',
            'colors' => ['Noir'],
            'description' => 'Monture en titane',
            'registered_at' => now(),
        ])->save();

        return $pair;
    }
}
