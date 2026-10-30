<?php

namespace Tests\Feature;

use App\Enums\PairStatus;
use App\Enums\Role;
use App\Models\Client;
use App\Models\Optician;
use App\Models\Pair;
use App\Models\Shipment;
use App\Models\User;
use App\Services\StripeGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\Support\FakeStripeGateway;
use Tests\TestCase;

class ColissimoShippingTest extends TestCase
{
    use RefreshDatabase;

    private FakeStripeGateway $stripe;

    protected function setUp(): void
    {
        parent::setUp();
        $this->stripe = new FakeStripeGateway;
        $this->app->instance(StripeGateway::class, $this->stripe);

        config([
            'services.colissimo.mode' => 'test',
            'services.colissimo.test_api_key' => 'test-colissimo-api-key',
            'services.colissimo.test_contract_number' => '',
            'services.colissimo.test_password' => '',
            'services.colissimo.test_api_url' => 'https://ws.colissimo.test/sls-ws/SlsServiceWSRest/2.0',
            'shipping.carrier_home' => 'Colissimo',
            'shipping.carrier_relay' => 'Mondial Relay',
        ]);
    }

    public function test_quote_exposes_home_and_relay_carriers(): void
    {
        [$owner, $pair] = $this->foundPairAtB();
        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/client/pairs/'.$pair->uuid.'/shipping')
            ->assertOk()
            ->assertJsonPath('data.carriers.home', 'Colissimo')
            ->assertJsonPath('data.carriers.relay', 'Mondial Relay')
            ->assertJsonPath('data.carrier', 'Colissimo');
    }

