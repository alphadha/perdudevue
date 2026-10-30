<?php

namespace App\Http\Resources;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $optician = $this->primaryOptician();

        return [
            'uuid' => $this->uuid,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'email' => $this->email,
            'role' => $this->role->value,
            'home' => $this->role->homePath(),
            'cgu_accepted_at' => $this->cgu_accepted_at?->toIso8601String(),
            'optician' => $optician === null ? null : [
                'uuid' => $optician->uuid,
                'name' => $optician->name,
            ],
        ];
    }
}
