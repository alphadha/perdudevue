<?php

namespace App\Mail\Concerns;

use App\Services\EmailTemplateService;
use App\Support\Brand;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

trait RendersPdvTemplate
{
    /** @var array<string, mixed>|null */
    private ?array $renderedCopy = null;

    abstract protected function templateSlug(): string;

    /**
     * @return array<string, string|null>
     */
    abstract protected function templateVars(): array;

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->copy()['subject']);
    }

    public function content(): Content
    {
        return new Content(
            html: 'mail.pdv',
            text: 'mail.pdv-text',
            with: $this->copy(),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function copy(): array
    {
        if ($this->renderedCopy !== null) {
            return $this->renderedCopy;
        }

        $copy = app(EmailTemplateService::class)->render(
            $this->templateSlug(),
            $this->templateVars(),
        );
        $copy['logoUrl'] = Brand::logoPngUrl();

        return $this->renderedCopy = $copy;
    }
}
