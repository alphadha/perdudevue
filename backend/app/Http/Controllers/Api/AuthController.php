<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuthService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $auth) {}

    public function login(LoginRequest $request): JsonResponse
    {
        $token = $this->auth->attempt(
            $request->string('email')->toString(),
            $request->string('password')->toString(),
            $request->string('space')->toString(),
            $request,
        );

        if ($token === null) {
            return ApiResponse::message('Identifiants incorrects.', 401);
        }

        $user = User::query()
            ->where('email', $request->string('email'))
            ->with('opticians')
            ->first();

        return ApiResponse::success([
            'token' => $token,
            'user' => UserResource::make($user)->resolve(),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return ApiResponse::success(UserResource::make($request->user())->resolve());
    }

    public function logout(Request $request): JsonResponse
    {
        $this->auth->logout($request->user(), $request);

        return ApiResponse::success(null);
    }
}
