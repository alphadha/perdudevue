<?php

namespace App\Http\Resources;

use App\Models\Shipment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Shipment */
class ShippingLabelResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'recipient_name' => $this->recipientName(),
            'address_line' => $this->address_line,
            'postal_code' => $this->postal_code,
            'city' => $this->city,
            'relay_name' => $this->relay_name,
            'carrier' => $this->carrier,
            'label_ref' => $this->label_ref,
        ];
    }
}
