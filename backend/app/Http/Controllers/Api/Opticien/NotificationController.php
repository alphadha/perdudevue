<?php

namespace App\Http\Controllers\Api\Opticien;

use App\Http\Controllers\Controller;
use App\Http\Resources\ShopNotificationResource;
use App\Models\Optician;
use App\Models\ShopNotification;
use App\Services\ShopInboxService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct(private readonly ShopInboxService $inbox) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ShopNotification::class);
        $filter = (string) $request->query('filter', 'all');
        if (! in_array($filter, ['all', 'unread', 'read'], true)) {
            $filter = 'all';
        }

        $shop = $this->shop($request);
        $items = $this->inbox->listForShop($shop, $filter);

        return ApiResponse::success(ShopNotificationResource::collection($items)->resolve(), [
            'filter' => $filter,
            'unread_count' => $this->inbox->unreadCount($shop),
        ]);
    }

    public function markRead(Request $request, string $uuid): JsonResponse
    {
        $notification = $this->inbox->findForShop($this->shop($request), $uuid);
        if ($notification === null) {
            return ApiResponse::message('Ressource introuvable.', 404);
        }
        $this->authorize('update', $notification);

        return ApiResponse::success(
            ShopNotificationResource::make($this->inbox->markRead($notification))->resolve()
        );
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ShopNotification::class);
        $this->inbox->markAllRead($this->shop($request));

        return ApiResponse::success(null);
    }

    public function destroyAll(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ShopNotification::class);
        $this->inbox->deleteAll($this->shop($request));

        return ApiResponse::success(null);
    }

    private function shop(Request $request): Optician
    {
        $optician = $request->user()?->primaryOptician();
        abort_unless($optician !== null, 403);

        return $optician;
    }
}
