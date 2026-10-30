<?php

namespace App\Services;

use App\Mail\InvitationMail;
use App\Models\Invitation;
use App\Models\User;
use App\Support\SecureToken;

class InvitationService
{
    public const TTL_DAYS = 7;

    public function __construct(private readonly NotificationService $notifications) {}

    public function issue(User $user): string
    {
        Invitation::query()->where('user_id', $user->id)->whereNull('used_at')->update([
            'used_at' => now(),
        ]);

        $plain = SecureToken::plain();
        Invitation::query()->create([
            'user_id' => $user->id,
            'token_hash' => SecureToken::hash($plain),
            'expires_at' => now()->addDays(self::TTL_DAYS),
        ]);

        $this->notifications->sendEmail($user->email, 'invitation', new InvitationMail($plain, $user->first_name));

        return $plain;
    }

    public function findUsable(string $plain): ?Invitation
    {
        $invitation = Invitation::query()
            ->where('token_hash', SecureToken::hash($plain))
            ->first();

        if ($invitation === null || ! $invitation->isUsable()) {
            return null;
        }

        return $invitation;
    }

    public function activate(Invitation $invitation, string $password): User
    {
        $user = $invitation->user;
        $user->forceFill([
            'password' => $password,
            'password_set_at' => now(),
            'cgu_accepted_at' => now(),
            'email_verified_at' => $user->email_verified_at ?? now(),
        ])->save();
        $invitation->update(['used_at' => now()]);

        return $user->fresh();
    }
}
