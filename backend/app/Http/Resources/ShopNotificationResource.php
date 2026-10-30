<?php

namespace App\Http\Resources;

use App\Models\ShopNotification;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ShopNotification */
class ShopNotificationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'type' => $this->type,
            'title' => $this->title,
            'body' => $this->body,
            'href' => $this->href,
            'read' => $this->read_at !== null,
            'read_at' => $this->read_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'actions' => [
                'can_open_dossier' => filled($this->href),
                'can_mark_read' => $this->read_at === null,
            ],
        ];
    }
}
