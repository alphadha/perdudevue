<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PairEvent extends Model
{
    protected $fillable = [
        'pair_id',
        'type',
        'payload',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
        ];
    }

    public function pair(): BelongsTo
    {
        return $this->belongsTo(Pair::class);
    }
}
