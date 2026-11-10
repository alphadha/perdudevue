<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailTemplate extends Model
{
    protected $fillable = [
        'slug',
        'name',
        'subject',
        'heading',
        'body',
        'button_label',
        'highlight_label',
        'placeholders',
    ];

    protected function casts(): array
    {
        return [
            'placeholders' => 'array',
        ];
    }
}
