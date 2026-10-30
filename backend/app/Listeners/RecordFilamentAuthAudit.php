<?php

namespace App\Listeners;

use App\Models\User;
use App\Services\AuditService;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Http\Request;

class RecordFilamentAuthAudit
{
    public function __construct(private readonly AuditService $audit) {}

    public function handleLogin(Login $event): void
    {
        if (! $this->isAdminPanelRequest()) {
            return;
        }

        $user = $event->user instanceof User ? $event->user : null;
        $this->audit->record($user, 'login', $this->request(), [
            'space' => 'admin',
            'email' => $user?->email,
            'via' => 'filament',
        ]);
    }

    public function handleFailed(Failed $event): void
    {
        if (! $this->isAdminPanelRequest()) {
            return;
        }

        $email = isset($event->credentials['email'])
            ? strtolower(trim((string) $event->credentials['email']))
            : null;
        $user = $event->user instanceof User ? $event->user : null;

        $this->audit->record($user, 'login_failed', $this->request(), [
            'space' => 'admin',
            'email' => $email,
            'via' => 'filament',
        ]);
    }

    public function handleLogout(Logout $event): void
    {
        if (! $this->isAdminPanelRequest()) {
            return;
        }

        $user = $event->user instanceof User ? $event->user : null;
        $this->audit->record($user, 'logout', $this->request(), [
            'space' => 'admin',
            'email' => $user?->email,
            'via' => 'filament',
        ]);
    }

    private function isAdminPanelRequest(): bool
    {
        $request = $this->request();

        return $request !== null && ($request->is('admin') || $request->is('admin/*'));
    }

    private function request(): ?Request
    {
        return app()->bound('request') ? request() : null;
    }
}
