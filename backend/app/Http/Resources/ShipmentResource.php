<?php

namespace App\Http\Resources;

use App\Models\Shipment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Shipment */
class ShipmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'status' => $this->status,
            'mode' => $this->mode,
            'carrier' => $this->carrier,
            'price_cents' => $this->price_cents,
            'destination' => $this->destinationSummary(),
            'label_ref' => $this->isPaid() ? $this->label_ref : null,
            'tracking_ref' => $this->status === 'in_transit' ? $this->tracking_ref : null,
            'checkout_url' => $this->when(
                $this->status === 'pending_payment' && filled($this->checkout_url),
                $this->checkout_url,
            ),
        ];
    }
}
