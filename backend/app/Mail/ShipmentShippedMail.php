<?php

namespace App\Mail;

use App\Mail\Concerns\RendersPdvTemplate;
use App\Models\Pair;
use App\Models\Shipment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ShipmentShippedMail extends Mailable
{
    use Queueable, RendersPdvTemplate, SerializesModels;

    public function __construct(
        public readonly string $firstName,
        public readonly Pair $pair,
        public readonly Shipment $shipment,
    ) {}

    protected function templateSlug(): string
    {
        return 'shipment_shipped';
    }

    protected function templateVars(): array
    {
        $tracking = filled($this->shipment->tracking_ref) ? (string) $this->shipment->tracking_ref : null;

        return [
            'firstName' => $this->firstName,
            'pairTitle' => $this->pair->title(),
            'carrier' => (string) $this->shipment->carrier,
            'destination' => $this->shipment->destinationSummary(),
            'trackingRef' => $tracking ?? '',
            'highlight' => $tracking,
            'url' => rtrim((string) config('app.frontend_url'), '/').'/client',
        ];
    }
}
