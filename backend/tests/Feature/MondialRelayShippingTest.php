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

class MondialRelayShippingTest extends TestCase
{
    use RefreshDatabase;

    private FakeStripeGateway $stripe;

    protected function setUp(): void
    {
        parent::setUp();
        $this->stripe = new FakeStripeGateway;
        $this->app->instance(StripeGateway::class, $this->stripe);

        config([
            'services.mondial_relay.api1.url' => 'https://api.mondialrelay.test/WebService.asmx',
            'services.mondial_relay.api1.enseigne' => 'TTMRSDBX',
            'services.mondial_relay.api1.private_key' => '9ytnxVCC',
            'shipping.carrier_home' => 'Colissimo',
            'shipping.carrier_relay' => 'Mondial Relay',
        ]);
    }

    public function test_quote_returns_empty_relays_without_postal_code(): void
    {
        [$owner, $pair] = $this->foundPairAtB();
        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/client/pairs/'.$pair->uuid.'/shipping')
            ->assertOk()
            ->assertJsonPath('data.carrier', 'Colissimo')
            ->assertJsonPath('data.carriers.relay', 'Mondial Relay')
            ->assertJsonPath('data.relays', [])
            ->assertJsonPath('data.maps.provider', 'maplibre');

        Http::assertNothingSent();
    }

    public function test_quote_searches_sandbox_points_by_postal_code(): void
    {
        Http::fake([
            'api.mondialrelay.test/*' => Http::response($this->soapSearchResponse(), 200),
        ]);

        [$owner, $pair] = $this->foundPairAtB();
        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/client/pairs/'.$pair->uuid.'/shipping?q=17%20av.%20parmentier%2075001%20Paris')
            ->assertOk()
            ->assertJsonPath('data.carriers.relay', 'Mondial Relay')
            ->assertJsonPath('data.postal_code', '75001')
            ->assertJsonPath('data.relays.0.id', '007201')
            ->assertJsonPath('data.relays.0.name', 'PARIS 1 FRANPRIX')
            ->assertJsonPath('data.relays.0.postal_code', '75001')
            ->assertJsonPath('data.relays.0.city', 'PARIS')
            ->assertJsonPath('data.relays.0.lat', 48.866201)
            ->assertJsonPath('data.relays.0.lng', 2.331757);

        Http::assertSentCount(1);
    }

    public function test_relay_checkout_resolves_point_via_api(): void
    {
        Http::fake([
            'api.mondialrelay.test/*' => Http::response($this->soapSearchResponse(), 200),
        ]);

        [$owner, $pair] = $this->foundPairAtB();
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/client/pairs/'.$pair->uuid.'/shipments', [
            'mode' => 'relay',
            'consent_address' => true,
            'recipient_first_name' => 'Camille',
            'recipient_last_name' => 'Leroy',
            'relay_id' => '007201',
        ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending_payment')
            ->assertJsonPath('data.mode', 'relay')
            ->assertJsonPath('data.carrier', config('shipping.carrier_relay', 'Mondial Relay'));

        $this->assertDatabaseHas('shipments', [
            'pair_id' => $pair->id,
            'mode' => 'relay',
            'relay_id' => '007201',
            'relay_name' => 'PARIS 1 FRANPRIX',
            'postal_code' => '75001',
            'city' => 'PARIS',
            'address_line' => '20 PLACE DU MARCHE SAINT-HONORE',
        ]);
    }

