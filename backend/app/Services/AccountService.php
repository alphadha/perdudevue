<?php

namespace App\Services;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AccountService
{
    public function __construct(private readonly AuditService $audit) {}

    public function changePassword(User $user, string $current, string $next, Request $request): void
    {
        if (! Hash::check($current, (string) $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => 'Mot de passe actuel incorrect.',
            ]);
        }

        $user->forceFill([
            'password' => $next,
            'password_set_at' => now(),
        ])->save();
        $this->audit->record($user, 'account.password_changed', $request);
    }

    public function changeEmail(User $user, string $currentPassword, string $email, Request $request): User
    {
        if (! Hash::check($currentPassword, (string) $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => 'Mot de passe actuel incorrect.',
            ]);
        }

        $email = strtolower(trim($email));
        $taken = User::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->where('id', '!=', $user->id)
            ->exists();
        if ($taken) {
            throw ValidationException::withMessages([
                'email' => 'Impossible de modifier cette adresse.',
            ]);
        }

        $user->forceFill(['email' => $email])->save();
        $user->clientProfile?->forceFill(['email' => $email])->save();
        $this->audit->record($user, 'account.email_changed', $request);

        return $user->fresh();
    }

    public function deleteOwn(User $user, Request $request): void
    {
        if ($user->role === Role::OpticienAdmin) {
            $shop = $user->primaryOptician();
            $admins = $shop?->users()
                ->where('role', Role::OpticienAdmin->value)
                ->whereNull('users.blocked_at')
                ->count() ?? 0;
            if ($admins <= 1) {
                throw ValidationException::withMessages([
                    'account' => 'Le dernier administrateur du magasin ne peut pas supprimer son compte. Contactez support@perduesdevue.fr.',
                ]);
            }
        }

        $shop = $user->primaryOptician();
        $shop?->users()->detach($user->id);
        $user->block();
        $this->audit->record($user, 'account.deleted', $request);
    }
}
