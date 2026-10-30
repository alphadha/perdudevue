<?php

namespace App\Policies;

use App\Enums\PairStatus;
use App\Enums\Role;
use App\Models\Pair;
use App\Models\User;

class PairPolicy
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

    public function view(User $user, Pair $pair): bool
    {
        return $this->ownsOrigin($user, $pair);
    }

    public function create(User $user): bool
    {
        return $this->viewAny($user);
    }

    public function update(User $user, Pair $pair): bool
    {
        return $this->ownsOrigin($user, $pair);
    }

    public function delete(User $user, Pair $pair): bool
    {
        return $this->ownsOrigin($user, $pair);
    }

    public function reportFound(User $user): bool
    {
        return $this->viewAny($user);
    }

    public function manageDeposit(User $user, Pair $pair): bool
    {
        $optician = $user->primaryOptician();

        return $optician !== null
            && $this->isStaff($user)
            && $pair->depositary_optician_id === $optician->id
            && $pair->status->isOpenRestitution();
    }

    public function viewOwnAny(User $user): bool
    {
        return $this->isOwner($user);
    }

    public function viewOwn(User $user, Pair $pair): bool
    {
        return $this->ownsPair($user, $pair);
    }

    public function declareLost(User $user, Pair $pair): bool
    {
        return $this->ownsPair($user, $pair);
    }

    public function cancelLost(User $user, Pair $pair): bool
    {
        return $this->ownsPair($user, $pair);
    }

    public function inactivateOwn(User $user, Pair $pair): bool
    {
        return $this->ownsPair($user, $pair);
    }

    public function archiveOwn(User $user, Pair $pair): bool
    {
        return $this->ownsPair($user, $pair);
    }

    public function resendOwnPickup(User $user, Pair $pair): bool
    {
        return $this->ownsPair($user, $pair) && $pair->status === PairStatus::ARecuperer;
    }

    public function requestDelivery(User $user, Pair $pair): bool
    {
        return $this->ownsPair($user, $pair) && $pair->status === PairStatus::ARecuperer;
    }

    public function payShipment(User $user, Pair $pair): bool
    {
        return $this->ownsPair($user, $pair) && $pair->status === PairStatus::ARecuperer;
    }

    public function markShipped(User $user, Pair $pair): bool
    {
        return $this->manageDeposit($user, $pair) && $pair->status === PairStatus::LivraisonDemandee;
    }

    public function downloadLabel(User $user, Pair $pair): bool
    {
        $optician = $user->primaryOptician();

        return $optician !== null
            && $this->isStaff($user)
            && $pair->depositary_optician_id === $optician->id
            && in_array($pair->status, [PairStatus::LivraisonDemandee, PairStatus::EnLivraison], true);
    }

    private function isOwner(User $user): bool
    {
        return $user->role === Role::Client && $user->clientProfile !== null;
    }

    private function ownsPair(User $user, Pair $pair): bool
    {
        return $this->isOwner($user)
            && $user->clientProfile?->id === $pair->client_id
            && $pair->status->isVisibleToClient();
    }

    private function isStaff(User $user): bool
    {
        return in_array($user->role, [Role::OpticienAdmin, Role::OpticienUser], true);
    }

    private function ownsOrigin(User $user, Pair $pair): bool
    {
        $optician = $user->primaryOptician();

        return $optician !== null
            && $this->isStaff($user)
            && $pair->origin_optician_id === $optician->id;
    }
}
