<?php

namespace App\Models;

use App\Enums\PairStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Pair extends Model
{
    protected $fillable = [
        'client_id',
        'origin_optician_id',
        'depositary_optician_id',
        'type',
        'brand',
        'colors',
        'description',
        'registered_at',
    ];

    protected $hidden = [
        'pickup_code',
    ];

    protected function casts(): array
    {
        return [
            'status' => PairStatus::class,
            'colors' => 'array',
            'registered_at' => 'datetime',
            'found_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Pair $pair): void {
            $pair->uuid ??= (string) Str::uuid();
        });
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function originOptician(): BelongsTo
    {
        return $this->belongsTo(Optician::class, 'origin_optician_id');
    }

    public function depositaryOptician(): BelongsTo
    {
        return $this->belongsTo(Optician::class, 'depositary_optician_id');
    }

    public function publicTokens(): HasMany
    {
        return $this->hasMany(PublicRestitutionToken::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(PairEvent::class)->orderByDesc('id');
    }

    public function shipments(): HasMany
    {
        return $this->hasMany(Shipment::class);
    }

    public function title(): string
    {
        return 'Lunettes '.$this->type.' - '.$this->brand;
    }

    public function scopeVisibleToShop(Builder $query, int $opticianId): Builder
    {
        return $query
            ->where('origin_optician_id', $opticianId)
            ->where('status', '!=', PairStatus::Archivee->value);
    }

    public function scopeDepositedAt(Builder $query, int $opticianId): Builder
    {
        return $query
            ->where('depositary_optician_id', $opticianId)
            ->whereIn('status', [
                PairStatus::ARecuperer->value,
                PairStatus::LivraisonDemandee->value,
                PairStatus::EnLivraison->value,
            ]);
    }

    public function typeLabel(): string
    {
        return 'Lunettes '.$this->type;
    }
}
