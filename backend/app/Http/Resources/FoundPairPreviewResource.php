<?php

namespace App\Http\Resources;

use App\Models\Pair;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Pair */
class FoundPairPreviewResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'type' => $this->type,
            'type_label' => $this->typeLabel(),
            'brand' => $this->brand,
            'colors' => $this->colors ?? [],
            'assigned_code' => $this->assigned_code,
        ];
    }
}
