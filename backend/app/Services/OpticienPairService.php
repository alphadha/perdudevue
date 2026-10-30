<?php

namespace App\Services;

use App\Enums\PairStatus;
use App\Models\Client;
use App\Models\Optician;
use App\Models\Pair;
use App\Models\PairEvent;
use App\Models\User;
use App\Support\AssignedCode;
use App\Support\PairCatalog;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OpticienPairService
{
    public function __construct(
        private readonly AuditService $audit,
        private readonly CodeLotService $codeLots,
    ) {}

    /**
     * @param  array<string, mixed>  $input
     */
    public function create(Optician $optician, User $actor, array $input, Request $request): Pair
    {
        $client = Client::query()
            ->where('uuid', $input['client_uuid'])
            ->whereHas('opticians', fn ($query) => $query->where('opticians.id', $optician->id))
            ->first();

        if ($client === null) {
            throw ValidationException::withMessages([
                'client_uuid' => 'Sélectionnez un client de votre magasin.',
            ]);
        }

        $brand = $input['brand'] === PairCatalog::OTHER_BRAND
            ? trim((string) ($input['custom_brand'] ?? ''))
            : $input['brand'];

        $alreadyEngraved = (bool) $input['already_engraved'];
        $code = $alreadyEngraved
            ? AssignedCode::normalize((string) $input['assigned_code'])
            : AssignedCode::generateUnique();

        if ($alreadyEngraved && ! AssignedCode::isValid($code)) {
            throw ValidationException::withMessages([
                'assigned_code' => 'Le code assigné doit être au format FR suivi de 4 chiffres et 2 lettres (ex. '.AssignedCode::EXAMPLE.').',
            ]);
        }

        if ($alreadyEngraved && (
            Pair::query()->where('assigned_code', $code)->exists()
            || $this->codeLots->isAssigned($code)
        )) {
            throw ValidationException::withMessages([
                'assigned_code' => 'Ce code est déjà associé à une paire et ne peut pas être réutilisé.',
            ]);
        }

        $status = $alreadyEngraved ? PairStatus::Active : PairStatus::AGraver;

        return DB::transaction(function () use ($optician, $actor, $client, $input, $brand, $code, $status, $request): Pair {
            $pair = new Pair;
            $pair->fill([
                'client_id' => $client->id,
                'origin_optician_id' => $optician->id,
                'type' => $input['type'],
                'brand' => $brand,
                'colors' => $input['colors'],
                'description' => $input['description'] ?? null,
                'registered_at' => now(),
            ]);
            $pair->assigned_code = $code;
            $pair->status = $status;
            $pair->save();

            $this->recordEvent($pair, 'registered');
            $this->codeLots->markAssigned($code, $pair);
            $this->audit->record($actor, 'pair.created', $request, [
                'pair_uuid' => $pair->uuid,
                'status' => $status->value,
            ]);

            return $pair->load(['client', 'events']);
        });
    }

    public function engrave(User $actor, Pair $pair, Request $request): Pair
    {
        if ($pair->status !== PairStatus::AGraver) {
            throw ValidationException::withMessages([
                'status' => 'Seule une paire à graver peut être indiquée comme gravée.',
            ]);
        }

        $pair->status = PairStatus::Active;
        $pair->save();
        $this->recordEvent($pair, 'engraved');
        $this->audit->record($actor, 'pair.engraved', $request, [
            'pair_uuid' => $pair->uuid,
        ]);

        return $pair->fresh()->load(['client', 'events']);
    }

    public function inactivate(User $actor, Pair $pair, Request $request): Pair
    {
        if (! $pair->status->canInactivate()) {
            throw ValidationException::withMessages([
                'status' => 'Seule une paire active peut être déclarée inactive.',
            ]);
        }

        $pair->status = PairStatus::Inactive;
        $pair->save();
        $this->recordEvent($pair, 'inactivated');
        $this->audit->record($actor, 'pair.inactivated', $request, [
            'pair_uuid' => $pair->uuid,
        ]);

        return $pair->fresh()->load(['client', 'events']);
    }

    public function archive(User $actor, Pair $pair, Request $request): void
    {
        $code = $pair->assigned_code;
        $pair->status = PairStatus::Archivee;
        $pair->save();
        $this->recordEvent($pair, 'archived');
        $this->audit->record($actor, 'pair.archived', $request, [
            'pair_uuid' => $pair->uuid,
            'assigned_code_kept' => $code,
        ]);
    }

    public function findInShop(Optician $optician, string $uuid): ?Pair
    {
        return Pair::query()
            ->where('uuid', $uuid)
            ->where('origin_optician_id', $optician->id)
            ->where('status', '!=', PairStatus::Archivee)
            ->with(['client', 'events'])
            ->first();
    }

    public function listForShop(Optician $optician, ?string $clientUuid = null, ?string $status = null): Collection
    {
        $query = Pair::query()
            ->visibleToShop($optician->id)
            ->with('client')
            ->orderByDesc('registered_at');

        if ($clientUuid !== null) {
            $query->whereHas('client', fn ($inner) => $inner->where('uuid', $clientUuid));
        }
        if ($status !== null) {
            $query->where('status', $status);
        }

        return $query->get();
    }

    private function recordEvent(Pair $pair, string $type): void
    {
        PairEvent::query()->create([
            'pair_id' => $pair->id,
            'type' => $type,
        ]);
    }
}
