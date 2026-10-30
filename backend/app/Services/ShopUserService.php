<?php

namespace App\Services;

use App\Enums\Role;
use App\Models\Optician;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ShopUserService
{
    public function __construct(
        private readonly InvitationService $invitations,
        private readonly AuditService $audit,
    ) {}

    /**
     * @return \Illuminate\Support\Collection<int, User>
     */
    public function list(Optician $shop)
    {
        return $shop->users()
            ->whereIn('users.role', [Role::OpticienAdmin->value, Role::OpticienUser->value])
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();
    }

    /**
     * @param  array<string, mixed>  $input
     */
    public function invite(Optician $shop, User $actor, array $input, Request $request): User
    {
        $email = strtolower(trim((string) $input['email']));

        if (User::query()->whereRaw('LOWER(email) = ?', [$email])->exists()) {
            throw ValidationException::withMessages([
                'email' => 'Impossible d’inviter cet e-mail.',
            ]);
        }

        return DB::transaction(function () use ($shop, $actor, $input, $email, $request): User {
            $user = new User;
            $user->first_name = $input['first_name'];
            $user->last_name = $input['last_name'];
            $user->email = $email;
            $user->role = Role::OpticienUser;
            $user->save();
            $shop->users()->attach($user->id);
            $this->invitations->issue($user);
            $this->audit->record($actor, 'shop_user.invited', $request, [
                'user_uuid' => $user->uuid,
            ]);

            return $user->fresh();
        });
    }

    public function resend(Optician $shop, User $actor, string $uuid, Request $request): User
    {
        $user = $this->findInShop($shop, $uuid);
        if ($user === null || $user->role !== Role::OpticienUser || $user->hasPassword()) {
            abort(404);
        }

        $this->invitations->issue($user);
        $this->audit->record($actor, 'shop_user.invite_resent', $request, [
            'user_uuid' => $user->uuid,
        ]);

        return $user->fresh();
    }

    public function remove(Optician $shop, User $actor, string $uuid, Request $request): void
    {
        $user = $this->findInShop($shop, $uuid);
        if ($user === null || $user->role !== Role::OpticienUser) {
            abort(404);
        }

        $shop->users()->detach($user->id);
        $user->block();
        $this->audit->record($actor, 'shop_user.removed', $request, [
            'user_uuid' => $user->uuid,
        ]);
    }

    public function findInShop(Optician $shop, string $uuid): ?User
    {
        return $shop->users()
            ->where('users.uuid', $uuid)
            ->first();
    }
}
