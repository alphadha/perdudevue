<?php

namespace App\Services;

use App\Mail\PasswordOtpMail;
use App\Models\PasswordOtp;
use App\Models\User;
use App\Support\SecureToken;
use Illuminate\Support\Facades\Hash;

class PasswordResetService
{
    public const TTL_MINUTES = 15;

    public const GENERIC_MESSAGE = 'Si un compte existe, un code a été envoyé.';

    public function __construct(private readonly NotificationService $notifications) {}

    public function requestOtp(string $email): void
    {
        $user = User::query()->where('email', $email)->first();
        if ($user === null || ! $user->hasPassword()) {
            return;
        }

        PasswordOtp::query()->where('email', $email)->whereNull('consumed_at')->update([
            'consumed_at' => now(),
        ]);

        $code = SecureToken::otp();
        PasswordOtp::query()->create([
            'email' => $email,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(self::TTL_MINUTES),
        ]);

        $this->notifications->sendEmail($email, 'password_otp', new PasswordOtpMail($code));
    }

    public function verifyOtp(string $email, string $code): bool
    {
        $otp = $this->latestUsable($email);
        if ($otp === null) {
            return false;
        }

        $otp->increment('attempts');
        if ($otp->attempts > 5) {
            $otp->update(['consumed_at' => now()]);

            return false;
        }

        return Hash::check($code, $otp->code_hash);
    }

    public function reset(string $email, string $code, string $password): bool
    {
        if (! $this->verifyOtp($email, $code)) {
            return false;
        }

        $user = User::query()->where('email', $email)->first();
        $otp = $this->latestUsable($email);
        if ($user === null || $otp === null) {
            return false;
        }

        $user->forceFill([
            'password' => $password,
            'password_set_at' => now(),
        ])->save();
        $user->tokens()->delete();
        $otp->update(['consumed_at' => now()]);

        return true;
    }

    private function latestUsable(string $email): ?PasswordOtp
    {
        $otp = PasswordOtp::query()
            ->where('email', $email)
            ->whereNull('consumed_at')
            ->latest()
            ->first();

        if ($otp === null || ! $otp->isUsable()) {
            return null;
        }

        return $otp;
    }
}
