<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Mail\InvitationMail;
use App\Models\Optician;
use App\Models\User;
use App\Services\ShopUserService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Sanctum;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tests\TestCase;

class LotShopAccountUsersTest extends TestCase
{
    use RefreshDatabase;

    public function test_r2_11_filament_manages_shop_users_not_next_api(): void
    {
        Mail::fake();
        $pdv = User::factory()->admin()->create();
        [$adminA, $shopA] = $this->shopWithAdmin('Optique A', 'opticien.a@example.com');
        [, $shopB] = $this->shopWithAdmin('Optique B', 'opticien.b@example.com');
        $foreign = User::factory()->opticienUser()->create(['email' => 'staff.b@example.com']);
        $shopB->users()->attach($foreign->id);

        $invited = app(ShopUserService::class)->invite($shopA, $pdv, [
            'first_name' => 'Léa',
            'last_name' => 'Martin',
            'email' => 'lea.martin@example.com',
        ], request());

        $this->assertSame(Role::OpticienUser, $invited->role);
        Mail::assertSent(InvitationMail::class);
        $this->assertTrue($shopA->users()->where('email', 'lea.martin@example.com')->exists());

        $this->expectException(NotFoundHttpException::class);
        app(ShopUserService::class)->remove($shopA, $pdv, $foreign->uuid, request());
    }

    public function test_invite_does_not_reveal_existing_email(): void
    {
        $pdv = User::factory()->admin()->create();
        [, $shop] = $this->shopWithAdmin();
        User::factory()->create(['email' => 'deja.pris@example.com', 'role' => Role::Client]);

        try {
            app(ShopUserService::class)->invite($shop, $pdv, [
                'first_name' => 'Léa',
                'last_name' => 'Martin',
                'email' => 'deja.pris@example.com',
            ], request());
            $this->fail('Expected validation exception');
        } catch (ValidationException $exception) {
            $this->assertSame(['Impossible d’inviter cet e-mail.'], $exception->errors()['email']);
        }
    }

    public function test_admin_pdv_sees_shop_users_in_filament_opticien_does_not(): void
    {
        $pdv = User::factory()->admin()->create();
        [$staff, $shop] = $this->shopWithAdmin();

        $this->actingAs($pdv)->get('/admin/opticians/'.$shop->getKey().'/edit')
            ->assertOk()
            ->assertSee('Utilisateurs du magasin')
            ->assertSee($staff->email);

        $this->actingAs($staff)->get('/admin/opticians/'.$shop->getKey().'/edit')->assertForbidden();
        $this->actingAs($staff)->getJson('/api/v1/opticien/users')->assertNotFound();
    }

    public function test_account_password_and_email_update(): void
    {
        [$admin] = $this->shopWithAdmin();
        Sanctum::actingAs($admin);

        $this->patchJson('/api/v1/opticien/account/password', [
            'current_password' => 'Password1',
            'password' => 'Nouveau9',
            'password_confirmation' => 'Nouveau9',
        ])->assertOk();

        $this->patchJson('/api/v1/opticien/account/email', [
            'current_password' => 'Nouveau9',
            'email' => 'nouveau.admin@example.com',
        ])
            ->assertOk()
            ->assertJsonPath('data.email', 'nouveau.admin@example.com');
    }

    public function test_last_shop_admin_cannot_delete_own_account(): void
    {
        [$admin] = $this->shopWithAdmin();
        Sanctum::actingAs($admin);

        $this->deleteJson('/api/v1/opticien/account')
            ->assertStatus(422)
            ->assertJsonPath('errors.0.field', 'account');
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
}
