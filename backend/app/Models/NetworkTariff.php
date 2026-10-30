<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NetworkTariff extends Model
{
    protected $fillable = [
        'network_id',
        'label',
        'unit',
        'amount_cents',
        'currency',
        'valid_from',
        'valid_to',
    ];

    protected function casts(): array
    {
        return [
            'valid_from' => 'date',
            'valid_to' => 'date',
        ];
    }

    public function network(): BelongsTo
    {
        return $this->belongsTo(Network::class);
    }

    public function isCurrent(): bool
    {
        $today = now()->startOfDay();

        if ($this->valid_from !== null && $this->valid_from->gt($today)) {
            return false;
        }
        if ($this->valid_to !== null && $this->valid_to->lt($today)) {
            return false;
        }

        return true;
    }

    public function unitLabel(): string
    {
        return match ($this->unit) {
            'per_pair' => 'À la paire',
            'monthly' => 'Forfait mensuel',
            'engraving' => 'Gravure',
            default => $this->unit,
        };
    }

    public function summary(): string
    {
        $amount = number_format($this->amount_cents / 100, 2, ',', ' ').' '.$this->currency;

        return $this->label.' — '.$amount.' / '.$this->unitLabel();
    }
}
