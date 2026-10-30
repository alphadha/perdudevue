<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CodeLotItem extends Model
{
    protected $fillable = [
        'code_lot_id',
        'code',
        'status',
        'pair_id',
    ];

    public function lot(): BelongsTo
    {
        return $this->belongsTo(CodeLot::class, 'code_lot_id');
    }

    public function pair(): BelongsTo
    {
        return $this->belongsTo(Pair::class);
    }
}
