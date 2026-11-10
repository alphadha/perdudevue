<?php

namespace App\Mail;

use App\Mail\Concerns\RendersPdvTemplate;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class IdentityOtpMail extends Mailable
{
    use Queueable, RendersPdvTemplate, SerializesModels;

    public function __construct(
        public readonly string $code,
        public readonly string $channel,
    ) {}

    protected function templateSlug(): string
    {
        return 'identity_otp';
    }

    protected function templateVars(): array
    {
        return [
            'code' => $this->code,
            'highlight' => $this->code,
        ];
    }
}
