<?php

namespace App\Services;

use App\Enums\PairStatus;
use App\Models\Client;
use App\Models\Pair;
use App\Models\PairEvent;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class ClientPairService
{
    public function __construct(private readonly AuditService $audit) {}

    public function listForOwner(Client $client): Collection
    {
        $visible = array_map(fn (PairStatus $status) => $status->value, PairStatus::clientListOrder());

        return Pair::query()
            ->where('client_id', $client->id)
            ->whereIn('status', $visible)
            ->with(['originOptician', 'depositaryOptician', 'events', 'shipments'])
            ->get()
            ->sortBy(fn (Pair $pair) => sprintf('%02d-%s', $pair->status->clientSortIndex(), $pair->registered_at?->timestamp ?? 0))
            ->values();
    }

    public function findForOwner(Client $client, string $uuid): ?Pair
    {
        $pair = Pair::query()
            ->where('uuid', $uuid)
            ->where('client_id', $client->id)
            ->with(['originOptician', 'depositaryOptician', 'events', 'shipments'])
            ->first();

        if ($pair === null || ! $pair->status->isVisibleToClient()) {
            return null;
        }

        return $pair;
    }

    public function declareLost(User $actor, Pair $pair, Request $request): Pair
    {
        if ($pair->status !== PairStatus::Active) {
            throw ValidationException::withMessages([
                'status' => 'Seule une paire active peut être déclarée perdue.',
            ]);
        }

        $pair->status = PairStatus::Perdue;
        $pair->save();
        $this->recordEvent($pair, 'lost');
        $this->audit->record($actor, 'pair.lost', $request, [
            'pair_uuid' => $pair->uuid,
        ]);

        return $pair->fresh()->load(['originOptician', 'depositaryOptician', 'events']);
    }

    public function cancelLost(User $actor, Pair $pair, Request $request): Pair
    {
        if ($pair->status !== PairStatus::Perdue) {
            throw ValidationException::withMessages([
                'status' => 'Seule une paire perdue peut revenir à Active.',
            ]);
        }

        $pair->status = PairStatus::Active;
        $pair->save();
        $this->recordEvent($pair, 'recovered');
        $this->audit->record($actor, 'pair.recovered', $request, [
            'pair_uuid' => $pair->uuid,
        ]);

        return $pair->fresh()->load(['originOptician', 'depositaryOptician', 'events']);
    }

    public function inactivate(User $actor, Pair $pair, Request $request): Pair
    {
        if (! $pair->status->canClientInactivate()) {
            throw ValidationException::withMessages([
                'status' => 'Cette paire ne peut pas être déclarée inactive.',
            ]);
        }

        $pair->status = PairStatus::Inactive;
        $pair->save();
        $this->recordEvent($pair, 'inactivated');
        $this->audit->record($actor, 'pair.inactivated', $request, [
            'pair_uuid' => $pair->uuid,
        ]);

        return $pair->fresh()->load(['originOptician', 'depositaryOptician', 'events']);
    }

    public function archive(User $actor, Pair $pair, Request $request): void
    {
        if ($pair->status !== PairStatus::Inactive) {
            throw ValidationException::withMessages([
                'status' => 'Seule une paire inactive peut être supprimée définitivement.',
            ]);
        }

        $code = $pair->assigned_code;
        $pair->status = PairStatus::Archivee;
        $pair->save();
        $this->recordEvent($pair, 'archived');
        $this->audit->record($actor, 'pair.archived', $request, [
            'pair_uuid' => $pair->uuid,
            'assigned_code_kept' => $code,
        ]);
    }

    private function recordEvent(Pair $pair, string $type): void
    {
        PairEvent::query()->create([
            'pair_id' => $pair->id,
            'type' => $type,
        ]);
    }
}
