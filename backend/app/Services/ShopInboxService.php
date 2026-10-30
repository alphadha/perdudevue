<?php

namespace App\Services;

use App\Models\Optician;
use App\Models\Pair;
use App\Models\Shipment;
use App\Models\ShopNotification;
use Illuminate\Support\Collection;

class ShopInboxService
{
    public const TYPE_WAITING_PICKUP = 'waiting_pickup';

    public const TYPE_SHIPPING_LABEL = 'shipping_label';

    public const TYPE_REMOTE_DELIVERY = 'remote_delivery';

    public function notifyWaitingPickup(Optician $shop, Pair $pair): ShopNotification
    {
        $pair->loadMissing(['client.opticians']);
        $client = $pair->client;
        $known = $client !== null && $client->opticians->contains('id', $shop->id);

        $title = 'Lunettes en attente de retrait';
        $body = $known && $client !== null
            ? $pair->title().' de '.$client->first_name.' '.$client->last_name.' sont à remettre en magasin.'
            : 'Une paire de lunettes est en attente de retrait dans votre magasin.';

        return ShopNotification::query()->create([
            'optician_id' => $shop->id,
            'pair_id' => $pair->id,
            'type' => self::TYPE_WAITING_PICKUP,
            'title' => $title,
            'body' => $body,
            'href' => '/opticien/restitution',
        ]);
    }

    public function notifyRemoteDelivery(Optician $shop, Pair $pair, Shipment $shipment): ShopNotification
    {
        $name = $shipment->recipientName();

        return ShopNotification::query()->create([
            'optician_id' => $shop->id,
            'pair_id' => $pair->id,
            'type' => self::TYPE_REMOTE_DELIVERY,
            'title' => 'Nouvel envoi à distance demandé',
            'body' => 'Les lunettes '.$pair->type.' de '.$name.' ont été retrouvées. Le client a demandé leur restitution à distance via « '.$shipment->carrier.' ».',
            'href' => '/opticien/restitution',
        ]);
    }

    public function notifyShippingLabel(Optician $shop, Pair $pair, Shipment $shipment): ShopNotification
    {
        return ShopNotification::query()->create([
            'optician_id' => $shop->id,
            'pair_id' => $pair->id,
            'type' => self::TYPE_SHIPPING_LABEL,
            'title' => 'Nouvelle étiquette d’expédition disponible',
            'body' => 'L’étiquette d’expédition pour le retour à distance des lunettes '.$pair->type.' de '.$shipment->recipientName().' a été générée.',
            'href' => '/opticien/restitution',
        ]);
    }

    public function listForShop(Optician $shop, string $filter = 'all'): Collection
    {
        $query = ShopNotification::query()
            ->where('optician_id', $shop->id)
            ->orderByDesc('id');

        if ($filter === 'unread') {
            $query->whereNull('read_at');
        }
        if ($filter === 'read') {
            $query->whereNotNull('read_at');
        }

        return $query->get();
    }

    public function unreadCount(Optician $shop): int
    {
        return ShopNotification::query()
            ->where('optician_id', $shop->id)
            ->whereNull('read_at')
            ->count();
    }

    public function findForShop(Optician $shop, string $uuid): ?ShopNotification
    {
        return ShopNotification::query()
            ->where('optician_id', $shop->id)
            ->where('uuid', $uuid)
            ->first();
    }

    public function markRead(ShopNotification $notification): ShopNotification
    {
        if ($notification->read_at === null) {
            $notification->read_at = now();
            $notification->save();
        }

        return $notification->fresh();
    }

    public function markAllRead(Optician $shop): void
    {
        ShopNotification::query()
            ->where('optician_id', $shop->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }

    public function deleteAll(Optician $shop): void
    {
        ShopNotification::query()
            ->where('optician_id', $shop->id)
            ->delete();
    }
}
