<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Network extends Model
{
    protected $fillable = [
        'name',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Network $network): void {
            $network->uuid ??= (string) Str::uuid();
        });
    }

    public function tariffs(): HasMany
    {
        return $this->hasMany(NetworkTariff::class);
    }

    public function opticians(): HasMany
    {
        return $this->hasMany(Optician::class);
    }
}
