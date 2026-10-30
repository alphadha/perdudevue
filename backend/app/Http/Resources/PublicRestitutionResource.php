<?php

namespace App\Http\Resources;

use App\Models\Pair;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Pair */
class PublicRestitutionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $optician = $this->depositaryOptician ?? $this->originOptician;
        $mapsQuery = urlencode(trim(($optician?->address ?? '').' '.($optician?->postal_code ?? '').' '.($optician?->city ?? '')));

        return [
            'title' => 'Vos lunettes ont été retrouvées !',
            'pair' => [
                'type' => $this->type,
                'brand' => $this->brand,
                'colors' => $this->colors ?? [],
                'assigned_code' => $this->assigned_code,
                'registered_at' => $this->registered_at?->format('d/m/Y'),
            ],
            'pickup_code' => $this->pickup_code,
            'pickup_help' => 'Ce code est votre preuve de propriété. Présentez-le à l’opticien de retrait pour récupérer vos lunettes. Il sera vérifié lors de la remise.',
            'optician' => $optician === null ? null : [
                'name' => $optician->name,
                'address' => $optician->address,
                'city' => $optician->city,
                'postal_code' => $optician->postal_code,
                'phone' => $optician->phone,
                'maps_url' => 'https://www.google.com/maps/search/?api=1&query='.$mapsQuery,
                'waze_url' => 'https://waze.com/ul?q='.$mapsQuery,
            ],
        ];
    }
}
