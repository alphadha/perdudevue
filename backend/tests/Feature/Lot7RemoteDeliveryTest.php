<?php

namespace Tests\Feature;

use App\Enums\PairStatus;
use App\Enums\Role;
use App\Mail\ShipmentShippedMail;
use App\Models\Client;
use App\Models\Optician;
use App\Models\Pair;
use App\Models\Shipment;
use App\Models\User;
use App\Services\ShopInboxService;
use App\Services\StripeGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\Support\FakeStripeGateway;
use Tests\TestCase;

class Lot7RemoteDeliveryTest extends TestCase
{
    use RefreshDatabase;

    private FakeStripeGateway $stripe;

    protected function setUp(): void
    {
        parent::setUp();
        $this->stripe = new FakeStripeGateway;
        $this->app->instance(StripeGateway::class, $this->stripe);
    }

    public function test_shipping_requires_auth(): void
    {
        $this->getJson('/api/v1/client/pairs/not-a-uuid/shipping')->assertUnauthorized();
        $this->postJson('/api/v1/opticien/labels', ['uuids' => []])->assertUnauthorized();
    }

    public function test_r7_01_status_stays_a_recuperer_until_payment_ok(): void
    {
        Mail::fake();
        [$owner, $pair, $adminB] = $this->foundPairAtB();
        Sanctum::actingAs($owner);
        $checkout = $this->postJson('/api/v1/client/pairs/'.$pair->uuid.'/shipments', $this->homePayload())
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending_payment');
        $this->assertNotEmpty($checkout->json('data.checkout_url'));
        $this->assertSame(PairStatus::ARecuperer, $pair->fresh()->status);

        $this->payOnStripe($pair->uuid)->assertOk()->assertJsonPath('data.status', 'livraison_demandee');
        $this->assertSame(PairStatus::LivraisonDemandee, $pair->fresh()->status);
        $this->assertArrayNotHasKey('eta', $this->getJson('/api/v1/client/pairs/'.$pair->uuid)->json('data.shipment') ?? []);
        $this->assertArrayNotHasKey('eta_at', $this->getJson('/api/v1/client/pairs/'.$pair->uuid)->json('data.shipment') ?? []);

        Sanctum::actingAs($adminB);
        $this->assertNotNull($adminB);
    }

    public function test_r7_02_address_consent_is_required(): void
    {
        [$owner, $pair] = $this->foundPairAtB();
        Sanctum::actingAs($owner);
        $payload = $this->homePayload();
        $payload['consent_address'] = false;
        $this->postJson('/api/v1/client/pairs/'.$pair->uuid.'/shipments', $payload)
            ->assertStatus(422)
            ->assertJsonPath('errors.0.field', 'consent_address');
        $this->assertSame(PairStatus::ARecuperer, $pair->fresh()->status);
        $this->assertDatabaseCount('shipments', 0);
    }

    public function test_r7_03_depositary_label_has_name_and_address_only(): void
    {
        Mail::fake();
        [$owner, $pair, $adminB, $adminA] = $this->foundPairAtB();
        Sanctum::actingAs($owner);
        $this->postJson('/api/v1/client/pairs/'.$pair->uuid.'/shipments', $this->homePayload())->assertCreated();
        $this->payOnStripe($pair->uuid)->assertOk();

        Sanctum::actingAs($adminB);
        $dossier = $this->getJson('/api/v1/opticien/restitutions')->assertOk();
        $label = $dossier->json('data.0.shipment.label');
        $this->assertSame('Camille Leroy', $label['recipient_name']);
        $this->assertSame('18 rue des Tests', $label['address_line']);
        $this->assertSame('31000', $label['postal_code']);
        $this->assertArrayNotHasKey('email', $label);
        $this->assertArrayNotHasKey('phone', $label);
        $dossier->assertJsonMissing(['email' => 'client.c1@example.com']);

        $inbox = $this->getJson('/api/v1/opticien/notifications')->assertOk();
        $types = collect($inbox->json('data'))->pluck('type')->all();
        $this->assertContains(ShopInboxService::TYPE_REMOTE_DELIVERY, $types);
        $this->assertContains(ShopInboxService::TYPE_SHIPPING_LABEL, $types);
        $inbox->assertJsonMissing(['email' => 'client.c1@example.com']);

        $file = $this->getJson('/api/v1/opticien/restitutions/'.$pair->uuid.'/label')->assertOk();
        $this->assertSame('plain', $file->json('data.encoding'));
        $this->assertStringContainsString('Camille Leroy', $file->json('data.content'));
        $this->assertStringNotContainsString('client.c1@example.com', $file->json('data.content'));

        Sanctum::actingAs($adminA);
        $this->getJson('/api/v1/opticien/restitutions/'.$pair->uuid.'/label')->assertNotFound();
        $this->postJson('/api/v1/opticien/labels', ['uuids' => [$pair->uuid]])->assertStatus(422);
    }

