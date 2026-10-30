<?php

namespace App\Http\Middleware;

use App\Enums\Role;
use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();
        if ($user === null) {
            return ApiResponse::message('Non authentifié.', 401);
        }

        $allowed = array_map(fn (string $role) => Role::from($role), $roles);
        if (! in_array($user->role, $allowed, true)) {
            return ApiResponse::message('Accès refusé.', 403);
        }

        return $next($request);
    }
}
