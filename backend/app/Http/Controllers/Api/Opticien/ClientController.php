<?php

namespace App\Http\Controllers\Api\Opticien;

use App\Exceptions\ClientDuplicateException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Opticien\StoreClientRequest;
use App\Http\Requests\Opticien\UpdateClientRequest;
use App\Http\Requests\Opticien\VerifyIdentityOtpRequest;
use App\Http\Resources\ClientResource;
use App\Models\Client;
use App\Models\Optician;
use App\Services\OpticienClientService;
use App\Support\ApiResponse;
use App\Support\IdentityChallenge;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function __construct(private readonly OpticienClientService $clients) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Client::class);
        $optician = $this->shop($request);

        $items = $optician->clients()
            ->with('user')
            ->withCount([
                'pairs',
                'pairs as pairs_lost_count' => fn ($query) => $query->where('status', 'perdue'),
            ])
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        return ApiResponse::success(ClientResource::collection($items)->resolve());
    }

    public function store(StoreClientRequest $request): JsonResponse
    {
        $optician = $this->shop($request);

        try {
            $client = $this->clients->create($optician, $request->user(), $request->validated(), $request);
        } catch (ClientDuplicateException $exception) {
            return ApiResponse::fail(
                [[
                    'message' => $exception->getMessage(),
                    'code' => 'client_duplicate',
                ]],
                409,
                [
                    'duplicate' => true,
                    'already_linked' => $exception->alreadyLinked,
                    'action_token' => $exception->actionToken,
                    'client' => ClientResource::make($exception->client->load('user'))->resolve(),
                ],
            );
        }

        return ApiResponse::success(ClientResource::make($client)->resolve(), null, 201);
    }

    public function show(Request $request, string $uuid): JsonResponse
    {
        $client = $this->clients->findInShop($this->shop($request), $uuid);
        if ($client === null) {
            return ApiResponse::message('Ressource introuvable.', 404);
        }
        $this->authorize('view', $client);

        return ApiResponse::success(ClientResource::make($client)->resolve());
    }

    public function update(UpdateClientRequest $request, string $uuid): JsonResponse
    {
        $client = $this->clients->findInShop($this->shop($request), $uuid);
        if ($client === null) {
            return ApiResponse::message('Ressource introuvable.', 404);
        }
        $this->authorize('update', $client);

        $result = $this->clients->update(
            $this->shop($request),
            $request->user(),
            $client,
            $request->validated(),
            $request,
        );

        return $this->mutationResponse($result);
    }

    public function destroy(Request $request, string $uuid): JsonResponse
    {
        $client = $this->clients->findInShop($this->shop($request), $uuid);
        if ($client === null) {
            return ApiResponse::message('Ressource introuvable.', 404);
        }
        $this->authorize('delete', $client);
        $this->clients->unlink($this->shop($request), $request->user(), $client, $request);

        return ApiResponse::success(null);
    }

    public function confirmDuplicate(Request $request, string $token): JsonResponse
    {
        $this->authorize('create', Client::class);
        $client = $this->clients->confirmDuplicate(
            $this->shop($request),
            $request->user(),
            $token,
            $request,
        );

        return ApiResponse::success(ClientResource::make($client)->resolve());
    }

    public function updateDuplicate(UpdateClientRequest $request, string $token): JsonResponse
    {
        $this->authorize('create', Client::class);
        $result = $this->clients->updateFromDuplicate(
            $this->shop($request),
            $request->user(),
            $token,
            $request->validated(),
            $request,
        );

        return $this->mutationResponse($result);
    }

    public function verifyIdentity(VerifyIdentityOtpRequest $request, string $token): JsonResponse
    {
        $this->authorize('create', Client::class);
        $result = $this->clients->verifyIdentity(
            $this->shop($request),
            $request->user(),
            $token,
            $request->string('code')->toString(),
            $request,
        );

        return $this->mutationResponse($result);
    }

    public function resendIdentity(Request $request, string $token): JsonResponse
    {
        $this->authorize('create', Client::class);
        $challenge = $this->clients->resendIdentityOtp(
            $this->shop($request),
            $request->user(),
            $token,
            $request,
        );

        return $this->challengeResponse($challenge);
    }

    private function shop(Request $request): Optician
    {
        $optician = $request->user()?->primaryOptician();
        abort_unless($optician !== null, 403);

        return $optician;
    }

    private function mutationResponse(Client|IdentityChallenge $result): JsonResponse
    {
        if ($result instanceof IdentityChallenge) {
            return $this->challengeResponse($result);
        }

        return ApiResponse::success(ClientResource::make($result)->resolve());
    }

    private function challengeResponse(IdentityChallenge $challenge): JsonResponse
    {
        return ApiResponse::success([
            'otp_required' => true,
            'action_token' => $challenge->actionToken,
            'otp_channel' => $challenge->otpChannel,
        ], null, 202);
    }
}
