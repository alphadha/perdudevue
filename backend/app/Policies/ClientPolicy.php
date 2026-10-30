<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\Client;
use App\Models\User;

class ClientPolicy
{
    public function before(User $user, string $ability): ?bool
    {
        if ($user->role !== Role::AdminPdv) {
            return null;
        }

        return in_array($ability, ['viewAny', 'view'], true) ? true : null;
    }

    public function viewAny(User $user): bool
    {
        return $this->isStaff($user) && $user->primaryOptician() !== null;
    }

    public function view(User $user, Client $client): bool
    {
        return $this->belongsToShop($user, $client);
    }

    public function create(User $user): bool
    {
        return $this->viewAny($user);
    }

    public function update(User $user, Client $client): bool
    {
        return $this->belongsToShop($user, $client);
    }

    public function delete(User $user, Client $client): bool
    {
        return $this->belongsToShop($user, $client);
    }

    public function manageUsers(User $user): bool
    {
        return $user->role === Role::OpticienAdmin && $user->primaryOptician() !== null;
    }

    private function isStaff(User $user): bool
    {
        return in_array($user->role, [Role::OpticienAdmin, Role::OpticienUser], true);
    }

    private function belongsToShop(User $user, Client $client): bool
    {
        $optician = $user->primaryOptician();
        if ($optician === null || ! $this->isStaff($user)) {
            return false;
        }

        return $client->opticians()->where('opticians.id', $optician->id)->exists();
    }
}
