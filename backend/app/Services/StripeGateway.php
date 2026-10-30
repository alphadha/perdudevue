<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Stripe\Checkout\Session;
use Stripe\Exception\ApiErrorException;
use Stripe\Exception\CardException;
use Stripe\PaymentIntent;
use Stripe\StripeClient;

class StripeGateway
{
    /**
     * @param  array<string, string>  $metadata
     */
    public function createCheckoutSession(
        int $amountCents,
        string $currency,
        string $label,
        string $successUrl,
        string $cancelUrl,
        array $metadata,
    ): Session {
        try {
            return $this->client()->checkout->sessions->create([
                'mode' => 'payment',
                'success_url' => $successUrl,
                'cancel_url' => $cancelUrl,
                'client_reference_id' => $metadata['shipment_uuid'] ?? null,
                'metadata' => $metadata,
                'line_items' => [[
                    'quantity' => 1,
                    'price_data' => [
                        'currency' => $currency,
                        'unit_amount' => $amountCents,
                        'product_data' => [
                            'name' => $label,
                        ],
                    ],
                ]],
                'payment_intent_data' => [
                    'metadata' => $metadata,
                    'description' => $label,
                ],
            ]);
        } catch (ApiErrorException $exception) {
            Log::warning('stripe.checkout_failed', [
                'type' => $exception->getStripeCode(),
                'message' => $exception->getMessage(),
            ]);
            throw ValidationException::withMessages([
                'payment' => 'Le paiement est momentanément indisponible.',
            ]);
        }
    }

    public function retrieveCheckoutSession(string $id): Session
    {
        try {
            return $this->client()->checkout->sessions->retrieve($id, [
                'expand' => ['payment_intent'],
            ]);
        } catch (ApiErrorException) {
            throw ValidationException::withMessages([
                'session_id' => 'Paiement introuvable.',
            ]);
        }
    }

    public function expireCheckoutSession(string $id): void
    {
        try {
            $this->client()->checkout->sessions->expire($id);
        } catch (ApiErrorException) {
            // Session déjà expirée, payée ou introuvable.
        }
    }

    public function confirmPaymentIntent(string $id, string $paymentMethod): PaymentIntent
    {
        try {
            return $this->client()->paymentIntents->confirm($id, [
                'payment_method' => $paymentMethod,
                'return_url' => rtrim((string) config('app.frontend_url'), '/').'/client',
            ]);
        } catch (CardException) {
            throw ValidationException::withMessages([
                'payment' => 'Le paiement a échoué. Aucune demande d’expédition n’a été créée.',
            ]);
        } catch (ApiErrorException) {
            throw ValidationException::withMessages([
                'payment' => 'Le paiement a échoué. Aucune demande d’expédition n’a été créée.',
            ]);
        }
    }

    public function paymentIntentIdFromSession(Session $session): ?string
    {
        $intent = $session->payment_intent;
        if (is_string($intent) && $intent !== '') {
            return $intent;
        }
        if ($intent instanceof PaymentIntent) {
            return $intent->id;
        }

        return null;
    }

    private function client(): StripeClient
    {
        $secret = (string) config('services.stripe.secret');
        if ($secret === '') {
            throw ValidationException::withMessages([
                'payment' => 'Le paiement est momentanément indisponible.',
            ]);
        }

        return new StripeClient($secret);
    }
}
