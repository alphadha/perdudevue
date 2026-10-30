<?php

namespace App\Services;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    public function __construct(private readonly AuditService $audit) {}

    public function attempt(string $email, string $password, string $space, Request $request): ?string
    {
        $email = strtolower(trim($email));
        $password = preg_replace('/^[\s\x{00A0}\x{202F}]+|[\s\x{00A0}\x{202F}]+$/u', '', $password) ?? '';

        $user = User::query()->whereRaw('LOWER(email) = ?', [$email])->first();
        $passwordOk = Hash::check($password, $user?->password ?? $this->dummyHash());
        $allowed = Role::forSpace($space);

        if (
            $user === null
            || ! $passwordOk
            || ! $user->hasPassword()
            || $user->isBlocked()
            || ! in_array($user->role, $allowed, true)
        ) {
            $this->audit->record($user, 'login_failed', $request, [
                'space' => $space,
                'email' => $email,
            ]);

            return null;
        }

        $user->tokens()->delete();
        $token = $user->createToken('web')->plainTextToken;
        $this->audit->record($user, 'login', $request, [
            'space' => $space,
            'email' => $email,
        ]);

        return $token;
    }

    public function logout(User $user, Request $request): void
    {
        $user->currentAccessToken()?->delete();
        $this->audit->record($user, 'logout', $request, [
            'space' => match ($user->role?->value) {
                'admin_pdv' => 'admin',
                'client' => 'client',
                default => 'opticien',
            },
            'email' => $user->email,
        ]);
    }

    private function dummyHash(): string
    {
        return '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
    }
}
