<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PublicRestitutionToken extends Model
{
    protected $fillable = [
        'pair_id',
        'token_hash',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
        ];
    }

    public function pair(): BelongsTo
    {
        return $this->belongsTo(Pair::class);
    }

    public function isUsable(): bool
    {
        return $this->expires_at === null || $this->expires_at->isFuture();
    }
}
