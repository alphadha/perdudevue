<?php

namespace App\Services;

use App\Enums\Role;
use App\Models\Optician;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OpticianAdminService
{
    public function __construct(
        private readonly InvitationService $invitations,
        private readonly AuditService $audit,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     * @return array{optician: Optician, user: User, invitation_token: string}
     */
    public function create(array $payload, User $actor, Request $request): array
    {
        return DB::transaction(function () use ($payload, $actor, $request) {
            $optician = Optician::query()->create([
                'name' => $payload['name'],
                'siret' => $payload['siret'] ?? null,
                'address' => $payload['address'] ?? null,
                'city' => $payload['city'] ?? null,
                'postal_code' => $payload['postal_code'] ?? null,
                'phone' => $payload['phone'] ?? null,
                'email' => $payload['email'],
                'network_id' => $payload['network_id'] ?? null,
                'billing_email' => $payload['billing_email'] ?? null,
                'billing_iban' => $payload['billing_iban'] ?? null,
                'qonto_id' => $payload['qonto_id'] ?? null,
            ]);

            $user = new User;
            $user->first_name = $payload['first_name'];
            $user->last_name = $payload['last_name'];
            $user->email = $payload['email'];
            $user->phone = $payload['phone'] ?? null;
            $user->role = Role::OpticienAdmin;
            $user->save();

            $optician->users()->attach($user->id);
            $token = $this->invitations->issue($user);
            $this->audit->record($actor, 'optician_created', $request, [
                'optician_uuid' => $optician->uuid,
            ]);

            return [
                'optician' => $optician,
                'user' => $user,
                'invitation_token' => $token,
            ];
        });
    }
}
