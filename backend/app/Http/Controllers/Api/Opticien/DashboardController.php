<?php

namespace App\Http\Controllers\Api\Opticien;

use App\Enums\PairStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\RestitutionResource;
use App\Models\Optician;
use App\Models\Pair;
use App\Services\RestitutionService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(private readonly RestitutionService $restitutions) {}

    public function show(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Pair::class);
        $shop = $this->shop($request);
        $waiting = $this->restitutions->waitingPickup($shop, 5);
        $foundCount = Pair::query()
            ->depositedAt($shop->id)
            ->where('status', PairStatus::ARecuperer)
            ->count();

        return ApiResponse::success([
            'pairs_count' => Pair::query()->visibleToShop($shop->id)->count(),
            'found_count' => $foundCount,
            'to_engrave_count' => Pair::query()->visibleToShop($shop->id)->where('status', PairStatus::AGraver)->count(),
            'clients_count' => $shop->clients()->count(),
            'can_hand_over' => $foundCount > 0,
            'waiting_pickup' => RestitutionResource::collection($waiting)->resolve($request),
        ]);
    }

    private function shop(Request $request): Optician
    {
        $optician = $request->user()?->primaryOptician();
        abort_unless($optician !== null, 403);

        return $optician;
    }
}