    public function test_home_checkout_uses_colissimo_carrier(): void
    {
        [$owner, $pair] = $this->foundPairAtB();
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/client/pairs/'.$pair->uuid.'/shipments', [
            'mode' => 'home',
            'consent_address' => true,
            'recipient_first_name' => 'Camille',
            'recipient_last_name' => 'Leroy',
            'address_line' => '18 rue des Tests',
            'postal_code' => '31000',
            'city' => 'Toulouse',
        ])
            ->assertCreated()
            ->assertJsonPath('data.carrier', 'Colissimo')
            ->assertJsonPath('data.mode', 'home');
    }

    public function test_paid_home_shipment_downloads_colissimo_pdf_label(): void
    {
        $pdf = "%PDF-1.4\nfake-colissimo-label\n%%EOF";
        $multipart = "--uuid:fake-boundary\r\n"
            ."Content-Type: application/json\r\n\r\n"
            .'{"messages":[{"id":"0","type":"INFOS","messageContent":"OK"}],'
            .'"labelV2Response":{"parcelNumber":"6A12345678901"}}'
            ."\r\n--uuid:fake-boundary\r\n"
            ."Content-Type: application/pdf\r\n\r\n"
            .$pdf
            ."\r\n--uuid:fake-boundary--";

        Http::fake([
            'ws.colissimo.test/*' => Http::response($multipart, 200, [
                'Content-Type' => 'multipart/related; boundary="uuid:fake-boundary"',
            ]),
        ]);

        [$owner, $pair, $adminB] = $this->foundPairAtB();

        Sanctum::actingAs($owner);
        $this->postJson('/api/v1/client/pairs/'.$pair->uuid.'/shipments', [
            'mode' => 'home',
            'consent_address' => true,
            'recipient_first_name' => 'Camille',
            'recipient_last_name' => 'Leroy',
            'address_line' => '18 rue des Tests',
            'postal_code' => '31000',
            'city' => 'Toulouse',
        ])->assertCreated();

        $shipment = Shipment::query()->where('pair_id', $pair->id)->latest('id')->first();
        $this->assertNotNull($shipment);
        $this->stripe->settle((string) $shipment->payment_ref, true);
        $this->postJson('/api/v1/client/pairs/'.$pair->uuid.'/shipments/pay', [
            'session_id' => $shipment->payment_ref,
        ])->assertOk();

        $this->assertDatabaseHas('shipments', [
            'pair_id' => $pair->id,
            'carrier' => 'Colissimo',
            'carrier_shipment_number' => '6A12345678901',
        ]);
        $this->assertNotNull($shipment->fresh()?->label_pdf);

        Http::assertSent(function ($request) {
            return str_contains($request->url(), '/generateLabel')
                && $request->hasHeader('apiKey', 'test-colissimo-api-key')
                && ! array_key_exists('contractNumber', $request->data())
                && ! array_key_exists('password', $request->data());
        });

        Sanctum::actingAs($adminB);
        $file = $this->getJson('/api/v1/opticien/restitutions/'.$pair->uuid.'/label')->assertOk();
        $this->assertSame('etiquette-FR5487CO.pdf', $file->json('data.filename'));
        $this->assertSame('base64', $file->json('data.encoding'));
        $this->assertSame('application/pdf', $file->json('data.mime'));
        $this->assertSame(base64_encode($pdf), $file->json('data.content'));
    }

    public function test_missing_credentials_keeps_text_label_fallback(): void
    {
        config([
            'services.colissimo.test_api_key' => '',
            'services.colissimo.test_contract_number' => '',
            'services.colissimo.test_password' => '',
        ]);

        [$owner, $pair, $adminB] = $this->foundPairAtB('FR5487TX', 'client.colissimo.fallback@example.com');

        Sanctum::actingAs($owner);
        $this->postJson('/api/v1/client/pairs/'.$pair->uuid.'/shipments', [
            'mode' => 'home',
            'consent_address' => true,
            'recipient_first_name' => 'Camille',
            'recipient_last_name' => 'Leroy',
            'address_line' => '18 rue des Tests',
            'postal_code' => '31000',
            'city' => 'Toulouse',
        ])->assertCreated();

        $shipment = Shipment::query()->where('pair_id', $pair->id)->latest('id')->first();
        $this->assertNotNull($shipment);
        $this->stripe->settle((string) $shipment->payment_ref, true);
        $this->postJson('/api/v1/client/pairs/'.$pair->uuid.'/shipments/pay', [
            'session_id' => $shipment->payment_ref,
        ])->assertOk();

        Sanctum::actingAs($adminB);
        $file = $this->getJson('/api/v1/opticien/restitutions/'.$pair->uuid.'/label')->assertOk();
        $this->assertSame('plain', $file->json('data.encoding'));
        $this->assertStringContainsString('Camille Leroy', $file->json('data.content'));
        Http::assertNothingSent();
    }

    /**
     * @return array{0: User, 1: Pair, 2: User}
     */
    private function foundPairAtB(string $code = 'FR5487CO', string $email = 'client.colissimo@example.com'): array
    {
        [$adminA, $shopA] = $this->shopWithAdmin('Optique A Colissimo', 'opticien.a.'.$code.'@example.com');
        [$adminB, $shopB] = $this->shopWithAdmin('Optique B Colissimo', 'opticien.b.'.$code.'@example.com');
        unset($adminA);

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
            'brand' => 'Ray-Ban',
            'colors' => ['Noir'],
            'registered_at' => now(),
            'found_at' => now(),
            'pickup_code' => 'ABCDEF',
        ])->save();

        return [$owner->fresh(), $pair, $adminB->fresh()];
    }

    /**
     * @return array{0: User, 1: Optician}
     */
    private function shopWithAdmin(string $name, string $email): array
    {
        $admin = User::factory()->opticienAdmin()->create(['email' => $email]);
        $shop = Optician::query()->create([
            'name' => $name,
            'address' => '15 rue du Taur',
            'city' => 'Toulouse',
            'postal_code' => '31000',
            'phone' => '0561000002',
        ]);
        $shop->users()->attach($admin->id);

        return [$admin->fresh(), $shop];
    }
}
