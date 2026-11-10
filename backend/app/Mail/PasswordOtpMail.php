<?php

namespace App\Mail;

use App\Mail\Concerns\RendersPdvTemplate;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PasswordOtpMail extends Mailable
{
    use Queueable, RendersPdvTemplate, SerializesModels;

    public function __construct(public readonly string $code) {}

    protected function templateSlug(): string
    {
        return 'password_otp';
    }

    protected function templateVars(): array
    {
        return [
            'code' => $this->code,
            'highlight' => $this->code,
        ];
    }
}
