<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ShopNotification extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'optician_id',
        'pair_id',
        'type',
        'title',
        'body',
        'href',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (ShopNotification $notification): void {
            $notification->uuid ??= (string) Str::uuid();
        });
    }

    public function optician(): BelongsTo
    {
        return $this->belongsTo(Optician::class);
    }

    public function pair(): BelongsTo
    {
        return $this->belongsTo(Pair::class);
    }

    public function isUnread(): bool
    {
        return $this->read_at === null;
    }
}
