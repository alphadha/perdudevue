<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Optician;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditJournalsTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_success_is_logged_with_summary_and_ip(): void
    {
        $this->opticien('opticien.a@example.com');

        $this->postJson('/api/v1/auth/login', [
            'email' => 'opticien.a@example.com',
            'password' => 'Password1',
            'space' => 'opticien',
        ])->assertOk();

        $log = AuditLog::query()->where('action', 'login')->latest('id')->first();
        $this->assertNotNull($log);
        $this->assertSame('opticien', $log->meta['space'] ?? null);
        $this->assertNotNull($log->ip_address);
        $this->assertNotEmpty($log->summary);
        $this->assertStringContainsString('connecté', $log->summary);
        $this->assertTrue($log->isAuthEvent());
    }

    public function test_login_failure_logs_email_without_revealing_via_api(): void
    {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'inconnu@example.com',
            'password' => 'WrongPass1',
            'space' => 'opticien',
        ])->assertUnauthorized();

        $log = AuditLog::query()->where('action', 'login_failed')->latest('id')->first();
        $this->assertNotNull($log);
        $this->assertNull($log->user_id);
        $this->assertSame('inconnu@example.com', $log->meta['email'] ?? null);
        $this->assertStringContainsString('Échec', $log->summary);
    }

    public function test_business_action_goes_to_activity_scope_not_auth(): void
    {
        $admin = $this->opticien('opticien.a@example.com');

        app(AuditService::class)->record($admin, 'client.created', request(), [
            'client_uuid' => 'demo',
        ]);

        $this->assertSame(1, AuditLog::query()->activities()->count());
        $this->assertSame(0, AuditLog::query()->authEvents()->where('action', 'client.created')->count());
        $this->assertStringContainsString('créé un client', AuditLog::query()->activities()->first()->summary);
    }

    public function test_admin_can_open_filament_journal_pages(): void
    {
        $admin = User::factory()->admin()->create(['email' => 'admin.pdv@example.com']);

        $this->actingAs($admin)
            ->get('/admin/journal-modifications')
            ->assertOk();

        $this->actingAs($admin)
            ->get('/admin/journal-connexions')
            ->assertOk();
    }

    public function test_opticien_cannot_open_filament_journals(): void
    {
        $opticien = $this->opticien('opticien.a@example.com');

        $this->actingAs($opticien)
            ->get('/admin/journal-modifications')
            ->assertForbidden();
    }

    private function opticien(string $email): User
    {
        $user = User::factory()->opticienAdmin()->create(['email' => $email]);
        $optician = Optician::query()->create(['name' => 'Optique A']);
        $optician->users()->attach($user->id);

        return $user;
    }
}
