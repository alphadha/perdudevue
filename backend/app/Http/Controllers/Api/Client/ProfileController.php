<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\Client\ResendPhoneOtpRequest;
use App\Http\Requests\Client\UpdateConsentsRequest;
use App\Http\Requests\Client\UpdateProfileRequest;
use App\Http\Requests\Client\VerifyPhoneOtpRequest;
use App\Http\Resources\ClientProfileResource;
use App\Models\Client;
use App\Services\AuditService;
use App\Services\ClientProfileService;
use App\Support\ApiResponse;
use App\Support\IdentityChallenge;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function __construct(
        private readonly AuditService $audit,
        private readonly ClientProfileService $profiles,
    ) {}

    public function show(Request $request): JsonResponse
    {
        return ApiResponse::success(ClientProfileResource::make($this->owner($request))->resolve());
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $client = $this->owner($request);
        $user = $request->user();
        abort_unless($user !== null, 403);

        $result = $this->profiles->update(
            $user,
            $client,
            $request->string('first_name')->toString(),
            $request->string('last_name')->toString(),
            $request->string('phone')->toString(),
            $request,
        );

        if ($result['challenge'] instanceof IdentityChallenge) {
            return $this->challengeResponse($result['challenge']);
        }

        return ApiResponse::success(ClientProfileResource::make($result['client'])->resolve());
    }

    public function verifyPhone(VerifyPhoneOtpRequest $request): JsonResponse
    {
        $client = $this->owner($request);
        $user = $request->user();
        abort_unless($user !== null, 403);

        $updated = $this->profiles->confirmPhone(
            $user,
            $client,
            $request->string('action_token')->toString(),
            $request->string('code')->toString(),
            $request,
        );

        return ApiResponse::success(ClientProfileResource::make($updated)->resolve());
    }

    public function resendPhone(ResendPhoneOtpRequest $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        return $this->challengeResponse($this->profiles->resendPhone(
            $user,
            $request->string('action_token')->toString(),
            $request,
        ));
    }

    public function updateConsents(UpdateConsentsRequest $request): JsonResponse
    {
        $client = $this->owner($request);
        $client->consent_email = $request->boolean('consent_email');
        $client->consent_sms = $request->boolean('consent_sms');
        $client->save();
        $this->audit->record($request->user(), 'client.consents_updated', $request, [
            'client_uuid' => $client->uuid,
        ]);

        return ApiResponse::success(ClientProfileResource::make($client->fresh())->resolve());
    }

    private function challengeResponse(IdentityChallenge $challenge): JsonResponse
    {
        return ApiResponse::success([
            'otp_required' => true,
            'action_token' => $challenge->actionToken,
            'otp_channel' => $challenge->otpChannel,
            'masked_email' => $challenge->maskedEmail,
            'masked_phone' => $challenge->maskedPhone,
        ], null, 202);
    }

    private function owner(Request $request): Client
    {
        $client = $request->user()?->clientProfile;
        abort_unless($client !== null, 403);

        return $client;
    }
}
