<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\Client\CheckoutShipmentRequest;
use App\Http\Requests\Client\PayShipmentRequest;
use App\Http\Resources\ClientPairResource;
use App\Http\Resources\ShipmentResource;
use App\Models\Client;
use App\Services\ClientPairService;
use App\Services\ShipmentService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShipmentController extends Controller
{
    public function __construct(
        private readonly ClientPairService $pairs,
        private readonly ShipmentService $shipments,
    ) {}

    public function quote(Request $request, string $uuid): JsonResponse
    {
        $pair = $this->pairs->findForOwner($this->owner($request), $uuid);
        if ($pair === null) {
            return ApiResponse::message('Ressource introuvable.', 404);
        }
        $this->authorize('requestDelivery', $pair);

        $postalCode = $request->query('postal_code');
        $query = $request->query('q');
        $city = $request->query('city');
        $lat = $request->query('lat');
        $lng = $request->query('lng');

        return ApiResponse::success($this->shipments->quote(
            is_string($postalCode) ? $postalCode : null,
            is_string($query) ? $query : null,
            is_string($city) ? $city : null,
            is_numeric($lat) ? (float) $lat : null,
            is_numeric($lng) ? (float) $lng : null,
        ));
    }

    public function checkout(CheckoutShipmentRequest $request, string $uuid): JsonResponse
    {
        $pair = $this->pairs->findForOwner($this->owner($request), $uuid);
        if ($pair === null) {
            return ApiResponse::message('Ressource introuvable.', 404);
        }
        $this->authorize('requestDelivery', $pair);

        $shipment = $this->shipments->checkout($request->user(), $pair, $request->validated(), $request);

        return ApiResponse::success(ShipmentResource::make($shipment)->resolve(), null, 201);
    }

    public function pay(PayShipmentRequest $request, string $uuid): JsonResponse
    {
        $pair = $this->pairs->findForOwner($this->owner($request), $uuid);
        if ($pair === null) {
            return ApiResponse::message('Ressource introuvable.', 404);
        }
        $this->authorize('payShipment', $pair);

        $this->shipments->pay(
            $request->user(),
            $pair,
            $request->safe()->only(['session_id']),
            $request,
        );

        $fresh = $this->pairs->findForOwner($this->owner($request), $uuid);

        return ApiResponse::success(ClientPairResource::make($fresh)->resolve());
    }

    private function owner(Request $request): Client
    {
        $client = $request->user()?->clientProfile;
        abort_unless($client !== null, 403);

        return $client;
    }
}
