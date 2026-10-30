<?php

namespace App\Mail;

use App\Models\Pair;
use App\Models\Shipment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ShipmentShippedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $firstName,
        public readonly Pair $pair,
        public readonly Shipment $shipment,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Vos lunettes sont en cours d’expédition — Perdues de Vue',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.shipment-shipped',
        );
    }
}
