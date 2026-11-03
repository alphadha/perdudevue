<?php

namespace App\Http\Controllers\Api\Opticien;

use App\Http\Controllers\Controller;
use App\Http\Requests\Opticien\StoreShopUserRequest;
use App\Http\Resources\ShopUserResource;
use App\Models\Optician;
use App\Models\User;
use App\Services\ShopUserService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShopUserController extends Controller
{
    public function __construct(private readonly ShopUserService $users) {}

    public function index(Request $request): JsonResponse
    {
        $this->guardAdmin($request);
        $shop = $this->shop($request);

        return ApiResponse::success(
            ShopUserResource::collection($this->users->list($shop))->resolve()
        );
    }

    public function store(StoreShopUserRequest $request): JsonResponse
    {
        $this->guardAdmin($request);
        $user = $this->users->invite($this->shop($request), $request->user(), $request->validated(), $request);

        return ApiResponse::success(ShopUserResource::make($user)->resolve(), null, 201);
    }

    public function resend(Request $request, string $uuid): JsonResponse
    {
        $this->guardAdmin($request);
        $user = $this->users->resend($this->shop($request), $request->user(), $uuid, $request);

        return ApiResponse::success(ShopUserResource::make($user)->resolve());
    }

    public function destroy(Request $request, string $uuid): JsonResponse
    {
        $this->guardAdmin($request);
        $this->users->remove($this->shop($request), $request->user(), $uuid, $request);

        return ApiResponse::success(null);
    }

    private function guardAdmin(Request $request): void
    {
        if ($request->user()?->cannot('manageShopUsers', User::class)) {
            abort(404);
        }
    }

    private function shop(Request $request): Optician
    {
        $optician = $request->user()?->primaryOptician();
        abort_unless($optician !== null, 404);

        return $optician;
    }
}
