<?php

namespace Tests\Support;

use App\Services\StripeGateway;
use Illuminate\Validation\ValidationException;
use Stripe\Checkout\Session;

class FakeStripeGateway extends StripeGateway
{
    /** @var array<string, Session> */
    private array $sessions = [];

    public function createCheckoutSession(
        int $amountCents,
        string $currency,
        string $label,
        string $successUrl,
        string $cancelUrl,
        array $metadata,
    ): Session {
        $id = 'cs_test_'.bin2hex(random_bytes(12));
        $session = Session::constructFrom([
            'id' => $id,
            'object' => 'checkout.session',
            'url' => 'https://checkout.stripe.com/c/pay/'.$id,
            'payment_status' => 'unpaid',
            'amount_total' => $amountCents,
            'status' => 'open',
            'currency' => $currency,
            'success_url' => $successUrl,
            'cancel_url' => $cancelUrl,
            'metadata' => $metadata,
            'client_reference_id' => $metadata['shipment_uuid'] ?? null,
        ]);
        $this->sessions[$id] = $session;

        return $session;
    }

    public function retrieveCheckoutSession(string $id): Session
    {
        if (! isset($this->sessions[$id])) {
            throw ValidationException::withMessages([
                'session_id' => 'Paiement introuvable.',
            ]);
        }

        return $this->sessions[$id];
    }

    public function expireCheckoutSession(string $id): void
    {
        if (! isset($this->sessions[$id])) {
            return;
        }

        $this->settle($id, false);
    }

    public function settle(string $id, bool $succeed): void
    {
        $current = $this->sessions[$id] ?? null;
        if ($current === null) {
            throw ValidationException::withMessages([
                'session_id' => 'Paiement introuvable.',
            ]);
        }

        $this->sessions[$id] = Session::constructFrom([
            'id' => $id,
            'object' => 'checkout.session',
            'url' => $current->url,
            'payment_status' => $succeed ? 'paid' : 'unpaid',
            'amount_total' => $current->amount_total,
            'status' => $succeed ? 'complete' : 'expired',
        ]);
    }
}
