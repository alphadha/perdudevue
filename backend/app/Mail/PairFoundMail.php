<?php

namespace App\Mail;

use App\Mail\Concerns\RendersPdvTemplate;
use App\Models\Optician;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PairFoundMail extends Mailable
{
    use Queueable, RendersPdvTemplate, SerializesModels;

    public function __construct(
        public readonly string $firstName,
        public readonly string $pickupCode,
        public readonly string $publicUrl,
        public readonly Optician $shop,
    ) {}

    protected function templateSlug(): string
    {
        return 'pair_found';
    }

    protected function templateVars(): array
    {
        $parts = array_filter([
            $this->shop->address,
            trim(($this->shop->postal_code ?? '').' '.($this->shop->city ?? '')),
        ]);

        return [
            'firstName' => $this->firstName,
            'shopName' => $this->shop->name,
            'shopAddress' => $parts === [] ? '' : 'Lieu de retrait : '.implode(', ', $parts),
            'pickupCode' => $this->pickupCode,
            'highlight' => $this->pickupCode,
            'url' => $this->publicUrl,
        ];
    }
}