    public function test_relay_checkout_rejects_unknown_point(): void
    {
        Http::fake([
            'api.mondialrelay.test/*' => Http::response($this->soapEmptyResponse(), 200),
        ]);

        [$owner, $pair] = $this->foundPairAtB();
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/client/pairs/'.$pair->uuid.'/shipments', [
            'mode' => 'relay',
            'consent_address' => true,
            'recipient_first_name' => 'Camille',
            'recipient_last_name' => 'Leroy',
            'relay_id' => '999999',
        ])
            ->assertStatus(422)
            ->assertJsonPath('errors.0.field', 'relay_id');
    }

    public function test_paid_relay_shipment_downloads_api2_pdf_label(): void
    {
        config([
            'services.mondial_relay.api2.url' => 'https://connect-api-sandbox.mondialrelay.test/api/shipment',
            'services.mondial_relay.api2.login' => 'TTMRSDBX@business-api.mondialrelay.com',
            'services.mondial_relay.api2.password' => 'secret',
            'services.mondial_relay.api2.brand_id' => 'TTMRSDBX',
        ]);

        $pdf = "%PDF-1.4\n% fake mondial relay label\n";
        Http::fake([
            'api.mondialrelay.test/*' => Http::response($this->soapSearchResponse(), 200),
            'connect-api-sandbox.mondialrelay.test/*' => Http::response($this->api2LabelResponse(), 200),
            'labels.mondialrelay.test/*' => Http::response($pdf, 200, ['Content-Type' => 'application/pdf']),
        ]);

        [$owner, $pair] = $this->foundPairAtB();
        [, $shopB] = $this->shopWithAdmin('Optique B labels', 'admin.b.labels@example.com');
        $pair->depositary_optician_id = $shopB->id;
        $pair->save();
        $adminB = $shopB->users()->first();

        Sanctum::actingAs($owner);
        $this->postJson('/api/v1/client/pairs/'.$pair->uuid.'/shipments', [
            'mode' => 'relay',
            'consent_address' => true,
            'recipient_first_name' => 'Camille',
            'recipient_last_name' => 'Leroy',
            'relay_id' => '007201',
        ])->assertCreated();

        $shipment = Shipment::query()->where('pair_id', $pair->id)->latest('id')->first();
        $this->assertNotNull($shipment);
        $this->stripe->settle((string) $shipment->payment_ref, true);
        $this->postJson('/api/v1/client/pairs/'.$pair->uuid.'/shipments/pay', [
            'session_id' => $shipment->payment_ref,
        ])->assertOk();

        $this->assertDatabaseHas('shipments', [
            'pair_id' => $pair->id,
            'carrier_shipment_number' => '96408887',
            'label_url' => 'https://labels.mondialrelay.test/etiquette.pdf',
        ]);

        Sanctum::actingAs($adminB);
        $file = $this->getJson('/api/v1/opticien/restitutions/'.$pair->uuid.'/label')->assertOk();
        $this->assertSame('etiquette-FR5487MR.pdf', $file->json('data.filename'));
        $this->assertSame('base64', $file->json('data.encoding'));
        $this->assertSame('application/pdf', $file->json('data.mime'));
        $this->assertSame(base64_encode($pdf), $file->json('data.content'));
    }

    /**
     * @return array{0: User, 1: Pair}
     */
    private function foundPairAtB(): array
    {
        [$adminA, $shopA] = $this->shopWithAdmin('Optique A', 'admin.a.mr@example.com');
        [$adminB, $shopB] = $this->shopWithAdmin('Optique B', 'admin.b.mr@example.com');
        unset($adminA, $adminB);

        $owner = User::factory()->create([
            'email' => 'client.mr@example.com',
            'first_name' => 'Camille',
            'last_name' => 'Leroy',
            'role' => Role::Client,
        ]);
        $client = Client::query()->create([
            'user_id' => $owner->id,
            'first_name' => 'Camille',
            'last_name' => 'Leroy',
            'email' => 'client.mr@example.com',
            'phone' => '0601020304',
            'consent_email' => true,
            'consent_sms' => true,
        ]);
        $shopA->clients()->attach($client->id);

        $pair = new Pair;
        $pair->forceFill([
            'client_id' => $client->id,
            'origin_optician_id' => $shopA->id,
            'depositary_optician_id' => $shopB->id,
            'assigned_code' => 'FR5487MR',
            'status' => PairStatus::ARecuperer,
            'type' => 'Vue',
            'brand' => 'Ray-Ban',
            'colors' => ['Noir'],
            'registered_at' => now(),
            'found_at' => now(),
            'pickup_code' => 'ABCDEF',
        ])->save();

        return [$owner->fresh(), $pair];
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

    private function soapSearchResponse(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <WSI4_PointRelais_RechercheResponse xmlns="http://www.mondialrelay.fr/webservice/">
      <WSI4_PointRelais_RechercheResult>
        <STAT>0</STAT>
        <PointsRelais>
          <PointRelais_Details>
            <Num>007201</Num>
            <LgAdr1>PARIS 1 FRANPRIX</LgAdr1>
            <LgAdr3>20 PLACE DU MARCHE SAINT-HONORE</LgAdr3>
            <CP>75001</CP>
            <Ville>PARIS</Ville>
            <Pays>FR</Pays>
            <Latitude>48,8662010</Latitude>
            <Longitude>02,3317570</Longitude>
          </PointRelais_Details>
        </PointsRelais>
      </WSI4_PointRelais_RechercheResult>
    </WSI4_PointRelais_RechercheResponse>
  </soap:Body>
</soap:Envelope>
XML;
    }

    private function soapEmptyResponse(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    <WSI4_PointRelais_RechercheResponse xmlns="http://www.mondialrelay.fr/webservice/">
      <WSI4_PointRelais_RechercheResult>
        <STAT>0</STAT>
        <PointsRelais />
      </WSI4_PointRelais_RechercheResult>
    </WSI4_PointRelais_RechercheResponse>
  </soap:Body>
</soap:Envelope>
XML;
    }

    private function api2LabelResponse(): string
    {
        return <<<'XML'
<?xml version="1.0" encoding="utf-8"?>
<ShipmentCreationResponse xmlns="http://www.example.org/Response">
  <StatusList>
    <Status Code="0" Level="Success" Message="OK" />
  </StatusList>
  <ShipmentsList>
    <Shipment>
      <ShipmentNumber>96408887</ShipmentNumber>
      <LabelList>
        <Label>
          <Output>https://labels.mondialrelay.test/etiquette.pdf</Output>
        </Label>
      </LabelList>
    </Shipment>
  </ShipmentsList>
</ShipmentCreationResponse>
XML;
    }
}
