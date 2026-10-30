<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\Client\ResendPickupRequest;
use App\Http\Resources\ClientPairResource;
use App\Models\Client;
use App\Services\ClientPairService;
use App\Services\RestitutionService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PairController extends Controller
{
    public function __construct(
        private readonly ClientPairService $pairs,
        private readonly RestitutionService $restitutions,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewOwnAny', \App\Models\Pair::class);

        return ApiResponse::success(
            ClientPairResource::collection($this->pairs->listForOwner($this->owner($request)))->resolve()
        );
    }

    public function show(Request $request, string $uuid): JsonResponse
    {
        $pair = $this->pairs->findForOwner($this->owner($request), $uuid);
        if ($pair === null) {
            return ApiResponse::message('Ressource introuvable.', 404);
        }
        $this->authorize('viewOwn', $pair);

        return ApiResponse::success(ClientPairResource::make($pair)->resolve());
    }

    public function declareLost(Request $request, string $uuid): JsonResponse
    {
        $pair = $this->pairs->findForOwner($this->owner($request), $uuid);
        if ($pair === null) {
            return ApiResponse::message('Ressource introuvable.', 404);
        }
        $this->authorize('declareLost', $pair);

        return ApiResponse::success(
            ClientPairResource::make($this->pairs->declareLost($request->user(), $pair, $request))->resolve()
        );
    }

    public function cancelLost(Request $request, string $uuid): JsonResponse
    {
        $pair = $this->pairs->findForOwner($this->owner($request), $uuid);
        if ($pair === null) {
            return ApiResponse::message('Ressource introuvable.', 404);
        }
        $this->authorize('cancelLost', $pair);

        return ApiResponse::success(
            ClientPairResource::make($this->pairs->cancelLost($request->user(), $pair, $request))->resolve()
        );
    }

    public function inactivate(Request $request, string $uuid): JsonResponse
    {
        $pair = $this->pairs->findForOwner($this->owner($request), $uuid);
        if ($pair === null) {
            return ApiResponse::message('Ressource introuvable.', 404);
        }
        $this->authorize('inactivateOwn', $pair);

        return ApiResponse::success(
            ClientPairResource::make($this->pairs->inactivate($request->user(), $pair, $request))->resolve()
        );
    }

    public function destroy(Request $request, string $uuid): JsonResponse
    {
        $pair = $this->pairs->findForOwner($this->owner($request), $uuid);
        if ($pair === null) {
            return ApiResponse::message('Ressource introuvable.', 404);
        }
        $this->authorize('archiveOwn', $pair);
        $this->pairs->archive($request->user(), $pair, $request);

        return ApiResponse::success(null);
    }

    public function resend(ResendPickupRequest $request, string $uuid): JsonResponse
    {
        $pair = $this->pairs->findForOwner($this->owner($request), $uuid);
        if ($pair === null) {
            return ApiResponse::message('Ressource introuvable.', 404);
        }
        $this->authorize('resendOwnPickup', $pair);
        $this->restitutions->resendForOwner(
            $request->user(),
            $pair,
            $request->validated('channels'),
            $request,
        );

        return ApiResponse::success(null);
    }

    private function owner(Request $request): Client
    {
        $client = $request->user()?->clientProfile;
        abort_unless($client !== null, 403);

        return $client;
    }
}
