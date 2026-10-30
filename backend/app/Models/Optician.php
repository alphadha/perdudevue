<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Optician extends Model
{
    protected $fillable = [
        'name',
        'siret',
        'address',
        'city',
        'postal_code',
        'phone',
        'email',
        'network_id',
        'billing_email',
        'billing_iban',
        'qonto_id',
    ];

    protected static function booted(): void
    {
        static::creating(function (Optician $optician): void {
            $optician->uuid ??= (string) Str::uuid();
        });
    }

    public function network(): BelongsTo
    {
        return $this->belongsTo(Network::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->withTimestamps();
    }

    public function clients(): BelongsToMany
    {
        return $this->belongsToMany(Client::class, 'optician_client')->withTimestamps();
    }

    public function pairs(): HasMany
    {
        return $this->hasMany(Pair::class, 'origin_optician_id');
    }

    /**
     * @return array<string, mixed>
     */
    public function toClientShop(): array
    {
        $query = urlencode(trim(($this->address ?? '').' '.($this->postal_code ?? '').' '.($this->city ?? '')));

        return [
            'name' => $this->name,
            'address' => $this->address,
            'city' => $this->city,
            'postal_code' => $this->postal_code,
            'phone' => $this->phone,
            'maps_url' => 'https://www.google.com/maps/search/?api=1&query='.$query,
            'waze_url' => 'https://waze.com/ul?q='.$query,
        ];
    }
}
