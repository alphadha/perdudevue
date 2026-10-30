<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class IdentityOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $code,
        public readonly string $channel,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->channel === 'sms'
                ? 'Code SMS de vérification — Perdues de Vue'
                : 'Code de vérification — Perdues de Vue',
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.identity-otp',
        );
    }
}
