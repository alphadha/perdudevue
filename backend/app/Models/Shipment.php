<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Shipment extends Model
{
    protected $fillable = [
        'pair_id',
        'status',
        'mode',
        'carrier',
        'price_cents',
        'recipient_first_name',
        'recipient_last_name',
        'address_line',
        'postal_code',
        'city',
        'relay_id',
        'relay_name',
        'consent_address_at',
        'payment_ref',
        'label_ref',
        'tracking_ref',
        'carrier_shipment_number',
        'label_url',
        'label_pdf',
        'paid_at',
        'shipped_at',
    ];

    protected function casts(): array
    {
        return [
            'consent_address_at' => 'datetime',
            'paid_at' => 'datetime',
            'shipped_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Shipment $shipment): void {
            $shipment->uuid ??= (string) Str::uuid();
        });
    }

    public function pair(): BelongsTo
    {
        return $this->belongsTo(Pair::class);
    }

    public function isPaid(): bool
    {
        return $this->status === 'paid' || $this->status === 'in_transit';
    }

    public function recipientName(): string
    {
        return trim($this->recipient_first_name.' '.$this->recipient_last_name);
    }

    public function destinationSummary(): string
    {
        if ($this->mode === 'relay' && filled($this->relay_name)) {
            return $this->relay_name.', '.$this->postal_code.' '.$this->city;
        }

        return $this->address_line.', '.$this->postal_code.' '.$this->city;
    }

    public function labelBody(Pair $pair): string
    {
        $lines = [
            'Bordereau d’expédition — Perdues de Vue',
            'Référence : '.(string) $this->label_ref,
            'Transporteur : '.(string) $this->carrier,
            '',
            'Destinataire : '.$this->recipientName(),
            'Adresse : '.$this->address_line,
            $this->postal_code.' '.$this->city,
        ];
        if ($this->mode === 'relay' && filled($this->relay_name)) {
            $lines[] = 'Point relais : '.$this->relay_name;
        }
        $lines[] = '';
        $lines[] = 'Paire : '.$pair->title();
        $lines[] = 'Code assigné : '.$pair->assigned_code;

        return implode("\n", $lines);
    }
}
