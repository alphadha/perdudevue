<?php

namespace App\Http\Resources;

use App\Enums\PairStatus;
use App\Models\Pair;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Pair */
class PairResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $client = $this->client;
        $shopId = $request->user()?->primaryOptician()?->id;
        $isDepositary = $shopId !== null && $this->depositary_optician_id === $shopId;

        return [
            'uuid' => $this->uuid,
            'title' => $this->title(),
            'type' => $this->type,
            'brand' => $this->brand,
            'colors' => $this->colors ?? [],
            'description' => $this->description,
            'assigned_code' => $this->assigned_code,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'registered_at' => $this->registered_at?->toIso8601String(),
            'client' => $client === null ? null : [
                'uuid' => $client->uuid,
                'first_name' => $client->first_name,
                'last_name' => $client->last_name,
                'email' => $client->email,
                'phone' => $client->phone,
            ],
            'actions' => [
                'can_engrave' => $this->status === PairStatus::AGraver,
                'can_export_code' => $this->status === PairStatus::AGraver,
                'can_inactivate' => $this->status->canInactivate(),
                'can_archive' => $this->status !== PairStatus::Archivee,
                'can_hand_over' => $isDepositary && $this->status === PairStatus::ARecuperer,
                'can_resend_pickup' => $isDepositary && $this->status === PairStatus::ARecuperer,
                'can_download_label' => $isDepositary && in_array($this->status, [PairStatus::LivraisonDemandee, PairStatus::EnLivraison], true),
                'can_mark_shipped' => $isDepositary && $this->status === PairStatus::LivraisonDemandee,
                'can_select_for_labels' => $isDepositary && $this->status === PairStatus::LivraisonDemandee,
            ],
            'events' => $this->whenLoaded('events', fn () => $this->events->map(fn ($event) => [
                'type' => $event->type,
                'label' => match ($event->type) {
                    'registered' => 'Paire enregistrée',
                    'engraved' => 'Paire indiquée comme gravée',
                    'inactivated' => 'Paire déclarée comme inactive',
                    'found' => 'Paire signalée comme retrouvée',
                    'returned' => 'Paire restituée au client',
                    'delivery_requested' => 'Livraison demandée par le client.',
                    'shipped' => 'Livraison prise en compte.',
                    default => $event->type,
                },
                'at' => $event->created_at?->toIso8601String(),
            ])->values()),
        ];
    }
}
