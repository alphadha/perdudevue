<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\VerifyOtpRequest;
use App\Services\PasswordResetService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class PasswordResetController extends Controller
{
    public function __construct(private readonly PasswordResetService $passwords) {}

    public function forgot(ForgotPasswordRequest $request): JsonResponse
    {
        $this->passwords->requestOtp($request->string('email')->toString());

        return ApiResponse::success([
            'message' => PasswordResetService::GENERIC_MESSAGE,
        ]);
    }

    public function verify(VerifyOtpRequest $request): JsonResponse
    {
        $ok = $this->passwords->verifyOtp(
            $request->string('email')->toString(),
            $request->string('code')->toString(),
        );

        if (! $ok) {
            return ApiResponse::message('Code invalide ou expiré.', 422);
        }

        return ApiResponse::success(['valid' => true]);
    }

    public function reset(ResetPasswordRequest $request): JsonResponse
    {
        $ok = $this->passwords->reset(
            $request->string('email')->toString(),
            $request->string('code')->toString(),
            $request->string('password')->toString(),
        );

        if (! $ok) {
            return ApiResponse::message('Code invalide ou expiré.', 422);
        }

        return ApiResponse::success([
            'message' => 'Mot de passe mis à jour. Vous pouvez vous connecter.',
        ]);
    }
}
