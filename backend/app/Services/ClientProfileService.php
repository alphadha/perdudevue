<?php

namespace App\Services;

use App\Mail\IdentityOtpMail;
use App\Models\Client;
use App\Models\PhoneChangeChallenge;
use App\Models\User;
use App\Support\IdentityChallenge;
use App\Support\Phone;
use App\Support\SecureToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class ClientProfileService
{
    public const OTP_TTL_MINUTES = 15;

    public const GENERIC_PHONE_ERROR = 'Impossible de modifier ce numéro.';

    public function __construct(
        private readonly AuditService $audit,
        private readonly NotificationService $notifications,
    ) {}

    /**
     * @return array{client: Client, challenge: IdentityChallenge|null}
     */
    public function update(User $user, Client $client, string $firstName, string $lastName, string $phone, Request $request): array
    {
        $client->forceFill([
            'first_name' => $firstName,
            'last_name' => $lastName,
        ])->save();
        $user->forceFill([
            'first_name' => $firstName,
            'last_name' => $lastName,
        ])->save();

        $phoneChanged = Phone::digits($phone) !== Phone::digits($client->phone);
        if (! $phoneChanged) {
            $this->audit->record($user, 'client.profile_updated', $request, [
                'client_uuid' => $client->uuid,
            ]);

            return ['client' => $client->fresh(), 'challenge' => null];
        }

        $this->assertPhoneAvailable($phone, $user, $client);
        $challenge = $this->issuePhoneChallenge($user, $phone, $request);
        $this->audit->record($user, 'client.profile_updated', $request, [
            'client_uuid' => $client->uuid,
        ]);

        return ['client' => $client->fresh(), 'challenge' => $challenge];
    }

    public function confirmPhone(User $user, Client $client, string $plainToken, string $code, Request $request): Client
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

        $this->assertPhoneAvailable($challenge->new_phone, $user, $client);

        $client->forceFill(['phone' => $challenge->new_phone])->save();
        $user->forceFill(['phone' => $challenge->new_phone])->save();
        $challenge->update(['consumed_at' => now()]);
        $this->audit->record($user, 'client.phone_changed', $request, [
            'client_uuid' => $client->uuid,
        ]);

        return $client->fresh();
    }

    public function resendPhone(User $user, string $plainToken, Request $request): IdentityChallenge
    {
        $challenge = $this->usableChallenge($user, $plainToken);
        $code = SecureToken::otp();
        $challenge->forceFill([
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(self::OTP_TTL_MINUTES),
            'attempts' => 0,
        ])->save();

        $this->sendSms($challenge->new_phone, $code);
        $this->audit->record($user, 'client.phone_otp_resend', $request);

        return new IdentityChallenge($plainToken, 'sms', null, Phone::mask($challenge->new_phone));
    }

    private function issuePhoneChallenge(User $user, string $phone, Request $request): IdentityChallenge
    {
        PhoneChangeChallenge::query()
            ->where('user_id', $user->id)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        $plain = SecureToken::plain();
        $code = SecureToken::otp();
        PhoneChangeChallenge::query()->create([
            'user_id' => $user->id,
            'token_hash' => SecureToken::hash($plain),
            'new_phone' => $phone,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(self::OTP_TTL_MINUTES),
        ]);

        $this->sendSms($phone, $code);
        $this->audit->record($user, 'client.phone_otp', $request);

        return new IdentityChallenge($plain, 'sms', null, Phone::mask($phone));
    }

    private function sendSms(string $phone, string $code): void
    {
        $this->notifications->sendSms($phone, 'identity_otp', function () use ($code): void {
            Mail::to(config('mail.from.address'))->send(new IdentityOtpMail($code, 'sms'));
        });
    }

    private function usableChallenge(User $user, string $plainToken): PhoneChangeChallenge
    {
        $challenge = PhoneChangeChallenge::query()
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

    private function assertPhoneAvailable(string $phone, User $user, Client $client): void
    {
        $digits = Phone::digits($phone);
        $takenUser = User::query()
            ->where('id', '!=', $user->id)
            ->where(function ($query) use ($phone, $digits): void {
                $query->where('phone', $phone);
                if ($digits !== null) {
                    $query->orWhere('phone', $digits);
                }
            })
            ->exists();
        $takenClient = Client::query()
            ->where('id', '!=', $client->id)
            ->where(function ($query) use ($phone, $digits): void {
                $query->where('phone', $phone);
                if ($digits !== null) {
                    $query->orWhere('phone', $digits);
                }
            })
            ->exists();

        if ($takenUser || $takenClient) {
            throw ValidationException::withMessages([
                'phone' => self::GENERIC_PHONE_ERROR,
            ]);
        }
    }
}
