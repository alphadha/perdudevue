<?php

namespace App\Http\Controllers\Api\Opticien;

use App\Http\Controllers\Controller;
use App\Http\Requests\Opticien\AssignedCodeRequest;
use App\Http\Requests\Opticien\DownloadLabelsRequest;
use App\Http\Requests\Opticien\PickupCodeRequest;
use App\Http\Requests\Opticien\ResendPickupRequest;
use App\Http\Resources\FoundPairPreviewResource;
use App\Http\Resources\RestitutionResource;
use App\Models\Optician;
use App\Models\Pair;
use App\Services\RestitutionService;
use App\Services\ShipmentService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RestitutionController extends Controller
{
    public function __construct(
        private readonly RestitutionService $restitutions,
        private readonly ShipmentService $shipments,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('reportFound', Pair::class);
        $items = $this->restitutions->listDeposits($this->shop($request), $request->query('status'));

        return ApiResponse::success(RestitutionResource::collection($items)->resolve());
    }

    public function identify(AssignedCodeRequest $request): JsonResponse
    {
        $pair = $this->restitutions->identifyByAssignedCode($request->string('assigned_code')->toString());

        return ApiResponse::success(FoundPairPreviewResource::make($pair)->resolve());
    }

    public function store(AssignedCodeRequest $request): JsonResponse
    {
        $pair = $this->restitutions->confirmFound(
            $this->shop($request),
            $request->user(),
            $request->string('assigned_code')->toString(),
            $request,
        );

        return ApiResponse::success(RestitutionResource::make($pair)->resolve(), null, 201);
    }

    public function lookup(PickupCodeRequest $request): JsonResponse
    {
        $pair = $this->restitutions->lookupByPickupCode(
            $this->shop($request),
            $request->string('pickup_code')->toString(),
        );
        $this->authorize('manageDeposit', $pair);

        return ApiResponse::success(RestitutionResource::make($pair)->resolve());
    }

    public function handover(PickupCodeRequest $request): JsonResponse
    {
        $pair = $this->restitutions->handOver(
            $this->shop($request),
            $request->user(),
            $request->string('pickup_code')->toString(),
            $request,
        );

        return ApiResponse::success(RestitutionResource::make($pair)->resolve());
    }

    public function resend(ResendPickupRequest $request, string $uuid): JsonResponse
    {
        $pair = $this->restitutions->findDeposit($this->shop($request), $uuid);
        if ($pair === null) {
            return ApiResponse::message('Ressource introuvable.', 404);
        }
        $this->authorize('manageDeposit', $pair);
        $this->restitutions->resendPickup(
            $this->shop($request),
            $request->user(),
            $pair,
            $request->validated('channels'),
            $request,
        );

        return ApiResponse::success(['resent' => true]);
    }

    public function markShipped(Request $request, string $uuid): JsonResponse
    {
        $pair = $this->restitutions->findDeposit($this->shop($request), $uuid);
        if ($pair === null) {
            return ApiResponse::message('Ressource introuvable.', 404);
        }
        $this->authorize('markShipped', $pair);

        return ApiResponse::success(
            RestitutionResource::make(
                $this->shipments->markShipped($this->shop($request), $request->user(), $pair, $request)
            )->resolve()
        );
    }

    public function label(Request $request, string $uuid): JsonResponse
    {
        $pair = $this->restitutions->findDeposit($this->shop($request), $uuid);
        if ($pair === null) {
            return ApiResponse::message('Ressource introuvable.', 404);
        }
        $this->authorize('downloadLabel', $pair);
        $labels = $this->shipments->labelsForShop($this->shop($request), [$uuid], bulk: false);

        return ApiResponse::success($labels[0] ?? null);
    }

    public function labels(DownloadLabelsRequest $request): JsonResponse
    {
        $this->authorize('reportFound', Pair::class);

        return ApiResponse::success(
            $this->shipments->labelsForShop($this->shop($request), $request->validated('uuids'))
        );
    }

    private function shop(Request $request): Optician
    {
        $optician = $request->user()?->primaryOptician();
        abort_unless($optician !== null, 403);

        return $optician;
    }
}
