<?php

namespace App\Http\Resources;

use App\Enums\PairStatus;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Client */
class ClientResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'email' => $this->email,
            'phone' => $this->phone,
            'consent_email' => (bool) $this->consent_email,
            'consent_sms' => (bool) $this->consent_sms,
            'pairs_count' => (int) ($this->pairs_count ?? $this->pairs()->count()),
            'pairs_lost_count' => (int) ($this->pairs_lost_count ?? $this->pairs()->where('status', PairStatus::Perdue)->count()),
            'account_pending' => $this->user?->hasPassword() !== true,
        ];
    }
}
