<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\Client\UpdateConsentsRequest;
use App\Http\Requests\Client\UpdateProfileRequest;
use App\Http\Resources\ClientProfileResource;
use App\Models\Client;
use App\Services\AuditService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function show(Request $request): JsonResponse
    {
        return ApiResponse::success(ClientProfileResource::make($this->owner($request))->resolve());
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $client = $this->owner($request);
        $user = $request->user();
        abort_unless($user !== null, 403);
        $client->forceFill([
            'first_name' => $request->string('first_name')->toString(),
            'last_name' => $request->string('last_name')->toString(),
            'phone' => $request->string('phone')->toString(),
        ])->save();
        $user->forceFill([
            'first_name' => $client->first_name,
            'last_name' => $client->last_name,
            'phone' => $client->phone,
        ])->save();
        $this->audit->record($user, 'client.profile_updated', $request, [
            'client_uuid' => $client->uuid,
        ]);

        return ApiResponse::success(ClientProfileResource::make($client->fresh())->resolve());
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

    private function owner(Request $request): Client
    {
        $client = $request->user()?->clientProfile;
        abort_unless($client !== null, 403);

        return $client;
    }
}
