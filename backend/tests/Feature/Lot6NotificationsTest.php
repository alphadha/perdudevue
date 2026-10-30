<?php

namespace Tests\Feature;

use App\Enums\PairStatus;
use App\Enums\Role;
use App\Mail\PairFoundMail;
use App\Models\Client;
use App\Models\Optician;
use App\Models\Pair;
use App\Models\ShopNotification;
use App\Models\User;
use App\Services\InvitationService;
use App\Services\NotificationService;
use App\Services\ShopInboxService;
use App\Support\SecureToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Lot6NotificationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_notifications_require_auth(): void
    {
        $this->getJson('/api/v1/opticien/notifications')->assertUnauthorized();
        $this->patchJson('/api/v1/opticien/notifications/read-all')->assertUnauthorized();
        $this->deleteJson('/api/v1/opticien/notifications')->assertUnauthorized();
    }

    public function test_r6_01_each_send_writes_a_notification_log(): void
    {
        Mail::fake();
        [$adminA, $shopA] = $this->shopWithAdmin();
        [$adminB] = $this->shopWithAdmin('Optique B', 'opticien.b@example.com');
        $client = $this->seedClient($shopA);
        $this->activePair($shopA, $client, 'FR6101AA');

        app(InvitationService::class)->issue($client->user);
        $this->assertDatabaseHas('notification_logs', [
            'type' => 'invitation',
            'channel' => 'email',
            'status' => 'sent',
            'recipient' => $client->email,
        ]);

        $this->postJson('/api/v1/auth/password/forgot', ['email' => $adminA->email])
            ->assertOk();
        $this->assertDatabaseHas('notification_logs', [
            'type' => 'password_otp',
            'channel' => 'email',
            'status' => 'sent',
            'recipient' => $adminA->email,
        ]);

        Sanctum::actingAs($adminB);
        $this->postJson('/api/v1/opticien/restitutions', ['assigned_code' => 'FR6101AA'])
            ->assertCreated();
        $this->assertDatabaseHas('notification_logs', [
            'type' => 'pair_found',
            'channel' => 'email',
            'status' => 'sent',
            'recipient' => $client->email,
        ]);

        $uuid = Pair::query()->where('assigned_code', 'FR6101AA')->value('uuid');
        $this->postJson('/api/v1/opticien/restitutions/'.$uuid.'/resend', ['channels' => ['sms']])
            ->assertOk();
        $this->assertDatabaseHas('notification_logs', [
            'type' => 'pair_found',
            'channel' => 'sms',
            'status' => 'sent',
            'recipient' => $client->phone,
        ]);
    }

    public function test_r6_02_provider_failure_is_logged_without_500(): void
    {
        app(NotificationService::class)->sendSms('0612345678', 'pair_found', function (): void {
            throw new \RuntimeException('sms provider down');
        });

        $this->assertDatabaseHas('notification_logs', [
            'channel' => 'sms',
            'recipient' => '0612345678',
            'type' => 'pair_found',
            'status' => 'error',
            'error' => 'provider_failure',
        ]);

        Mail::shouldReceive('to')->andThrow(new \RuntimeException('smtp down'));
        [$adminA, $shopA] = $this->shopWithAdmin();
        [$adminB] = $this->shopWithAdmin('Optique B', 'opticien.b@example.com');
        $client = $this->seedClient($shopA);
        $this->activePair($shopA, $client, 'FR6102BB');

        Sanctum::actingAs($adminB);
        $this->postJson('/api/v1/opticien/restitutions', ['assigned_code' => 'FR6102BB'])
            ->assertCreated();
        $this->assertDatabaseHas('notification_logs', [
            'type' => 'pair_found',
            'status' => 'error',
            'error' => 'provider_failure',
            'recipient' => $client->email,
        ]);
        $this->assertSame(PairStatus::ARecuperer, Pair::query()->where('assigned_code', 'FR6102BB')->first()?->status);
    }

    public function test_r6_03_restitution_email_link_matches_public_token(): void
    {
        Mail::fake();
        [, $shopA] = $this->shopWithAdmin();
        [$adminB] = $this->shopWithAdmin('Optique B', 'opticien.b@example.com');
        $client = $this->seedClient($shopA);
        $this->activePair($shopA, $client, 'FR6103CC');

        Sanctum::actingAs($adminB);
        $this->postJson('/api/v1/opticien/restitutions', ['assigned_code' => 'FR6103CC'])
            ->assertCreated();

        $token = '';
        Mail::assertSent(PairFoundMail::class, function (PairFoundMail $mail) use ($client, &$token) {
            $token = basename(parse_url($mail->publicUrl, PHP_URL_PATH) ?: '');

            return $mail->hasTo($client->email)
                && str_contains($mail->publicUrl, '/r/')
                && $token !== ''
                && $token !== 'r';
        });

        $this->assertDatabaseHas('public_restitution_tokens', [
            'token_hash' => SecureToken::hash($token),
        ]);
        $this->getJson('/api/v1/public/restitutions/'.$token)
            ->assertOk()
            ->assertJsonPath('data.pickup_code', Pair::query()->where('assigned_code', 'FR6103CC')->value('pickup_code'));
    }

    public function test_r6_04_found_creates_depositary_inbox_without_foreign_pii(): void
    {
        Mail::fake();
        [, $shopA] = $this->shopWithAdmin();
        [$adminB, $shopB] = $this->shopWithAdmin('Optique B', 'opticien.b@example.com');
        $client = $this->seedClient($shopA, 'client.c1@example.com', 'Camille', 'Leroy');
        $this->activePair($shopA, $client, 'FR6104DD');

        Sanctum::actingAs($adminB);
        $this->postJson('/api/v1/opticien/restitutions', ['assigned_code' => 'FR6104DD'])
            ->assertCreated();

        $list = $this->getJson('/api/v1/opticien/notifications')->assertOk();
        $list->assertJsonPath('data.0.title', 'Lunettes en attente de retrait');
        $list->assertJsonPath('data.0.type', ShopInboxService::TYPE_WAITING_PICKUP);
        $list->assertJsonPath('data.0.read', false);
        $list->assertJsonPath('meta.unread_count', 1);
        $list->assertJsonMissing(['email' => 'client.c1@example.com']);
        $this->assertStringNotContainsString('Camille', (string) $list->json('data.0.body'));
        $this->assertStringNotContainsString('Leroy', (string) $list->json('data.0.body'));
        $this->assertSame(
            'Une paire de lunettes est en attente de retrait dans votre magasin.',
            $list->json('data.0.body')
        );

        $this->assertDatabaseMissing('shop_notifications', ['type' => ShopInboxService::TYPE_SHIPPING_LABEL]);
        $this->assertDatabaseMissing('shop_notifications', ['type' => ShopInboxService::TYPE_REMOTE_DELIVERY]);
        $this->assertSame($shopB->id, ShopNotification::query()->value('optician_id'));
    }

    public function test_inbox_shows_owner_name_only_if_already_shop_client(): void
    {
        Mail::fake();
        [, $shopA] = $this->shopWithAdmin();
        [$adminB, $shopB] = $this->shopWithAdmin('Optique B', 'opticien.b@example.com');
        $client = $this->seedClient($shopA, 'client.c2@example.com', 'Chloé', 'Bernard');
        $shopB->clients()->attach($client->id);
        $this->activePair($shopA, $client, 'FR6105EE');

        Sanctum::actingAs($adminB);
        $this->postJson('/api/v1/opticien/restitutions', ['assigned_code' => 'FR6105EE'])
            ->assertCreated();

        $body = $this->getJson('/api/v1/opticien/notifications')->assertOk()->json('data.0.body');
        $this->assertStringContainsString('Chloé Bernard', $body);
        $this->assertStringContainsString('Lunettes Vue - Gucci', $body);
    }

    public function test_r6_05_inbox_is_tenant_scoped(): void
    {
        Mail::fake();
        [$adminA, $shopA] = $this->shopWithAdmin();
        [$adminB] = $this->shopWithAdmin('Optique B', 'opticien.b@example.com');
        $client = $this->seedClient($shopA);
        $this->activePair($shopA, $client, 'FR6106FF');

        Sanctum::actingAs($adminB);
        $this->postJson('/api/v1/opticien/restitutions', ['assigned_code' => 'FR6106FF'])->assertCreated();
        $uuid = $this->getJson('/api/v1/opticien/notifications')->json('data.0.uuid');

        Sanctum::actingAs($adminA);
        $this->getJson('/api/v1/opticien/notifications')->assertOk()->assertJsonPath('data', []);
        $this->patchJson('/api/v1/opticien/notifications/'.$uuid.'/read')->assertNotFound();
        $this->patchJson('/api/v1/opticien/notifications/read-all')->assertOk();
        $this->deleteJson('/api/v1/opticien/notifications')->assertOk();
        $this->assertDatabaseHas('shop_notifications', ['uuid' => $uuid, 'deleted_at' => null]);
    }

    public function test_r6_06_declaring_lost_does_not_notify_origin_shop(): void
    {
        [$adminA, $shopA] = $this->shopWithAdmin();
        $owner = User::factory()->create(['role' => Role::Client]);
        $client = Client::query()->create([
            'user_id' => $owner->id,
            'first_name' => $owner->first_name,
            'last_name' => $owner->last_name,
            'email' => $owner->email,
            'phone' => '0612345678',
            'consent_email' => true,
            'consent_sms' => true,
        ]);
        $shopA->clients()->attach($client->id);
        $pair = $this->activePair($shopA, $client, 'FR6107GG');

        Sanctum::actingAs($owner);
        $this->postJson('/api/v1/client/pairs/'.$pair->uuid.'/lost')->assertOk();

        $this->assertDatabaseCount('shop_notifications', 0);
        Sanctum::actingAs($adminA);
        $this->getJson('/api/v1/opticien/notifications')->assertOk()->assertJsonPath('data', []);
    }

    public function test_r6_07_mark_read_filters_and_delete_all_are_shop_scoped(): void
    {
        Mail::fake();
        [, $shopA] = $this->shopWithAdmin();
        [$adminB] = $this->shopWithAdmin('Optique B', 'opticien.b@example.com');
        $client = $this->seedClient($shopA);
        $this->activePair($shopA, $client, 'FR6108HH');
        $this->activePair($shopA, $client, 'FR6109II');

        Sanctum::actingAs($adminB);
        $this->postJson('/api/v1/opticien/restitutions', ['assigned_code' => 'FR6108HH'])->assertCreated();
        $this->postJson('/api/v1/opticien/restitutions', ['assigned_code' => 'FR6109II'])->assertCreated();

        $firstUuid = $this->getJson('/api/v1/opticien/notifications')->json('data.1.uuid');
        $this->patchJson('/api/v1/opticien/notifications/'.$firstUuid.'/read')
            ->assertOk()
            ->assertJsonPath('data.read', true);

        $this->getJson('/api/v1/opticien/notifications?filter=unread')
            ->assertOk()
            ->assertJsonPath('meta.unread_count', 1);
        $this->assertCount(1, $this->getJson('/api/v1/opticien/notifications?filter=unread')->json('data'));
        $this->assertCount(1, $this->getJson('/api/v1/opticien/notifications?filter=read')->json('data'));

        $this->patchJson('/api/v1/opticien/notifications/read-all')->assertOk();
        $this->getJson('/api/v1/opticien/notifications')
            ->assertOk()
            ->assertJsonPath('meta.unread_count', 0);

        $this->deleteJson('/api/v1/opticien/notifications')->assertOk();
        $this->getJson('/api/v1/opticien/notifications')->assertOk()->assertJsonPath('data', []);
        $this->assertSoftDeleted('shop_notifications', ['uuid' => $firstUuid]);
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