    public function test_r7_04_bulk_labels_only_accept_livraison_demandee(): void
    {
        Mail::fake();
        [$owner, $pair, $adminB, , $shopB, $client] = $this->foundPairAtB();
        $other = new Pair;
        $other->forceFill([
            'client_id' => $client->id,
            'origin_optician_id' => $pair->origin_optician_id,
            'depositary_optician_id' => $shopB->id,
            'assigned_code' => 'FR7202BB',
            'status' => PairStatus::ARecuperer,
            'type' => 'Vue',
            'brand' => 'Gucci',
            'colors' => ['Noir'],
            'registered_at' => now(),
            'found_at' => now(),
            'pickup_code' => 'GHIJKL',
        ])->save();
        Sanctum::actingAs($owner);
        $this->postJson('/api/v1/client/pairs/'.$pair->uuid.'/shipments', $this->homePayload())->assertCreated();
        $this->payOnStripe($pair->uuid)->assertOk();

        Sanctum::actingAs($adminB);
        $this->postJson('/api/v1/opticien/labels', ['uuids' => [$pair->uuid, $other->uuid]])
            ->assertStatus(422);
        $ok = $this->postJson('/api/v1/opticien/labels', ['uuids' => [$pair->uuid]])->assertOk();
        $this->assertCount(1, $ok->json('data'));
    }

    public function test_r7_05_mark_shipped_notifies_client(): void
    {
        Mail::fake();
        [$owner, $pair, $adminB] = $this->foundPairAtB();
        Sanctum::actingAs($owner);
        $this->postJson('/api/v1/client/pairs/'.$pair->uuid.'/shipments', $this->homePayload())->assertCreated();
        $this->payOnStripe($pair->uuid)->assertOk();

        Sanctum::actingAs($adminB);
        $this->postJson('/api/v1/opticien/restitutions/'.$pair->uuid.'/ship')
            ->assertOk()
            ->assertJsonPath('data.status', 'en_livraison');
        $this->assertSame(PairStatus::EnLivraison, $pair->fresh()->status);
        Mail::assertSent(ShipmentShippedMail::class, fn (ShipmentShippedMail $mail) => $mail->hasTo($owner->email));
        $this->assertDatabaseHas('notification_logs', [
            'type' => 'shipment_shipped',
            'status' => 'sent',
            'recipient' => $owner->email,
        ]);
        Sanctum::actingAs($owner);
        $this->getJson('/api/v1/client/pairs/'.$pair->uuid)
            ->assertOk()
            ->assertJsonPath('data.shipment.tracking_ref', $pair->fresh()->shipments()->latest('id')->first()?->tracking_ref);
        $this->assertNotEmpty($pair->fresh()->shipments()->latest('id')->first()?->tracking_ref);
    }

    public function test_r7_06_client_shipment_has_no_eta(): void
    {
        Mail::fake();
        [$owner, $pair] = $this->foundPairAtB();
        Sanctum::actingAs($owner);
        $this->postJson('/api/v1/client/pairs/'.$pair->uuid.'/shipments', $this->homePayload())->assertCreated();
        $paid = $this->payOnStripe($pair->uuid)->assertOk();
        $shipment = $paid->json('data.shipment');
        $this->assertIsArray($shipment);
        $this->assertArrayNotHasKey('eta', $shipment);
        $this->assertArrayNotHasKey('estimated_delivery_at', $shipment);
        $this->assertTrue($paid->json('data.actions.can_track_delivery'));
    }

