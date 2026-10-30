<?php

namespace App\Services;

use App\Enums\Role;
use App\Exceptions\ClientDuplicateException;
use App\Mail\IdentityOtpMail;
use App\Models\Client;
use App\Models\ClientAction;
use App\Models\Optician;
use App\Models\User;
use App\Support\IdentityChallenge;
use App\Support\Phone;
use App\Support\SecureToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class OpticienClientService
{
    public const ACTION_TTL_MINUTES = 30;

    public const OTP_TTL_MINUTES = 15;

    public const TYPE_DUPLICATE = 'duplicate';

    public const TYPE_IDENTITY = 'identity';

    public function __construct(
        private readonly InvitationService $invitations,
        private readonly AuditService $audit,
        private readonly NotificationService $notifications,
    ) {}

    /**
     * @param  array{first_name: string, last_name: string, email: string, phone: string, consent_email: bool, consent_sms: bool}  $input
     */
    public function create(Optician $optician, User $actor, array $input, Request $request): Client
    {
        $existing = $this->findDuplicate($input['email'], $input['phone']);
        if ($existing !== null) {
            $token = $this->issueAction($existing, $optician, self::TYPE_DUPLICATE, $input);
            $this->audit->record($actor, 'client.duplicate_detected', $request, [
                'client_uuid' => $existing->uuid,
            ]);

            throw new ClientDuplicateException(
                $existing,
                $token,
                $existing->opticians()->where('opticians.id', $optician->id)->exists(),
            );
        }

        return DB::transaction(function () use ($optician, $actor, $input, $request): Client {
            $user = new User;
            $user->first_name = $input['first_name'];
            $user->last_name = $input['last_name'];
            $user->email = strtolower($input['email']);
            $user->phone = $input['phone'];
            $user->role = Role::Client;
            $user->save();

            $client = Client::query()->create([
                'user_id' => $user->id,
                'first_name' => $input['first_name'],
                'last_name' => $input['last_name'],
                'email' => strtolower($input['email']),
                'phone' => $input['phone'],
                'consent_email' => (bool) $input['consent_email'],
                'consent_sms' => (bool) $input['consent_sms'],
            ]);

            $optician->clients()->attach($client->id);
            $this->invitations->issue($user);
            $this->audit->record($actor, 'client.created', $request, [
                'client_uuid' => $client->uuid,
            ]);

            return $client->load('user');
        });
    }

    public function confirmDuplicate(Optician $optician, User $actor, string $plainToken, Request $request): Client
    {
        $action = $this->usableAction($plainToken, $optician, self::TYPE_DUPLICATE);
        $client = $action->client;
        if (! $client->opticians()->where('opticians.id', $optician->id)->exists()) {
            $optician->clients()->attach($client->id);
        }
        $action->update(['consumed_at' => now()]);
        $this->audit->record($actor, 'client.attached', $request, [
            'client_uuid' => $client->uuid,
        ]);

        return $client->load('user');
    }

    /**
     * @param  array{first_name: string, last_name: string, email: string, phone: string, consent_email: bool, consent_sms: bool}  $input
     */
    public function updateFromDuplicate(Optician $optician, User $actor, string $plainToken, array $input, Request $request): Client|IdentityChallenge
    {
        $action = $this->usableAction($plainToken, $optician, self::TYPE_DUPLICATE);
        $client = $action->client;
        $this->assertEmailAvailable($input['email'], $client);

        $challenge = $this->maybeChallengeIdentity($client, $optician, $input);
        if ($challenge !== null) {
            $action->update(['consumed_at' => now()]);
            $this->audit->record($actor, 'client.identity_otp', $request, [
                'client_uuid' => $client->uuid,
                'channel' => $challenge->otpChannel,
            ]);

            return $challenge;
        }

        $this->persistProfile($client, $input);
        if (! $client->opticians()->where('opticians.id', $optician->id)->exists()) {
            $optician->clients()->attach($client->id);
        }
        $action->update(['consumed_at' => now()]);
        $this->audit->record($actor, 'client.updated', $request, [
            'client_uuid' => $client->uuid,
        ]);

        return $client->fresh()->load('user');
    }

    /**
     * @param  array{first_name: string, last_name: string, email: string, phone: string, consent_email: bool, consent_sms: bool}  $input
     */
    public function update(Optician $optician, User $actor, Client $client, array $input, Request $request): Client|IdentityChallenge
    {
        $this->assertEmailAvailable($input['email'], $client);

        $challenge = $this->maybeChallengeIdentity($client, $optician, $input);
        if ($challenge !== null) {
            $this->audit->record($actor, 'client.identity_otp', $request, [
                'client_uuid' => $client->uuid,
                'channel' => $challenge->otpChannel,
            ]);

            return $challenge;
        }

        $this->persistProfile($client, $input);
        $this->audit->record($actor, 'client.updated', $request, [
            'client_uuid' => $client->uuid,
        ]);

        return $client->fresh()->load('user');
    }

    public function verifyIdentity(Optician $optician, User $actor, string $plainToken, string $code, Request $request): Client|IdentityChallenge
    {
        $action = $this->usableAction($plainToken, $optician, self::TYPE_IDENTITY);
        $action->increment('otp_attempts');
        if ($action->otp_attempts > 5) {
            $action->update(['consumed_at' => now()]);

            throw ValidationException::withMessages([
                'code' => 'Trop de tentatives. Relancez la mise à jour.',
            ]);
        }

        if ($action->otp_hash === null || ! Hash::check($code, $action->otp_hash)) {
            throw ValidationException::withMessages([
                'code' => 'Code incorrect.',
            ]);
        }

        $payload = $action->payload ?? [];
        $client = $action->client;
        $channel = $action->otp_channel;
        $verified = $payload['verified'] ?? [];

        if ($channel === 'email') {
            $verified['email'] = true;
        }
        if ($channel === 'sms') {
            $verified['phone'] = true;
        }

        $payload['verified'] = $verified;
        $emailChanged = strtolower($payload['email']) !== strtolower($client->email);
        $phoneChanged = Phone::digits($payload['phone']) !== Phone::digits($client->phone);

        $needEmail = $emailChanged && empty($verified['email']);
        $needPhone = $phoneChanged && empty($verified['phone']);

        if ($needEmail || $needPhone) {
            $nextChannel = $needEmail ? 'email' : 'sms';
            $this->sendOtp($action, $payload, $nextChannel);
            $action->forceFill([
                'payload' => $payload,
                'otp_attempts' => 0,
            ])->save();
            $this->audit->record($actor, 'client.identity_otp', $request, [
                'client_uuid' => $client->uuid,
                'channel' => $nextChannel,
            ]);

            return new IdentityChallenge($plainToken, $nextChannel);
        }

        $this->persistProfile($client, $payload);
        if (! $client->opticians()->where('opticians.id', $optician->id)->exists()) {
            $optician->clients()->attach($client->id);
        }
        $action->update(['consumed_at' => now()]);
        $this->audit->record($actor, 'client.updated', $request, [
            'client_uuid' => $client->uuid,
        ]);

        return $client->fresh()->load('user');
    }

    public function resendIdentityOtp(Optician $optician, User $actor, string $plainToken, Request $request): IdentityChallenge
    {
        $action = $this->usableAction($plainToken, $optician, self::TYPE_IDENTITY);
        if ($action->otp_channel === null) {
            throw ValidationException::withMessages([
                'code' => 'Aucun code à renvoyer.',
            ]);
        }
        $this->sendOtp($action, $action->payload ?? [], $action->otp_channel);
        $action->update(['otp_attempts' => 0]);
        $this->audit->record($actor, 'client.identity_otp_resend', $request, [
            'client_uuid' => $action->client->uuid,
            'channel' => $action->otp_channel,
        ]);

        return new IdentityChallenge($plainToken, $action->otp_channel);
    }

    public function unlink(Optician $optician, User $actor, Client $client, Request $request): void
    {
        $optician->clients()->detach($client->id);
        $this->audit->record($actor, 'client.unlinked', $request, [
            'client_uuid' => $client->uuid,
        ]);
    }

    public function findInShop(Optician $optician, string $uuid): ?Client
    {
        return Client::query()
            ->where('uuid', $uuid)
            ->whereHas('opticians', fn ($query) => $query->where('opticians.id', $optician->id))
            ->with('user')
            ->withCount([
                'pairs',
                'pairs as pairs_lost_count' => fn ($query) => $query->where('status', 'perdue'),
            ])
            ->first();
    }

    /**
     * @param  array{email: string, phone: string}  $input
     */
    private function findDuplicate(string $email, string $phone): ?Client
    {
        $byEmail = Client::query()
            ->whereRaw('LOWER(email) = ?', [strtolower($email)])
            ->first();
        if ($byEmail !== null) {
            return $byEmail;
        }

        $digits = Phone::digits($phone);
        if ($digits === null) {
            return null;
        }

        return Client::query()
            ->where(function ($query) use ($phone, $digits): void {
                $query->where('phone', $phone)->orWhere('phone', $digits);
            })
            ->first();
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function issueAction(Client $client, Optician $optician, string $type, array $payload): string
    {
        $plain = SecureToken::plain();
        ClientAction::query()->create([
            'token_hash' => SecureToken::hash($plain),
            'client_id' => $client->id,
            'optician_id' => $optician->id,
            'type' => $type,
            'payload' => $payload,
            'expires_at' => now()->addMinutes(self::ACTION_TTL_MINUTES),
        ]);

        return $plain;
    }

    private function usableAction(string $plain, Optician $optician, string $type): ClientAction
    {
        $action = ClientAction::query()
            ->where('token_hash', SecureToken::hash($plain))
            ->where('optician_id', $optician->id)
            ->where('type', $type)
            ->first();

        if ($action === null || ! $action->isUsable()) {
            abort(404, 'Ressource introuvable.');
        }

        return $action;
    }

    /**
     * @param  array{first_name: string, last_name: string, email: string, phone: string, consent_email: bool, consent_sms: bool}  $input
     */
    private function maybeChallengeIdentity(Client $client, Optician $optician, array $input): ?IdentityChallenge
    {
        $emailChanged = strtolower($input['email']) !== strtolower($client->email);
        $phoneChanged = Phone::digits($input['phone']) !== Phone::digits($client->phone);
        if (! $emailChanged && ! $phoneChanged) {
            return null;
        }

        $channel = $emailChanged ? 'email' : 'sms';
        $plain = SecureToken::plain();
        $action = ClientAction::query()->create([
            'token_hash' => SecureToken::hash($plain),
            'client_id' => $client->id,
            'optician_id' => $optician->id,
            'type' => self::TYPE_IDENTITY,
            'payload' => $input,
            'expires_at' => now()->addMinutes(self::OTP_TTL_MINUTES),
        ]);
        $this->sendOtp($action, $input, $channel);

        return new IdentityChallenge($plain, $channel);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function sendOtp(ClientAction $action, array $payload, string $channel): void
    {
        $code = SecureToken::otp();
        $action->forceFill([
            'otp_hash' => Hash::make($code),
            'otp_channel' => $channel,
            'expires_at' => now()->addMinutes(self::OTP_TTL_MINUTES),
        ])->save();

        $recipient = $channel === 'email'
            ? strtolower((string) $payload['email'])
            : (string) $payload['phone'];

        if ($channel === 'email') {
            $this->notifications->sendEmail($recipient, 'identity_otp', new IdentityOtpMail($code, 'email'));

            return;
        }

        $this->notifications->sendSms($recipient, 'identity_otp', function () use ($code): void {
            Mail::to(config('mail.from.address'))->send(new IdentityOtpMail($code, 'sms'));
        });
    }

    /**
     * @param  array{first_name: string, last_name: string, email: string, phone: string, consent_email: bool, consent_sms: bool}  $input
     */
    private function persistProfile(Client $client, array $input): void
    {
        $client->forceFill([
            'first_name' => $input['first_name'],
            'last_name' => $input['last_name'],
            'email' => strtolower($input['email']),
            'phone' => $input['phone'],
            'consent_email' => (bool) $input['consent_email'],
            'consent_sms' => (bool) $input['consent_sms'],
        ])->save();

        $user = $client->user;
        $user->forceFill([
            'first_name' => $input['first_name'],
            'last_name' => $input['last_name'],
            'email' => strtolower($input['email']),
            'phone' => $input['phone'],
        ])->save();
    }

    private function assertEmailAvailable(string $email, Client $current): void
    {
        $taken = User::query()
            ->whereRaw('LOWER(email) = ?', [strtolower($email)])
            ->where('id', '!=', $current->user_id)
            ->exists();

        if ($taken) {
            throw ValidationException::withMessages([
                'email' => 'Cette adresse e-mail est déjà utilisée.',
            ]);
        }
    }
}
