<?php

namespace App\Http\Controllers\Api\Opticien;

use App\Http\Controllers\Controller;
use App\Http\Requests\Opticien\ChangeEmailRequest;
use App\Http\Requests\Opticien\ChangePasswordRequest;
use App\Http\Resources\UserResource;
use App\Services\AccountService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    public function __construct(private readonly AccountService $accounts) {}

    public function password(ChangePasswordRequest $request): JsonResponse
    {
        $this->accounts->changePassword(
            $request->user(),
            $request->string('current_password')->toString(),
            $request->string('password')->toString(),
            $request,
        );

        return ApiResponse::success(UserResource::make($request->user()->fresh())->resolve());
    }

    public function email(ChangeEmailRequest $request): JsonResponse
    {
        $user = $this->accounts->changeEmail(
            $request->user(),
            $request->string('current_password')->toString(),
            $request->string('email')->toString(),
            $request,
        );

        return ApiResponse::success(UserResource::make($user)->resolve());
    }

    public function destroy(Request $request): JsonResponse
    {
        $this->accounts->deleteOwn($request->user(), $request);

        return ApiResponse::success(null);
    }
}
