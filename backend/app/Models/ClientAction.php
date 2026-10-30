<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientAction extends Model
{
    protected $fillable = [
        'token_hash',
        'client_id',
        'optician_id',
        'type',
        'payload',
        'otp_hash',
        'otp_channel',
        'otp_attempts',
        'expires_at',
        'consumed_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'otp_attempts' => 'integer',
            'expires_at' => 'datetime',
            'consumed_at' => 'datetime',
        ];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function optician(): BelongsTo
    {
        return $this->belongsTo(Optician::class);
    }

    public function isUsable(): bool
    {
        return $this->consumed_at === null && $this->expires_at->isFuture();
    }
}
