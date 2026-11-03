<?php

namespace App\Http\Controllers\Api\Opticien;

use App\Http\Controllers\Controller;
use App\Http\Requests\Opticien\ChangeEmailRequest;
use App\Http\Requests\Opticien\ChangePasswordRequest;
use App\Http\Requests\Opticien\ResendEmailOtpRequest;
use App\Http\Requests\Opticien\VerifyEmailOtpRequest;
use App\Http\Resources\UserResource;
use App\Services\AccountService;
use App\Support\ApiResponse;
use App\Support\IdentityChallenge;
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
        $challenge = $this->accounts->requestEmailChange(
            $request->user(),
            $request->string('email')->toString(),
            $request,
        );

        return $this->challengeResponse($challenge);
    }

    public function verifyEmail(VerifyEmailOtpRequest $request): JsonResponse
    {
        $user = $this->accounts->confirmEmailChange(
            $request->user(),
            $request->string('action_token')->toString(),
            $request->string('code')->toString(),
            $request,
        );

        return ApiResponse::success(UserResource::make($user)->resolve());
    }

    public function resendEmail(ResendEmailOtpRequest $request): JsonResponse
    {
        $challenge = $this->accounts->resendEmailChange(
            $request->user(),
            $request->string('action_token')->toString(),
            $request,
        );

        return $this->challengeResponse($challenge);
    }

    public function destroy(Request $request): JsonResponse
    {
        $this->accounts->deleteOwn($request->user(), $request);

        return ApiResponse::success(null);
    }

    private function challengeResponse(IdentityChallenge $challenge): JsonResponse
    {
        return ApiResponse::success([
            'otp_required' => true,
            'action_token' => $challenge->actionToken,
            'otp_channel' => $challenge->otpChannel,
            'masked_email' => $challenge->maskedEmail,
        ], null, 202);
    }
}
