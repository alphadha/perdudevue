<?php

namespace App\Policies;

use App\Enums\Role;
use App\Models\User;

class UserPolicy
{
    public function manageShopUsers(User $user): bool
    {
        return $user->role === Role::OpticienAdmin && $user->primaryOptician() !== null;
    }
}
