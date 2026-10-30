<?php

namespace App\Http\Resources;

use App\Enums\PairStatus;
use App\Models\Pair;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Pair */
class ClientPairResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $this->resource->makeVisible('pickup_code');
        $origin = $this->originOptician;
        $depositary = $this->depositaryOptician;
        $showPickup = $this->status === PairStatus::ARecuperer;

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
            'pickup_code' => $showPickup ? $this->pickup_code : null,
            'pickup_help' => $showPickup
                ? 'Ce code est votre preuve de propriété. Présentez-le à l’opticien de retrait pour récupérer vos lunettes. Il sera vérifié lors de la remise.'
                : null,
            'origin_shop' => $origin?->toClientShop(),
            'depositary_shop' => $depositary?->toClientShop(),
            'actions' => [
                'can_declare_lost' => $this->status === PairStatus::Active,
                'can_cancel_lost' => $this->status === PairStatus::Perdue,
                'can_inactivate' => $this->status->canClientInactivate(),
                'can_archive' => $this->status === PairStatus::Inactive,
                'can_recover' => $this->status === PairStatus::ARecuperer,
                'can_request_delivery' => $this->status === PairStatus::ARecuperer,
                'can_track_delivery' => in_array($this->status, [PairStatus::LivraisonDemandee, PairStatus::EnLivraison], true),
                'can_resend_pickup' => $this->status === PairStatus::ARecuperer,
            ],
            'shipment' => $this->visibleShipment(),
            'events' => $this->whenLoaded('events', fn () => $this->events->map(fn ($event) => [
                'type' => $event->type,
                'label' => match ($event->type) {
                    'registered' => 'Paire enregistrée',
                    'engraved' => 'Paire indiquée comme gravée',
                    'lost' => 'Paire signalée comme perdue',
                    'recovered' => 'Déclaration de perte annulée',
                    'found' => 'Paire retrouvée, le client a été notifié',
                    'returned' => 'Paire restituée au client',
                    'inactivated' => 'Paire déclarée comme inactive',
                    'archived' => 'Paire supprimée',
                    'delivery_requested' => 'Livraison demandée par le client.',
                    'shipped' => 'Livraison prise en compte.',
                    default => $event->type,
                },
                'at' => $event->created_at?->toIso8601String(),
            ])->values()),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function visibleShipment(): ?array
    {
        $shipment = $this->relationLoaded('shipments')
            ? $this->shipments->first(fn ($item) => $item->isPaid())
            : null;
        if ($shipment === null) {
            return null;
        }

        return ShipmentResource::make($shipment)->resolve();
    }
}
