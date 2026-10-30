<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class CodeLot extends Model
{
    protected $fillable = [
        'name',
        'quantity',
        'status',
        'exported_at',
    ];

    protected function casts(): array
    {
        return [
            'exported_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (CodeLot $lot): void {
            $lot->uuid ??= (string) Str::uuid();
        });
    }

    public function items(): HasMany
    {
        return $this->hasMany(CodeLotItem::class);
    }

    public function statusLabel(): string
    {
        return match ($this->status) {
            'generated' => 'Généré',
            'exported' => 'Exporté',
            'consumed' => 'Épuisé',
            default => $this->status,
        };
    }
}
