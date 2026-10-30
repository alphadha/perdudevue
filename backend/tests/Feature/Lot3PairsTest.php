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

class Lot3PairsTest extends TestCase
{
    use RefreshDatabase;

    public function test_pairs_require_auth(): void
    {
        $this->getJson('/api/v1/opticien/pairs')->assertUnauthorized();
        $this->postJson('/api/v1/opticien/pairs', [])->assertUnauthorized();
    }

    public function test_r3_01_create_without_code_is_a_graver_with_unique_fr_code(): void
    {
        [$admin, $shop] = $this->shopWithAdmin();
        $client = $this->seedClient($shop);

        Sanctum::actingAs($admin);
        $response = $this->postJson('/api/v1/opticien/pairs', $this->payload($client->uuid))
            ->assertCreated()
            ->assertJsonPath('data.status', 'a_graver')
            ->assertJsonPath('data.status_label', 'À graver')
            ->assertJsonPath('data.title', 'Lunettes Vue - Gucci')
            ->assertJsonPath('data.actions.can_engrave', true)
            ->assertJsonPath('data.actions.can_export_code', true)
            ->assertJsonPath('data.actions.can_inactivate', false);

        $code = $response->json('data.assigned_code');
        $this->assertSame(8, strlen($code));
        $this->assertMatchesRegularExpression('/^FR[0-9]{4}[A-Z]{2}$/', $code);
        $this->assertSame(1, Pair::query()->where('assigned_code', $code)->count());
        $this->assertSame('registered', $response->json('data.events.0.type'));
    }

