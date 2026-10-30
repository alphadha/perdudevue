<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Mail\IdentityOtpMail;
use App\Mail\InvitationMail;
use App\Models\Client;
use App\Models\Optician;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Lot2ClientsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_clients_require_auth(): void
    {
        $this->getJson('/api/v1/opticien/clients')->assertUnauthorized();
        $this->postJson('/api/v1/opticien/clients', [])->assertUnauthorized();
    }

    public function test_r2_01_create_client_sends_welcome_invitation(): void
    {
        Mail::fake();
        $admin = $this->shopAdmin();

        Sanctum::actingAs($admin);
        $response = $this->postJson('/api/v1/opticien/clients', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.email', 'nouveau.c1@example.com')
            ->assertJsonPath('data.consent_email', true)
            ->assertJsonPath('data.consent_sms', false)
            ->assertJsonPath('data.account_pending', true);

        Mail::assertSent(InvitationMail::class);
        $this->assertSame(1, Client::query()->count());
        $this->assertDatabaseHas('notification_logs', [
            'type' => 'invitation',
            'recipient' => 'nouveau.c1@example.com',
            'status' => 'sent',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'client.created',
            'user_id' => $admin->id,
        ]);

        $uuid = $response->json('data.uuid');
        $this->getJson('/api/v1/opticien/clients/'.$uuid)
            ->assertOk()
            ->assertJsonPath('data.first_name', 'Camille');
    }

    public function test_r2_02_consents_are_independent(): void
    {
        Mail::fake();
        Sanctum::actingAs($this->shopAdmin());

        $this->postJson('/api/v1/opticien/clients', $this->payload([
            'consent_email' => false,
            'consent_sms' => true,
        ]))
            ->assertCreated()
            ->assertJsonPath('data.consent_email', false)
            ->assertJsonPath('data.consent_sms', true);

        $client = Client::query()->first();
        $this->assertFalse($client->consent_email);
        $this->assertTrue($client->consent_sms);
    }

    public function test_r2_03_duplicate_email_confirm_attaches_without_second_account(): void
    {
        Mail::fake();
        [$adminA, $shopA] = $this->shopWithAdmin('Optique A', 'opticien.a@example.com');
        [$adminB] = $this->shopWithAdmin('Optique B', 'opticien.b@example.com');
        $client = $this->seedClient($shopA, 'Camille', 'Leroy', 'client.c1@example.com', '0612345678');

        Sanctum::actingAs($adminB);
        $conflict = $this->postJson('/api/v1/opticien/clients', $this->payload([
            'email' => 'client.c1@example.com',
            'phone' => '0699999999',
        ]))
            ->assertStatus(409)
            ->assertJsonPath('errors.0.code', 'client_duplicate')
            ->assertJsonPath('data.client.uuid', $client->uuid);

        $token = $conflict->json('data.action_token');
        $this->postJson('/api/v1/opticien/clients/duplicates/'.$token.'/confirm')
            ->assertOk()
            ->assertJsonPath('data.uuid', $client->uuid);

        $this->assertSame(1, Client::query()->count());
        $this->assertTrue($client->fresh()->opticians()->where('opticians.id', $adminB->primaryOptician()->id)->exists());
        $this->assertTrue($client->fresh()->opticians()->where('opticians.id', $shopA->id)->exists());
    }

    public function test_r2_04_duplicate_update_requires_otp_then_applies(): void
    {
        Mail::fake();
        [$adminA, $shopA] = $this->shopWithAdmin('Optique A', 'opticien.a@example.com');
        [$adminB] = $this->shopWithAdmin('Optique B', 'opticien.b@example.com');
        $client = $this->seedClient($shopA, 'Camille', 'Leroy', 'client.c1@example.com', '0612345678');

        Sanctum::actingAs($adminB);
        $token = $this->postJson('/api/v1/opticien/clients', $this->payload([
            'email' => 'client.c1@example.com',
            'first_name' => 'Camille',
            'last_name' => 'Leroy',
        ]))->assertStatus(409)->json('data.action_token');

        $challenge = $this->postJson('/api/v1/opticien/clients/duplicates/'.$token.'/update', $this->payload([
            'email' => 'camille.maj@example.com',
            'phone' => '0612345678',
            'first_name' => 'Camille',
            'last_name' => 'Leroy',
        ]))
            ->assertStatus(202)
            ->assertJsonPath('data.otp_required', true)
            ->assertJsonPath('data.otp_channel', 'email');

        $this->assertSame('client.c1@example.com', $client->fresh()->email);

        $code = null;
        Mail::assertSent(IdentityOtpMail::class, function (IdentityOtpMail $mail) use (&$code): bool {
            $code = $mail->code;

            return $mail->channel === 'email';
        });

        $this->postJson('/api/v1/opticien/clients/identity/'.$challenge->json('data.action_token').'/otp', [
            'code' => $code,
        ])
            ->assertOk()
            ->assertJsonPath('data.email', 'camille.maj@example.com');

        $this->assertSame(1, Client::query()->count());
        $this->assertSame('camille.maj@example.com', $client->fresh()->email);
    }

    public function test_r2_05_duplicate_cancel_leaves_form_data_and_account_untouched(): void
    {
        Mail::fake();
        [$admin, $shop] = $this->shopWithAdmin();
        $client = $this->seedClient($shop, 'Camille', 'Leroy', 'client.c1@example.com', '0612345678');

        Sanctum::actingAs($admin);
        $this->postJson('/api/v1/opticien/clients', $this->payload([
            'email' => 'client.c1@example.com',
            'first_name' => 'Autre',
        ]))->assertStatus(409);

        $this->assertSame('Camille', $client->fresh()->first_name);
        $this->assertSame(1, Client::query()->count());
    }

    public function test_r2_06_list_is_isolated_by_shop(): void
    {
        Mail::fake();
        [$adminA, $shopA] = $this->shopWithAdmin('Optique A', 'opticien.a@example.com');
        [$adminB, $shopB] = $this->shopWithAdmin('Optique B', 'opticien.b@example.com');
        $onlyB = $this->seedClient($shopB, 'Hugo', 'Seul', 'only.b@example.com', '0610000002');
        $shared = $this->seedClient($shopA, 'Chloé', 'Bernard', 'client.c2@example.com', '0610000003');
        $shopB->clients()->attach($shared->id);

        Sanctum::actingAs($adminA);
        $list = $this->getJson('/api/v1/opticien/clients')->assertOk()->json('data');
        $emails = collect($list)->pluck('email')->all();
        $this->assertContains('client.c2@example.com', $emails);
        $this->assertNotContains('only.b@example.com', $emails);

        Sanctum::actingAs($adminB);
        $this->getJson('/api/v1/opticien/clients/'.$onlyB->uuid)->assertOk();
        Sanctum::actingAs($adminA);
        $this->getJson('/api/v1/opticien/clients/'.$onlyB->uuid)->assertNotFound();
        $this->patchJson('/api/v1/opticien/clients/'.$onlyB->uuid, $this->payload([
            'email' => 'only.b@example.com',
        ]))->assertNotFound();
        $this->deleteJson('/api/v1/opticien/clients/'.$onlyB->uuid)->assertNotFound();
    }

    public function test_r2_07_unlink_at_a_keeps_client_at_b(): void
    {
        [$adminA, $shopA] = $this->shopWithAdmin('Optique A', 'opticien.a@example.com');
        [$adminB, $shopB] = $this->shopWithAdmin('Optique B', 'opticien.b@example.com');
        $client = $this->seedClient($shopA, 'Camille', 'Leroy', 'client.c1@example.com', '0612345678');
        $shopB->clients()->attach($client->id);

        Sanctum::actingAs($adminA);
        $this->deleteJson('/api/v1/opticien/clients/'.$client->uuid)->assertOk();

        $this->assertFalse($client->fresh()->opticians()->where('opticians.id', $shopA->id)->exists());
        $this->assertTrue($client->fresh()->opticians()->where('opticians.id', $shopB->id)->exists());
        $this->assertNotNull(Client::query()->find($client->id));

        Sanctum::actingAs($adminB);
        $this->getJson('/api/v1/opticien/clients/'.$client->uuid)
            ->assertOk()
            ->assertJsonPath('data.email', 'client.c1@example.com');
    }

    public function test_r2_08_email_change_waits_for_otp(): void
    {
        Mail::fake();
        [$admin, $shop] = $this->shopWithAdmin();
        $client = $this->seedClient($shop, 'Camille', 'Leroy', 'client.c1@example.com', '0612345678');

        Sanctum::actingAs($admin);
        $challenge = $this->patchJson('/api/v1/opticien/clients/'.$client->uuid, $this->payload([
            'email' => 'nouveau.mail@example.com',
            'phone' => '0612345678',
            'first_name' => 'Camille',
            'last_name' => 'Leroy',
            'consent_email' => true,
            'consent_sms' => true,
        ]))
            ->assertStatus(202)
            ->assertJsonPath('data.otp_channel', 'email');

        $this->assertSame('client.c1@example.com', $client->fresh()->email);

        $code = null;
        Mail::assertSent(IdentityOtpMail::class, function (IdentityOtpMail $mail) use (&$code): bool {
            $code = $mail->code;

            return $mail->channel === 'email';
        });

        $this->assertDatabaseHas('notification_logs', [
            'type' => 'identity_otp',
            'channel' => 'email',
            'recipient' => 'nouveau.mail@example.com',
        ]);
        $this->assertDatabaseMissing('notification_logs', [
            'error' => $code,
        ]);

        $this->postJson('/api/v1/opticien/clients/identity/'.$challenge->json('data.action_token').'/otp', [
            'code' => '000000',
        ])->assertStatus(422);

        $this->postJson('/api/v1/opticien/clients/identity/'.$challenge->json('data.action_token').'/otp', [
            'code' => $code,
        ])
            ->assertOk()
            ->assertJsonPath('data.email', 'nouveau.mail@example.com');
    }

    public function test_r2_09_phone_change_sends_sms_otp(): void
    {
        Mail::fake();
        [$admin, $shop] = $this->shopWithAdmin();
        $client = $this->seedClient($shop, 'Camille', 'Leroy', 'client.c1@example.com', '0612345678');

        Sanctum::actingAs($admin);
        $challenge = $this->patchJson('/api/v1/opticien/clients/'.$client->uuid, $this->payload([
            'email' => 'client.c1@example.com',
            'phone' => '0688888888',
            'first_name' => 'Camille',
            'last_name' => 'Leroy',
            'consent_email' => true,
            'consent_sms' => true,
        ]))
            ->assertStatus(202)
            ->assertJsonPath('data.otp_channel', 'sms');

        $this->assertSame('0612345678', $client->fresh()->phone);

        $code = null;
        Mail::assertSent(IdentityOtpMail::class, function (IdentityOtpMail $mail) use (&$code): bool {
            $code = $mail->code;

            return $mail->channel === 'sms';
        });

        $this->assertDatabaseHas('notification_logs', [
            'type' => 'identity_otp',
            'channel' => 'sms',
            'recipient' => '0688888888',
        ]);

        $this->postJson('/api/v1/opticien/clients/identity/'.$challenge->json('data.action_token').'/otp', [
            'code' => $code,
        ])
            ->assertOk()
            ->assertJsonPath('data.phone', '0688888888');
    }

    public function test_r2_10_opticien_user_cannot_manage_shop_users(): void
    {
        [$admin, $shop] = $this->shopWithAdmin();
        $staff = User::factory()->opticienUser()->create(['email' => 'opticien.a.user@example.com']);
        $shop->users()->attach($staff->id);

        Sanctum::actingAs($staff);
        $this->getJson('/api/v1/opticien/users')->assertNotFound();
        $this->postJson('/api/v1/opticien/users', [
            'first_name' => 'Léa',
            'last_name' => 'Staff',
            'email' => 'staff.a@example.com',
        ])->assertNotFound();
        $this->getJson('/api/v1/opticien/clients')->assertOk();

        Sanctum::actingAs($admin);
        $this->getJson('/api/v1/opticien/users')->assertNotFound();
    }

    public function test_name_only_update_persists_without_otp(): void
    {
        Mail::fake();
        [$admin, $shop] = $this->shopWithAdmin();
        $client = $this->seedClient($shop, 'Camille', 'Leroy', 'client.c1@example.com', '0612345678');

        Sanctum::actingAs($admin);
        $this->patchJson('/api/v1/opticien/clients/'.$client->uuid, $this->payload([
            'first_name' => 'Camille-Maj',
            'last_name' => 'Leroy',
            'email' => 'client.c1@example.com',
            'phone' => '0612345678',
            'consent_email' => false,
            'consent_sms' => true,
        ]))
            ->assertOk()
            ->assertJsonPath('data.first_name', 'Camille-Maj')
            ->assertJsonPath('data.consent_email', false)
            ->assertJsonPath('data.consent_sms', true);

        Mail::assertNothingSent();
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'first_name' => 'Camille',
            'last_name' => 'Leroy',
            'email' => 'nouveau.c1@example.com',
            'phone' => '0611111111',
            'consent_email' => true,
            'consent_sms' => false,
        ], $overrides);
    }

    private function shopAdmin(): User
    {
        return $this->shopWithAdmin()[0];
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

    private function seedClient(Optician $shop, string $first, string $last, string $email, string $phone): Client
    {
        $user = User::factory()->create([
            'first_name' => $first,
            'last_name' => $last,
            'email' => $email,
            'phone' => $phone,
            'role' => Role::Client,
        ]);
        $client = Client::query()->create([
            'user_id' => $user->id,
            'first_name' => $first,
            'last_name' => $last,
            'email' => $email,
            'phone' => $phone,
            'consent_email' => true,
            'consent_sms' => true,
        ]);
        $shop->clients()->attach($client->id);

        return $client;
    }
}
