<?php

namespace App\Http\Resources;

use App\Models\Client;
use App\Models\Optician;
use App\Models\Shipment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Pair */
class RestitutionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $shop = $request->user()?->primaryOptician();

        return [
            'uuid' => $this->uuid,
            'reference' => $this->restitution_ref,
            'title' => $this->title(),
            'type' => $this->type,
            'type_label' => $this->typeLabel(),
            'brand' => $this->brand,
            'colors' => $this->colors ?? [],
            'assigned_code' => $this->assigned_code,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'found_at' => $this->found_at?->toIso8601String(),
            'registered_at' => $this->registered_at?->toIso8601String(),
            'client' => $this->visibleClient($shop),
            'shipment' => $this->visibleShipment($shop),
            'events' => $this->whenLoaded('events', fn () => $this->events->map(fn ($event) => [
                'type' => $event->type,
                'label' => match ($event->type) {
                    'registered' => 'Paire enregistrée',
                    'engraved' => 'Paire indiquée comme gravée',
                    'inactivated' => 'Paire déclarée comme inactive',
                    'lost' => 'Paire signalée comme perdue',
                    'found' => 'Paire retrouvée, le client a été notifié',
                    'returned' => 'Paire restituée au client',
                    'delivery_requested' => 'Livraison demandée par le client',
                    'shipped' => 'Colis déposé, le client a été notifié',
                    default => $event->type,
                },
                'at' => $event->created_at?->toIso8601String(),
            ])->values()),
            'actions' => [
                'can_hand_over' => $this->status === \App\Enums\PairStatus::ARecuperer,
                'can_resend' => $this->status === \App\Enums\PairStatus::ARecuperer,
                'can_download_label' => $this->status === \App\Enums\PairStatus::LivraisonDemandee
                    || $this->status === \App\Enums\PairStatus::EnLivraison,
                'can_mark_shipped' => $this->status === \App\Enums\PairStatus::LivraisonDemandee,
                'can_select_for_labels' => $this->status === \App\Enums\PairStatus::LivraisonDemandee,
            ],
        ];
    }

    /**
     * @return array{uuid: string, first_name: string, last_name: string, email?: string, phone?: string|null}|null
     */
    private function visibleClient(?Optician $shop): ?array
    {
        $client = $this->client;
        if ($shop === null || $client === null || ! $this->clientBelongsToShop($client, $shop)) {
            return null;
        }

        $payload = [
            'uuid' => $client->uuid,
            'first_name' => $client->first_name,
            'last_name' => $client->last_name,
        ];
        if ($this->relationLoaded('events')) {
            $payload['email'] = $client->email;
            $payload['phone'] = $client->phone;
        }

        return $payload;
    }

    private function clientBelongsToShop(Client $client, Optician $shop): bool
    {
        if ($client->relationLoaded('opticians')) {
            return $client->opticians->contains('id', $shop->id);
        }

        return $client->opticians()->where('opticians.id', $shop->id)->exists();
    }

    /**
     * @return array<string, mixed>|null
     */
    private function visibleShipment(?Optician $shop): ?array
    {
        if ($shop === null || $this->depositary_optician_id !== $shop->id) {
            return null;
        }
        $shipment = $this->relationLoaded('shipments')
            ? $this->shipments->first(fn (Shipment $item) => $item->isPaid())
            : $this->shipments()->whereIn('status', ['paid', 'in_transit'])->latest('id')->first();
        if ($shipment === null) {
            return null;
        }

        return [
            'uuid' => $shipment->uuid,
            'status' => $shipment->status,
            'mode' => $shipment->mode,
            'carrier' => $shipment->carrier,
            'label' => ShippingLabelResource::make($shipment)->resolve(),
        ];
    }
}
