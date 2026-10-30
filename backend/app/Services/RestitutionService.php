<?php

namespace App\Services;

use App\Enums\PairStatus;
use App\Mail\PairFoundMail;
use App\Models\Optician;
use App\Models\Pair;
use App\Models\PairEvent;
use App\Models\PublicRestitutionToken;
use App\Models\User;
use App\Support\AssignedCode;
use App\Support\PickupCode;
use App\Support\SecureToken;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RestitutionService
{
    public const PUBLIC_TTL_DAYS = 30;

    public function __construct(
        private readonly AuditService $audit,
        private readonly NotificationService $notifications,
        private readonly ShopInboxService $inbox,
    ) {}

    public function identifyByAssignedCode(string $code): Pair
    {
        $pair = $this->findByAssignedCode($code);
        $this->assertCanBeFound($pair);

        return $pair;
    }

    public function confirmFound(Optician $shop, User $actor, string $assignedCode, Request $request): Pair
    {
        $pair = $this->identifyByAssignedCode($assignedCode);

        return DB::transaction(function () use ($pair, $shop, $actor, $request): Pair {
            $pair->depositary_optician_id = $shop->id;
            $pair->status = PairStatus::ARecuperer;
            $pair->pickup_code = PickupCode::generateUnique();
            $pair->restitution_ref = $this->nextReference();
            $pair->found_at = now();
            $pair->save();

            $this->recordEvent($pair, 'found');
            $plainToken = $this->issuePublicToken($pair, expirePrevious: true);
            $fresh = $pair->fresh(['client.opticians', 'depositaryOptician']);
            $this->notifyOwner($fresh, $plainToken, ['email']);
            $this->inbox->notifyWaitingPickup($shop, $fresh);
            $this->audit->record($actor, 'pair.found', $request, [
                'pair_uuid' => $pair->uuid,
                'depositary_optician_id' => $shop->id,
            ]);

            return $pair->fresh()->load(['client.opticians', 'events']);
        });
    }

    public function lookupByPickupCode(Optician $shop, string $code): Pair
    {
        $normalized = PickupCode::normalize($code);
        $pair = Pair::query()
            ->depositedAt($shop->id)
            ->where('pickup_code', $normalized)
            ->with(['client.opticians', 'shipments'])
            ->first();

        if ($pair === null) {
            throw ValidationException::withMessages([
                'pickup_code' => 'Le code renseigné ne correspond à aucune paire. Vérifiez votre saisie.',
            ]);
        }

        return $pair;
    }

    public function handOver(Optician $shop, User $actor, string $pickupCode, Request $request): Pair
    {
        $pair = $this->lookupByPickupCode($shop, $pickupCode);
        if ($pair->status !== PairStatus::ARecuperer) {
            throw ValidationException::withMessages([
                'pickup_code' => 'Cette paire ne peut pas être remise en magasin pour le moment.',
            ]);
        }

        return DB::transaction(function () use ($pair, $actor, $request): Pair {
            $pair->status = PairStatus::Active;
            $pair->depositary_optician_id = null;
            $pair->save();
            $this->expirePublicTokens($pair);
            $this->recordEvent($pair, 'returned');
            $this->audit->record($actor, 'pair.returned', $request, [
                'pair_uuid' => $pair->uuid,
            ]);

            return $pair->fresh()->load(['client.opticians', 'events']);
        });
    }

    /**
     * @param  list<string>  $channels
     */
    public function resendPickup(Optician $shop, User $actor, Pair $pair, array $channels, Request $request): void
    {
        if ($pair->depositary_optician_id !== $shop->id || $pair->status !== PairStatus::ARecuperer) {
            throw ValidationException::withMessages([
                'uuid' => 'Dossier introuvable.',
            ]);
        }

        $token = $this->issuePublicToken($pair, expirePrevious: false);
        $this->notifyOwner($pair->load(['client', 'depositaryOptician']), $token, $channels);
        $this->audit->record($actor, 'pair.pickup_resent', $request, [
            'pair_uuid' => $pair->uuid,
            'channels' => $channels,
        ]);
    }

    /**
     * @param  list<string>  $channels
     */
    public function resendForOwner(User $actor, Pair $pair, array $channels, Request $request): void
    {
        if ($pair->status !== PairStatus::ARecuperer) {
            throw ValidationException::withMessages([
                'uuid' => 'Dossier introuvable.',
            ]);
        }

        $client = $pair->client;
        if (in_array('sms', $channels, true) && ! $client?->consent_sms) {
            throw ValidationException::withMessages([
                'channels' => 'Vous n’avez pas activé les notifications SMS.',
            ]);
        }
        if (in_array('email', $channels, true) && ! $client?->consent_email) {
            throw ValidationException::withMessages([
                'channels' => 'Vous n’avez pas activé les notifications par email.',
            ]);
        }

        $token = $this->issuePublicToken($pair, expirePrevious: false);
        $this->notifyOwner($pair->load(['client', 'depositaryOptician']), $token, $channels);
        $this->audit->record($actor, 'pair.pickup_resent', $request, [
            'pair_uuid' => $pair->uuid,
            'channels' => $channels,
        ]);
    }

    public function listDeposits(Optician $shop, ?string $status = null): Collection
    {
        $query = Pair::query()
            ->depositedAt($shop->id)
            ->with(['client.opticians', 'shipments'])
            ->orderByDesc('found_at');

        if ($status !== null) {
            $query->where('status', $status);
        }

        return $query->get();
    }

    public function waitingPickup(Optician $shop, int $limit = 5): Collection
    {
        return Pair::query()
            ->depositedAt($shop->id)
            ->whereIn('status', [
                PairStatus::ARecuperer->value,
                PairStatus::LivraisonDemandee->value,
            ])
            ->with(['client.opticians', 'shipments'])
            ->orderByRaw("CASE status WHEN ? THEN 0 WHEN ? THEN 1 ELSE 2 END", [
                PairStatus::ARecuperer->value,
                PairStatus::LivraisonDemandee->value,
            ])
            ->orderByDesc('found_at')
            ->limit($limit)
            ->get();
    }

    public function findDeposit(Optician $shop, string $uuid): ?Pair
    {
        return Pair::query()
            ->depositedAt($shop->id)
            ->where('uuid', $uuid)
            ->with(['client.opticians', 'shipments'])
            ->first();
    }

    private function findByAssignedCode(string $code): Pair
    {
        $normalized = AssignedCode::normalize($code);
        $pair = Pair::query()
            ->where('assigned_code', $normalized)
            ->where('status', '!=', PairStatus::Archivee)
            ->first();

        if ($pair === null) {
            throw ValidationException::withMessages([
                'assigned_code' => 'Le code renseigné ne correspond à aucune paire. Vérifiez votre saisie.',
            ]);
        }

        return $pair;
    }

    private function assertCanBeFound(Pair $pair): void
    {
        if ($pair->status === PairStatus::Inactive) {
            throw ValidationException::withMessages([
                'assigned_code' => 'Cette paire ne peut pas être signalée comme retrouvée.',
            ]);
        }

        if ($pair->status->isOpenRestitution()) {
            throw ValidationException::withMessages([
                'assigned_code' => 'Cette paire a déjà un dossier de restitution en cours.',
            ]);
        }

        if (! $pair->status->allowsLostOrFound()) {
            throw ValidationException::withMessages([
                'assigned_code' => 'Cette paire ne peut pas être signalée comme retrouvée.',
            ]);
        }
    }

    private function nextReference(): string
    {
        $year = now()->year;
        $prefix = 'R-'.$year.'-';
        $last = Pair::query()
            ->where('restitution_ref', 'like', $prefix.'%')
            ->orderByDesc('restitution_ref')
            ->value('restitution_ref');

        $seq = 1;
        if (is_string($last)) {
            $seq = ((int) substr($last, strlen($prefix))) + 1;
        }

        return sprintf('R-%d-%04d', $year, $seq);
    }

    private function issuePublicToken(Pair $pair, bool $expirePrevious = true): string
    {
        if ($expirePrevious) {
            $this->expirePublicTokens($pair);
        }
        $plain = SecureToken::plain();
        PublicRestitutionToken::query()->create([
            'pair_id' => $pair->id,
            'token_hash' => SecureToken::hash($plain),
            'expires_at' => now()->addDays(self::PUBLIC_TTL_DAYS),
        ]);

        return $plain;
    }

    private function expirePublicTokens(Pair $pair): void
    {
        PublicRestitutionToken::query()
            ->where('pair_id', $pair->id)
            ->where(function ($query) {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->update(['expires_at' => now()->subSecond()]);
    }

    /**
     * @param  list<string>  $channels
     */
    private function notifyOwner(Pair $pair, string $plainToken, array $channels): void
    {
        $client = $pair->client;
        $shop = $pair->depositaryOptician;
        if ($client === null || $shop === null) {
            return;
        }

        $publicUrl = rtrim((string) config('app.frontend_url'), '/').'/r/'.$plainToken;
        $channels = $channels === [] ? ['email'] : $channels;

        if (in_array('email', $channels, true) && $client->consent_email) {
            $this->notifications->sendEmail(
                $client->email,
                'pair_found',
                new PairFoundMail(
                    $client->first_name,
                    (string) $pair->pickup_code,
                    $publicUrl,
                    $shop,
                ),
            );
        }

        if (in_array('sms', $channels, true) && $client->consent_sms && $client->phone) {
            $this->notifications->sendSms($client->phone, 'pair_found');
        }
    }

    private function recordEvent(Pair $pair, string $type): void
    {
        PairEvent::query()->create([
            'pair_id' => $pair->id,
            'type' => $type,
        ]);
    }
}
