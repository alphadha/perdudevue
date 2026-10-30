<?php

namespace App\Http\Controllers\Api\Opticien;

use App\Http\Controllers\Controller;
use App\Http\Requests\Opticien\StorePairRequest;
use App\Http\Resources\PairResource;
use App\Models\Optician;
use App\Models\Pair;
use App\Services\OpticienPairService;
use App\Support\ApiResponse;
use App\Support\PairCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PairController extends Controller
{
    public function __construct(private readonly OpticienPairService $pairs) {}

    public function catalog(): JsonResponse
    {
        $this->authorize('viewAny', Pair::class);

        return ApiResponse::success(PairCatalog::all());
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Pair::class);
        $items = $this->pairs->listForShop(
            $this->shop($request),
            $request->query('client_uuid'),
            $request->query('status'),
        );

        return ApiResponse::success(PairResource::collection($items)->resolve());
    }

    public function store(StorePairRequest $request): JsonResponse
    {
        $pair = $this->pairs->create(
            $this->shop($request),
            $request->user(),
            $request->validated(),
            $request,
        );

        return ApiResponse::success(PairResource::make($pair)->resolve(), null, 201);
    }

    public function show(Request $request, string $uuid): JsonResponse
    {
        $pair = $this->pairs->findInShop($this->shop($request), $uuid);
        if ($pair === null) {
            return ApiResponse::message('Ressource introuvable.', 404);
        }
        $this->authorize('view', $pair);

        return ApiResponse::success(PairResource::make($pair)->resolve());
    }

    public function engrave(Request $request, string $uuid): JsonResponse
    {
        $pair = $this->pairs->findInShop($this->shop($request), $uuid);
        if ($pair === null) {
            return ApiResponse::message('Ressource introuvable.', 404);
        }
        $this->authorize('update', $pair);

        return ApiResponse::success(
            PairResource::make($this->pairs->engrave($request->user(), $pair, $request))->resolve()
        );
    }

    public function inactivate(Request $request, string $uuid): JsonResponse
    {
        $pair = $this->pairs->findInShop($this->shop($request), $uuid);
        if ($pair === null) {
            return ApiResponse::message('Ressource introuvable.', 404);
        }
        $this->authorize('update', $pair);

        return ApiResponse::success(
            PairResource::make($this->pairs->inactivate($request->user(), $pair, $request))->resolve()
        );
    }

    public function destroy(Request $request, string $uuid): JsonResponse
    {
        $pair = $this->pairs->findInShop($this->shop($request), $uuid);
        if ($pair === null) {
            return ApiResponse::message('Ressource introuvable.', 404);
        }
        $this->authorize('delete', $pair);
        $this->pairs->archive($request->user(), $pair, $request);

        return ApiResponse::success(null);
    }

    private function shop(Request $request): Optician
    {
        $optician = $request->user()?->primaryOptician();
        abort_unless($optician !== null, 403);

        return $optician;
    }
}