    public function test_r7_07_stripe_failure_does_not_open_shipment_dossier(): void
    {
        Mail::fake();
        [$owner, $pair, $adminB] = $this->foundPairAtB();
        Sanctum::actingAs($owner);
        $this->postJson('/api/v1/client/pairs/'.$pair->uuid.'/shipments', $this->homePayload())->assertCreated();
        $this->payOnStripe($pair->uuid, false)->assertStatus(422);
        $this->assertSame(PairStatus::ARecuperer, $pair->fresh()->status);
        $this->assertDatabaseHas('shipments', ['status' => 'failed']);
        Sanctum::actingAs($adminB);
        $this->getJson('/api/v1/opticien/restitutions')->assertJsonPath('data.0.status', 'a_recuperer');
        $this->assertDatabaseMissing('shop_notifications', ['type' => ShopInboxService::TYPE_REMOTE_DELIVERY]);
        $this->assertDatabaseMissing('pair_events', ['type' => 'delivery_requested']);
    }

    public function test_idor_other_client_cannot_checkout(): void
    {
        [$owner, $pair] = $this->foundPairAtB();
        $stranger = User::factory()->create(['role' => Role::Client]);
        Client::query()->create([
            'user_id' => $stranger->id,
            'first_name' => 'Eve',
            'last_name' => 'Other',
            'email' => $stranger->email,
            'phone' => '0600000001',
            'consent_email' => true,
            'consent_sms' => true,
        ]);
        Sanctum::actingAs($stranger);
        $this->postJson('/api/v1/client/pairs/'.$pair->uuid.'/shipments', $this->homePayload())->assertNotFound();
        $this->assertSame($owner->email, $pair->client->email);
    }

    /**
     * @return array{0: User, 1: Pair, 2: User, 3: User, 4: Optician, 5: Client}
     */
    private function foundPairAtB(string $code = 'FR7201AA', string $email = 'client.c1@example.com'): array
    {
        [$adminA, $shopA] = $this->shopWithAdmin('Optique A', 'opticien.a-'.$code.'@example.com');
        [$adminB, $shopB] = $this->shopWithAdmin('Optique B', 'opticien.b-'.$code.'@example.com');
        $owner = User::factory()->create([
            'email' => $email,
            'first_name' => 'Camille',
            'last_name' => 'Leroy',
            'role' => Role::Client,
        ]);
        $client = Client::query()->create([
            'user_id' => $owner->id,
            'first_name' => 'Camille',
            'last_name' => 'Leroy',
            'email' => $email,
            'phone' => '0612345678',
            'consent_email' => true,
            'consent_sms' => true,
        ]);
        $shopA->clients()->attach($client->id);
        $pair = new Pair;
        $pair->forceFill([
            'client_id' => $client->id,
            'origin_optician_id' => $shopA->id,
            'depositary_optician_id' => $shopB->id,
            'assigned_code' => $code,
            'status' => PairStatus::ARecuperer,
            'type' => 'Vue',
            'brand' => 'Gucci',
            'colors' => ['Noir'],
            'registered_at' => now(),
            'found_at' => now(),
            'pickup_code' => 'ABCDEF',
        ])->save();

        return [$owner->fresh(), $pair, $adminB, $adminA, $shopB, $client];
    }

    /**
     * @return TestResponse
     */
    private function payOnStripe(string $pairUuid, bool $succeed = true)
    {
        $shipment = Shipment::query()
            ->where('status', 'pending_payment')
            ->latest('id')
            ->first();
        $this->assertNotNull($shipment);
        $this->stripe->settle((string) $shipment->payment_ref, $succeed);

        return $this->postJson('/api/v1/client/pairs/'.$pairUuid.'/shipments/pay', [
            'session_id' => $shipment->payment_ref,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function homePayload(): array
    {
        return [
            'mode' => 'home',
            'consent_address' => true,
            'recipient_first_name' => 'Camille',
            'recipient_last_name' => 'Leroy',
            'address_line' => '18 rue des Tests',
            'postal_code' => '31000',
            'city' => 'Toulouse',
        ];
    }

    /**
     * @return array{0: User, 1: Optician}
     */
    private function shopWithAdmin(string $name, string $email): array
    {
        $admin = User::factory()->opticienAdmin()->create(['email' => $email]);
        $shop = Optician::query()->create(['name' => $name, 'address' => '10 rue Test', 'city' => 'Paris', 'postal_code' => '75001']);
        $shop->users()->attach($admin->id);

        return [$admin->fresh(), $shop];
    }
}
