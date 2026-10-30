<?php

namespace App\Mail;

use App\Models\Optician;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PairFoundMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $firstName,
        public readonly string $pickupCode,
        public readonly string $publicUrl,
        public readonly Optician $shop,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Vos lunettes ont été retrouvées — Perdues de Vue',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.pair-found',
        );
    }
}
