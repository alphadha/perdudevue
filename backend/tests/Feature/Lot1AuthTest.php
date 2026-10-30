<?php

namespace Tests\Feature;

use App\Enums\PairStatus;
use App\Enums\Role;
use App\Mail\PasswordOtpMail;
use App\Models\Client;
use App\Models\Invitation;
use App\Models\Optician;
use App\Models\Pair;
use App\Models\PublicRestitutionToken;
use App\Models\User;
use App\Support\SecureToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class Lot1AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_r0_01_health(): void
    {
        $this->getJson('/api/v1/health')
            ->assertOk()
            ->assertJsonPath('data.status', 'ok')
            ->assertJsonPath('errors', []);
    }

    public function test_r1_01_login_opticien(): void
    {
        $this->opticien('opticien.a@example.com');

        $this->postJson('/api/v1/auth/login', [
            'email' => 'opticien.a@example.com',
            'password' => 'Password1',
            'space' => 'opticien',
        ])
            ->assertOk()
            ->assertJsonPath('data.user.role', 'opticien_admin')
            ->assertJsonPath('data.user.home', '/opticien')
            ->assertJsonStructure(['data' => ['token', 'user']]);
    }

    public function test_login_accepts_trimmed_email_and_password(): void
    {
        $this->opticien('opticien.a@example.com');

        $this->postJson('/api/v1/auth/login', [
            'email' => '  Opticien.A@example.com  ',
            'password' => "\u{00A0}Password1 ",
            'space' => 'opticien',
        ])
            ->assertOk()
            ->assertJsonPath('data.user.email', 'opticien.a@example.com');
    }

    public function test_r1_02_wrong_password_is_generic(): void
    {
        $this->opticien('opticien.a@example.com');

        $this->postJson('/api/v1/auth/login', [
            'email' => 'opticien.a@example.com',
            'password' => 'WrongPass1',
            'space' => 'opticien',
        ])
            ->assertUnauthorized()
            ->assertJsonPath('errors.0.message', 'Identifiants incorrects.')
            ->assertJsonMissing(['email inconnu']);
    }

    public function test_unknown_email_is_also_generic(): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'inconnu@example.com',
            'password' => 'Password1',
            'space' => 'client',
        ])
            ->assertUnauthorized()
            ->assertJsonPath('errors.0.message', 'Identifiants incorrects.');
    }

    public function test_r1_03_login_before_password_refused(): void
    {
        $this->pendingClient('client.c1@example.com');

        $this->postJson('/api/v1/auth/login', [
            'email' => 'client.c1@example.com',
            'password' => 'Password1',
            'space' => 'client',
        ])->assertUnauthorized();
    }

    public function test_r1_04_and_r1_05_invitation_requires_cgu(): void
    {
        $pending = $this->pendingClient('client.c1@example.com');
        $token = 'invite-c1-token';
        Invitation::query()->create([
            'user_id' => $pending->id,
            'token_hash' => SecureToken::hash($token),
            'expires_at' => now()->addDay(),
        ]);

        $this->postJson('/api/v1/auth/invitation/'.$token, [
            'password' => 'Password1',
            'password_confirmation' => 'Password1',
        ])->assertStatus(422);

        $this->postJson('/api/v1/auth/invitation/'.$token, [
            'password' => 'Password1',
            'password_confirmation' => 'Password1',
            'cgu_accepted' => false,
        ])->assertStatus(422);

        $this->postJson('/api/v1/auth/invitation/'.$token, [
            'password' => 'Password1',
            'password_confirmation' => 'Password1',
            'cgu_accepted' => true,
        ])
            ->assertOk()
            ->assertJsonPath('data.user.role', 'client')
            ->assertJsonPath('data.user.home', '/client');

        $this->assertNotNull($pending->fresh()->cgu_accepted_at);
        $this->assertTrue($pending->fresh()->hasPassword());
    }

    public function test_r1_07_invitation_cannot_be_reused(): void
    {
        $pending = $this->pendingClient('client.c1@example.com');
        $token = 'invite-once';
        Invitation::query()->create([
            'user_id' => $pending->id,
            'token_hash' => SecureToken::hash($token),
            'expires_at' => now()->addDay(),
        ]);

        $payload = [
            'password' => 'Password1',
            'password_confirmation' => 'Password1',
            'cgu_accepted' => true,
        ];
        $this->postJson('/api/v1/auth/invitation/'.$token, $payload)->assertOk();
        $this->postJson('/api/v1/auth/invitation/'.$token, $payload)->assertNotFound();
    }

    public function test_r1_06_reset_password_otp(): void
    {
        Mail::fake();
        $this->opticien('opticien.a@example.com');

        $this->postJson('/api/v1/auth/password/forgot', [
            'email' => 'opticien.a@example.com',
        ])
            ->assertOk()
            ->assertJsonPath('data.message', 'Si un compte existe, un code a été envoyé.');

        $this->postJson('/api/v1/auth/password/forgot', [
            'email' => 'inconnu@example.com',
        ])->assertOk();

        $code = null;
        Mail::assertSent(PasswordOtpMail::class, function (PasswordOtpMail $mail) use (&$code) {
            $code = $mail->code;

            return true;
        });
        $this->assertNotNull($code);
        $this->assertSame(6, strlen($code));

        $this->postJson('/api/v1/auth/password/otp', [
            'email' => 'opticien.a@example.com',
            'code' => $code,
        ])->assertOk();

        $this->postJson('/api/v1/auth/password/reset', [
            'email' => 'opticien.a@example.com',
            'code' => $code,
            'password' => 'Nouveau12',
            'password_confirmation' => 'Nouveau12',
        ])->assertOk();

        $this->postJson('/api/v1/auth/login', [
            'email' => 'opticien.a@example.com',
            'password' => 'Nouveau12',
            'space' => 'opticien',
        ])->assertOk();
    }

    public function test_r1_08_opticien_cannot_call_admin(): void
    {
        $opticien = $this->opticien('opticien.a@example.com');
        $token = $opticien->createToken('web')->plainTextToken;

        $this->postJson('/api/v1/admin/opticians', [
            'name' => 'Optique Z',
            'email' => 'z@example.com',
            'first_name' => 'Zoe',
            'last_name' => 'Admin',
        ], ['Authorization' => 'Bearer '.$token])->assertForbidden();
    }

    public function test_admin_can_create_optician(): void
    {
        Mail::fake();
        $admin = User::factory()->admin()->create(['email' => 'admin@perduesdevue.fr']);
        $token = $admin->createToken('web')->plainTextToken;

        $this->postJson('/api/v1/admin/opticians', [
            'name' => 'Optique Z',
            'email' => 'z@example.com',
            'first_name' => 'Zoe',
            'last_name' => 'Admin',
        ], ['Authorization' => 'Bearer '.$token])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Optique Z');
    }

    public function test_r1_09_and_r1_10_public_restitution_token(): void
    {
        $opticien = Optician::query()->create([
            'name' => 'L’Œil Moderne',
            'address' => '15 rue du Taur',
            'city' => 'Toulouse',
            'postal_code' => '31000',
            'phone' => '0561000002',
        ]);
        $user = $this->pendingClient('client.c1@example.com');
        $client = Client::query()->create([
            'user_id' => $user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
        ]);
        $pair = new Pair;
        $pair->forceFill([
            'client_id' => $client->id,
            'origin_optician_id' => $opticien->id,
            'depositary_optician_id' => $opticien->id,
            'assigned_code' => 'FR5487OK',
            'status' => PairStatus::ARecuperer,
            'type' => 'Vue',
            'brand' => 'Gucci',
            'colors' => ['Bleu', 'Gris'],
            'registered_at' => now(),
        ])->save();
        $pair->pickup_code = 'KSKKYK';
        $pair->save();

        $plain = 'public-ok-token';
        PublicRestitutionToken::query()->create([
            'pair_id' => $pair->id,
            'token_hash' => SecureToken::hash($plain),
            'expires_at' => now()->addDay(),
        ]);

        $this->getJson('/api/v1/public/restitutions/'.$plain)
            ->assertOk()
            ->assertJsonPath('data.pickup_code', 'KSKKYK')
            ->assertJsonPath('data.pair.assigned_code', 'FR5487OK')
            ->assertJsonMissingPath('data.owner')
            ->assertJsonMissingPath('data.client');

        $this->getJson('/api/v1/public/restitutions/tampered-token')->assertNotFound();
    }

    public function test_r1_11_login_throttle(): void
    {
        $this->opticien('opticien.a@example.com');

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => 'opticien.a@example.com',
                'password' => 'WrongPass1',
                'space' => 'opticien',
            ])->assertUnauthorized();
        }

        $this->postJson('/api/v1/auth/login', [
            'email' => 'opticien.a@example.com',
            'password' => 'WrongPass1',
            'space' => 'opticien',
        ])->assertStatus(429);
    }

    public function test_me_requires_auth(): void
    {
        $this->getJson('api/v1/auth/me')->assertUnauthorized();
    }

    public function test_role_is_not_mass_assignable(): void
    {
        $user = User::factory()->create();
        $user->fill(['role' => Role::AdminPdv, 'email' => 'hacked@example.com']);
        $this->assertSame(Role::Client, $user->role);
    }

    public function test_filament_login_is_on_laravel_not_next(): void
    {
        $this->get('/admin/login')->assertOk();
    }

    public function test_filament_is_forbidden_for_opticien(): void
    {
        $opticien = $this->opticien('opticien.a@example.com');
        $this->actingAs($opticien)->get('/admin')->assertForbidden();
    }

    public function test_filament_is_allowed_for_admin_pdv(): void
    {
        $admin = User::factory()->admin()->create(['email' => 'admin@perduesdevue.fr']);
        $this->actingAs($admin)->get('/admin')->assertOk();
    }

    private function opticien(string $email): User
    {
        $user = User::factory()->opticienAdmin()->create(['email' => $email]);
        $optician = Optician::query()->create(['name' => 'Optique A']);
        $optician->users()->attach($user->id);

        return $user;
    }

    private function pendingClient(string $email): User
    {
        return User::factory()->pendingInvitation()->create(['email' => $email]);
    }
}
