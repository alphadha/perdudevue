<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Client extends Model
{
    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'consent_email',
        'consent_sms',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'consent_email' => 'boolean',
            'consent_sms' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Client $client): void {
            $client->uuid ??= (string) Str::uuid();
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function opticians(): BelongsToMany
    {
        return $this->belongsToMany(Optician::class, 'optician_client')->withTimestamps();
    }

    public function pairs(): HasMany
    {
        return $this->hasMany(Pair::class);
    }
}