    public function test_already_engraved_code_must_match_fr_format(): void
    {
        [$admin, $shop] = $this->shopWithAdmin();
        $client = $this->seedClient($shop);
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/opticien/pairs', $this->payload($client->uuid, [
            'already_engraved' => true,
            'assigned_code' => 'SJE83738',
        ]))->assertStatus(422)->assertJsonPath('errors.0.field', 'assigned_code');
    }

    public function test_r3_02_other_brand_is_persisted_as_free_label(): void
    {
        [$admin, $shop] = $this->shopWithAdmin();
        $client = $this->seedClient($shop);

        Sanctum::actingAs($admin);
        $this->postJson('/api/v1/opticien/pairs', $this->payload($client->uuid, [
            'brand' => 'Autre marque',
            'custom_brand' => 'Lunetier du Coin',
        ]))
            ->assertCreated()
            ->assertJsonPath('data.brand', 'Lunetier du Coin')
            ->assertJsonPath('data.title', 'Lunettes Vue - Lunetier du Coin');
    }

    public function test_r3_03_invalid_type_is_rejected(): void
    {
        [$admin, $shop] = $this->shopWithAdmin();
        $client = $this->seedClient($shop);

        Sanctum::actingAs($admin);
        $this->postJson('/api/v1/opticien/pairs', $this->payload($client->uuid, [
            'type' => 'Sport',
        ]))->assertStatus(422);
    }

    public function test_r3_04_colors_are_persisted(): void
    {
        [$admin, $shop] = $this->shopWithAdmin();
        $client = $this->seedClient($shop);

        Sanctum::actingAs($admin);
        $this->postJson('/api/v1/opticien/pairs', $this->payload($client->uuid, [
            'colors' => ['Bleu', 'Gris'],
        ]))
            ->assertCreated()
            ->assertJsonPath('data.colors', ['Bleu', 'Gris']);
    }

    public function test_r3_05_client_must_belong_to_shop(): void
    {
        [$adminA, $shopA] = $this->shopWithAdmin('Optique A', 'opticien.a@example.com');
        [, $shopB] = $this->shopWithAdmin('Optique B', 'opticien.b@example.com');
        $foreign = $this->seedClient($shopB, 'only.b@example.com');

        Sanctum::actingAs($adminA);
        $this->postJson('/api/v1/opticien/pairs', $this->payload($foreign->uuid))
            ->assertStatus(422);
        $this->assertSame(0, Pair::query()->where('origin_optician_id', $shopA->id)->count());
    }

    public function test_r3_06_engrave_is_irreversible(): void
    {
        [$admin, $shop] = $this->shopWithAdmin();
        $client = $this->seedClient($shop);
        Sanctum::actingAs($admin);
        $uuid = $this->postJson('/api/v1/opticien/pairs', $this->payload($client->uuid))
            ->assertCreated()
            ->json('data.uuid');

        $this->postJson('/api/v1/opticien/pairs/'.$uuid.'/engrave')
            ->assertOk()
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.events.0.type', 'engraved')
            ->assertJsonPath('data.events.0.label', 'Paire indiquée comme gravée')
            ->assertJsonPath('data.actions.can_engrave', false)
            ->assertJsonPath('data.actions.can_inactivate', true);

        $this->postJson('/api/v1/opticien/pairs/'.$uuid.'/engrave')->assertStatus(422);
        $this->assertSame(PairStatus::Active, Pair::query()->where('uuid', $uuid)->first()?->status);
    }

    public function test_r3_07_already_linked_code_is_rejected(): void
    {
        [$admin, $shop] = $this->shopWithAdmin();
        $client = $this->seedClient($shop);
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/opticien/pairs', $this->payload($client->uuid, [
            'already_engraved' => true,
            'assigned_code' => 'FR5487OK',
        ]))->assertCreated()->assertJsonPath('data.status', 'active');

        $this->postJson('/api/v1/opticien/pairs', $this->payload($client->uuid, [
            'already_engraved' => true,
            'assigned_code' => 'fr5487ok',
        ]))
            ->assertStatus(422)
            ->assertJsonPath('errors.0.field', 'assigned_code');

        $this->assertSame(1, Pair::query()->where('assigned_code', 'FR5487OK')->count());
    }

    public function test_r3_08_inactive_cannot_be_lost_or_found(): void
    {
        [$admin, $shop] = $this->shopWithAdmin();
        $client = $this->seedClient($shop);
        Sanctum::actingAs($admin);
        $toEngrave = $this->postJson('/api/v1/opticien/pairs', $this->payload($client->uuid))
            ->json('data.uuid');
        $this->postJson('/api/v1/opticien/pairs/'.$toEngrave.'/inactivate')->assertStatus(422);

        $uuid = $this->postJson('/api/v1/opticien/pairs', $this->payload($client->uuid, [
            'already_engraved' => true,
            'assigned_code' => 'FR2222BB',
        ]))->json('data.uuid');

        $this->postJson('/api/v1/opticien/pairs/'.$uuid.'/inactivate')
            ->assertOk()
            ->assertJsonPath('data.status', 'inactive')
            ->assertJsonPath('data.events.0.label', 'Paire déclarée comme inactive')
            ->assertJsonPath('data.actions.can_inactivate', false);

        $pair = Pair::query()->where('uuid', $uuid)->first();
        $this->assertFalse($pair->status->allowsLostOrFound());
        $this->postJson('/api/v1/opticien/pairs/'.$uuid.'/engrave')->assertStatus(422);
    }

    public function test_r3_09_archived_code_is_never_reused(): void
    {
        [$admin, $shop] = $this->shopWithAdmin();
        $client = $this->seedClient($shop);
        Sanctum::actingAs($admin);
        $created = $this->postJson('/api/v1/opticien/pairs', $this->payload($client->uuid, [
            'already_engraved' => true,
            'assigned_code' => 'FR3333CC',
        ]))->assertCreated();
        $uuid = $created->json('data.uuid');

        $this->deleteJson('/api/v1/opticien/pairs/'.$uuid)->assertOk();
        $this->getJson('/api/v1/opticien/pairs/'.$uuid)->assertNotFound();
        $this->assertSame(PairStatus::Archivee, Pair::query()->where('uuid', $uuid)->first()?->status);
        $this->assertSame('FR3333CC', Pair::query()->where('uuid', $uuid)->value('assigned_code'));

        $this->postJson('/api/v1/opticien/pairs', $this->payload($client->uuid, [
            'already_engraved' => true,
            'assigned_code' => 'FR3333CC',
        ]))->assertStatus(422);
    }

    public function test_r3_10_and_r3_11_title_and_newest_event_first(): void
    {
        [$admin, $shop] = $this->shopWithAdmin();
        $client = $this->seedClient($shop);
        Sanctum::actingAs($admin);
        $uuid = $this->postJson('/api/v1/opticien/pairs', $this->payload($client->uuid, [
            'type' => 'Soleil',
            'brand' => 'Ray-Ban',
        ]))->json('data.uuid');

        $this->postJson('/api/v1/opticien/pairs/'.$uuid.'/engrave')->assertOk();

        $this->getJson('/api/v1/opticien/pairs/'.$uuid)
            ->assertOk()
            ->assertJsonPath('data.title', 'Lunettes Soleil - Ray-Ban')
            ->assertJsonPath('data.events.0.type', 'engraved')
            ->assertJsonPath('data.events.1.type', 'registered');
    }

    public function test_list_is_isolated_and_hides_archived(): void
    {
        [$adminA, $shopA] = $this->shopWithAdmin('Optique A', 'opticien.a@example.com');
        [$adminB, $shopB] = $this->shopWithAdmin('Optique B', 'opticien.b@example.com');
        $clientA = $this->seedClient($shopA, 'a@example.com');
        $clientB = $this->seedClient($shopB, 'b@example.com');

        Sanctum::actingAs($adminA);
        $uuidA = $this->postJson('/api/v1/opticien/pairs', $this->payload($clientA->uuid))->json('data.uuid');
        Sanctum::actingAs($adminB);
        $uuidB = $this->postJson('/api/v1/opticien/pairs', $this->payload($clientB->uuid))->json('data.uuid');

        Sanctum::actingAs($adminA);
        $list = $this->getJson('/api/v1/opticien/pairs')->assertOk()->json('data');
        $this->assertCount(1, $list);
        $this->assertSame($uuidA, $list[0]['uuid']);
        $this->getJson('/api/v1/opticien/pairs/'.$uuidB)->assertNotFound();
        $this->postJson('/api/v1/opticien/pairs/'.$uuidB.'/engrave')->assertNotFound();
        $this->deleteJson('/api/v1/opticien/pairs/'.$uuidB)->assertNotFound();
    }

    public function test_catalog_exposes_figma_types(): void
    {
        [$admin] = $this->shopWithAdmin();
        Sanctum::actingAs($admin);
        $this->getJson('/api/v1/opticien/catalogs/pairs')
            ->assertOk()
            ->assertJsonPath('data.types', ['Vue', 'Soleil', 'Solaire de Vue']);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function payload(string $clientUuid, array $overrides = []): array
    {
        return array_merge([
            'client_uuid' => $clientUuid,
            'type' => 'Vue',
            'brand' => 'Gucci',
            'colors' => ['Noir'],
            'description' => 'Monture titane',
            'already_engraved' => false,
        ], $overrides);
    }

    /**
     * @return array{0: User, 1: Optician}
     */
    private function shopWithAdmin(string $name = 'Optique A', string $email = 'opticien.a@example.com'): array
    {
        $admin = User::factory()->opticienAdmin()->create(['email' => $email]);
        $shop = Optician::query()->create(['name' => $name]);
        $shop->users()->attach($admin->id);

        return [$admin->fresh(), $shop];
    }

    private function seedClient(Optician $shop, string $email = 'client.c1@example.com'): Client
    {
        $user = User::factory()->create([
            'email' => $email,
            'role' => Role::Client,
        ]);
        $client = Client::query()->create([
            'user_id' => $user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'email' => $email,
            'phone' => '0612345678',
        ]);
        $shop->clients()->attach($client->id);

        return $client;
    }
}
