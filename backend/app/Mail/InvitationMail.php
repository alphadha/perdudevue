<?php

namespace App\Mail;

use App\Mail\Concerns\RendersPdvTemplate;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class InvitationMail extends Mailable
{
    use Queueable, RendersPdvTemplate, SerializesModels;

    public function __construct(
        public readonly string $token,
        public readonly string $firstName,
    ) {}

    protected function templateSlug(): string
    {
        return 'invitation';
    }

    protected function templateVars(): array
    {
        return [
            'firstName' => $this->firstName,
            'url' => rtrim((string) config('app.frontend_url'), '/').'/invitation/'.$this->token,
        ];
    }
}
