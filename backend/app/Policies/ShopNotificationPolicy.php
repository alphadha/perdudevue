<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\ShopNotification;
use App\Models\User;

class ShopNotificationPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->isStaff($user);
    }

    public function view(User $user, ShopNotification $notification): bool
    {
        return $this->owns($user, $notification);
    }

    public function update(User $user, ShopNotification $notification): bool
    {
        return $this->owns($user, $notification);
    }

    public function delete(User $user, ShopNotification $notification): bool
    {
        return $this->owns($user, $notification);
    }

    private function isStaff(User $user): bool
    {
        return in_array($user->role, [Role::OpticienAdmin, Role::OpticienUser], true)
            && $user->primaryOptician() !== null;
    }

    private function owns(User $user, ShopNotification $notification): bool
    {
        $shop = $user->primaryOptician();

        return $this->isStaff($user) && $shop !== null && $notification->optician_id === $shop->id;
    }
}
