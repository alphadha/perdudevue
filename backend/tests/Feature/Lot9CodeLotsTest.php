<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Filament\Resources\CodeLots\Pages\ViewCodeLot;
use App\Models\Client;
use App\Models\CodeLotItem;
use App\Models\Optician;
use App\Models\User;
use App\Services\CodeLotService;
use App\Support\AssignedCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Livewire\Livewire;
use Tests\TestCase;

class Lot9CodeLotsTest extends TestCase
{
    use RefreshDatabase;

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

    public function test_r9_02_shop_associating_lot_code_consumes_it_and_never_recycles(): void
    {
        $lot = app(CodeLotService::class)->create('Lot graveur Lyon', 2);
        $first = $lot->items[0]->code;
        $second = $lot->items[1]->code;

        [$admin, $shop] = $this->shopWithAdmin();
        $client = $this->seedClient($shop);
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/opticien/pairs', $this->payload($client->uuid, [
            'already_engraved' => true,
            'assigned_code' => strtolower($first),
        ]))
            ->assertCreated()
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.assigned_code', $first);

        $this->assertDatabaseHas('code_lot_items', [
            'code' => $first,
            'status' => 'assigned',
        ]);

        $this->postJson('/api/v1/opticien/pairs', $this->payload($client->uuid, [
            'already_engraved' => true,
            'assigned_code' => $first,
        ]))
            ->assertStatus(422)
            ->assertJsonPath('errors.0.field', 'assigned_code');

        $this->postJson('/api/v1/opticien/pairs', $this->payload($client->uuid, [
            'already_engraved' => true,
            'assigned_code' => $second,
        ]))->assertCreated();

        $this->assertSame('consumed', $lot->fresh()->status);
        $this->assertSame(0, CodeLotItem::query()->where('code_lot_id', $lot->id)->where('status', 'available')->count());
    }

    public function test_r9_03_admin_can_view_lot_codes_opticien_cannot(): void
    {
        $pdv = User::factory()->admin()->create();
        $opticien = User::factory()->opticienAdmin()->create();
        $lot = app(CodeLotService::class)->create('Lot consultation', 2);
        $code = $lot->items->first()->code;

        $this->actingAs($pdv)->get('/admin/code-lots/'.$lot->getKey())
            ->assertOk()
            ->assertSee('Lot consultation');

        Livewire::actingAs($pdv)
            ->test(ViewCodeLot::class, ['record' => $lot->getKey()])
            ->assertSee($code);

        $this->actingAs($opticien)->get('/admin/code-lots/'.$lot->getKey())->assertForbidden();
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
            'already_engraved' => false,
        ], $overrides);
    }

    /**
     * @return array{0: User, 1: Optician}
     */
    private function shopWithAdmin(): array
    {
        $admin = User::factory()->opticienAdmin()->create(['email' => 'opticien.lot9@example.com']);
        $shop = Optician::query()->create(['name' => 'Optique Lot9']);
        $shop->users()->attach($admin->id);

        return [$admin->fresh(), $shop];
    }

    private function seedClient(Optician $shop): Client
    {
        $user = User::factory()->create([
            'email' => 'client.lot9@example.com',
            'role' => Role::Client,
        ]);
        $client = Client::query()->create([
            'user_id' => $user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'phone' => '0612345678',
        ]);
        $shop->clients()->attach($client->id);

        return $client;
    }
}
