<?php

namespace App\Http\Resources;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
class ShopUserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $pending = ! $this->hasPassword();

        return [
            'uuid' => $this->uuid,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'email' => $this->email,
            'role' => $this->role->value,
            'role_label' => $this->role === Role::OpticienAdmin ? 'Administrateur magasin' : 'Utilisateur magasin',
            'status' => $pending ? 'invited' : 'active',
            'status_label' => $pending ? 'Invitation envoyée' : 'Actif',
            'actions' => [
                'can_resend' => $pending && $this->role === Role::OpticienUser,
                'can_remove' => $this->role === Role::OpticienUser,
            ],
        ];
    }
}
