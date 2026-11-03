<?php

namespace App\Services;

use App\Enums\Role;
use App\Mail\IdentityOtpMail;
use App\Models\EmailChangeChallenge;
use App\Models\User;
use App\Support\IdentityChallenge;
use App\Support\SecureToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AccountService
{
    public const EMAIL_OTP_TTL_MINUTES = 15;

    public const GENERIC_EMAIL_ERROR = 'Impossible de modifier cette adresse.';

    public function __construct(
        private readonly AuditService $audit,
        private readonly NotificationService $notifications,
    ) {}

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

    public function requestEmailChange(User $user, string $email, Request $request): IdentityChallenge
    {
        $email = strtolower(trim($email));
        if ($email === strtolower((string) $user->email)) {
            throw ValidationException::withMessages([
                'email' => self::GENERIC_EMAIL_ERROR,
            ]);
        }

        $taken = User::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->where('id', '!=', $user->id)
            ->exists();
        if ($taken) {
            throw ValidationException::withMessages([
                'email' => self::GENERIC_EMAIL_ERROR,
            ]);
        }

        EmailChangeChallenge::query()
            ->where('user_id', $user->id)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        $plain = SecureToken::plain();
        $code = SecureToken::otp();
        EmailChangeChallenge::query()->create([
            'user_id' => $user->id,
            'token_hash' => SecureToken::hash($plain),
            'new_email' => $email,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(self::EMAIL_OTP_TTL_MINUTES),
        ]);

        $this->notifications->sendEmail($email, 'identity_otp', new IdentityOtpMail($code, 'email'));
        $this->audit->record($user, 'account.email_otp', $request);

        return new IdentityChallenge($plain, 'email', $this->maskEmail($email));
    }

    public function confirmEmailChange(User $user, string $plainToken, string $code, Request $request): User
    {
        $challenge = $this->usableChallenge($user, $plainToken);
        $challenge->increment('attempts');
        if ($challenge->attempts > 5) {
            $challenge->update(['consumed_at' => now()]);
            throw ValidationException::withMessages([
                'code' => 'Code invalide ou expiré.',
            ]);
        }

        if (! Hash::check($code, $challenge->code_hash)) {
            throw ValidationException::withMessages([
                'code' => 'Code invalide ou expiré.',
            ]);
        }

        $taken = User::query()
            ->whereRaw('LOWER(email) = ?', [$challenge->new_email])
            ->where('id', '!=', $user->id)
            ->exists();
        if ($taken) {
            $challenge->update(['consumed_at' => now()]);
            throw ValidationException::withMessages([
                'email' => self::GENERIC_EMAIL_ERROR,
            ]);
        }

        $user->forceFill(['email' => $challenge->new_email])->save();
        $user->clientProfile?->forceFill(['email' => $challenge->new_email])->save();
        $challenge->update(['consumed_at' => now()]);
        $this->audit->record($user, 'account.email_changed', $request);

        return $user->fresh();
    }

    public function resendEmailChange(User $user, string $plainToken, Request $request): IdentityChallenge
    {
        $challenge = $this->usableChallenge($user, $plainToken);
        $code = SecureToken::otp();
        $challenge->forceFill([
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(self::EMAIL_OTP_TTL_MINUTES),
            'attempts' => 0,
        ])->save();

        $this->notifications->sendEmail($challenge->new_email, 'identity_otp', new IdentityOtpMail($code, 'email'));
        $this->audit->record($user, 'account.email_otp_resend', $request);

        return new IdentityChallenge($plainToken, 'email', $this->maskEmail($challenge->new_email));
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

    private function usableChallenge(User $user, string $plainToken): EmailChangeChallenge
    {
        $challenge = EmailChangeChallenge::query()
            ->where('user_id', $user->id)
            ->where('token_hash', SecureToken::hash($plainToken))
            ->latest()
            ->first();

        if ($challenge === null || ! $challenge->isUsable()) {
            throw ValidationException::withMessages([
                'code' => 'Code invalide ou expiré.',
            ]);
        }

        return $challenge;
    }

    private function maskEmail(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');
        $initial = mb_substr($local, 0, 1);

        return $initial.'******@'.$domain;
    }
}
