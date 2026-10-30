<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QontoSyncLog extends Model
{
    protected $fillable = [
        'status',
        'message',
        'ran_at',
    ];

    protected function casts(): array
    {
        return [
            'ran_at' => 'datetime',
        ];
    }
}
