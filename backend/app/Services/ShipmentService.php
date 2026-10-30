<?php

namespace App\Services;

use App\Enums\PairStatus;
use App\Mail\ShipmentShippedMail;
use App\Models\Optician;
use App\Models\Pair;
use App\Models\PairEvent;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ShipmentService
{
    public function __construct(
        private readonly AuditService $audit,
        private readonly NotificationService $notifications,
        private readonly ShopInboxService $inbox,
        private readonly StripeGateway $stripe,
        private readonly MondialRelayGateway $mondialRelay,
        private readonly ColissimoGateway $colissimo,
    ) {}

    /**
     * @return array{
     *     price_cents: int,
     *     currency: string,
     *     carrier: string,
     *     carriers: array{home: string, relay: string},
     *     eta_label: string,
     *     query: string|null,
     *     postal_code: string|null,
     *     relays: list<array{id: string, name: string, address: string, postal_code: string, city: string, lat: float|null, lng: float|null}>,
     *     maps: array{provider: string, google_maps_key: string|null, maplibre_style_url: string|null}
     * }
     */
    public function quote(
        ?string $postalCode = null,
        ?string $query = null,
        ?string $city = null,
        ?float $latitude = null,
        ?float $longitude = null,
    ): array {
        $query = $query !== null ? trim($query) : null;
        $city = $city !== null ? trim($city) : null;
        $postalCode = $this->extractPostalCode($postalCode) ?? $this->extractPostalCode($query);
        if ($city === null || $city === '') {
            $city = $this->extractCity($query, $postalCode);
        }

        $carriers = $this->carriers();

        return [
            'price_cents' => (int) config('shipping.price_cents'),
            'currency' => (string) config('shipping.currency'),
            'carrier' => $carriers['home'],
            'carriers' => $carriers,
            'eta_label' => (string) config('shipping.eta_label'),
            'query' => $query,
            'postal_code' => $postalCode,
            'city' => $city,
            'relays' => $postalCode === null
                ? []
                : $this->mondialRelay->searchRelays($postalCode, 'FR', 6, $city, $latitude, $longitude),
            'maps' => $this->mapsConfig(),
        ];
    }

    /**
     * @return array{home: string, relay: string}
     */
    public function carriers(): array
    {
        return [
            'home' => (string) config('shipping.carrier_home', 'Colissimo'),
            'relay' => (string) config('shipping.carrier_relay', 'Mondial Relay'),
        ];
    }

    /**
     * @return array{provider: string, google_maps_key: string|null, maplibre_style_url: string|null}
     */
    public function mapsConfig(): array
    {
        $provider = (string) config('services.maps.provider', 'maplibre');
        if (! in_array($provider, ['google', 'maplibre'], true)) {
            $provider = 'maplibre';
        }

        $googleKey = trim((string) config('services.google.maps_key', ''));
        $styleUrl = trim((string) config('services.maps.maplibre_style_url', ''));

        return [
            'provider' => $provider,
            'google_maps_key' => $provider === 'google' && $googleKey !== '' ? $googleKey : null,
            'maplibre_style_url' => $provider === 'maplibre'
                ? ($styleUrl !== '' ? $styleUrl : null)
                : null,
        ];
    }

    private function extractPostalCode(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        if (preg_match('/\b(\d{5})\b/', $value, $matches) !== 1) {
            return null;
        }

        return $matches[1];
    }

    private function extractCity(?string $query, ?string $postalCode): ?string
    {
        if ($query === null || $query === '') {
            return null;
        }

        $city = $query;
        if ($postalCode !== null) {
            $city = preg_replace('/\b'.preg_quote($postalCode, '/').'\b/', ' ', $city) ?? $city;
        }
        // Retire un éventuel début de rue (chiffres + voie) pour ne garder la ville en fin de libellé BAN.
        if (preg_match('/\b(\d{5})\b\s+(.+)$/u', $query, $matches) === 1) {
            $city = trim($matches[2]);
        } else {
            $city = trim(preg_replace('/^\d+\s+.+\s+\d{5}\s+/u', '', $query.' ') ?? $city);
        }

        $city = trim($city, " \t\n\r\0\x0B,;-");

        return $city !== '' ? $city : null;
    }

    /**
     * @param  array<string, mixed>  $input
     */
    public function checkout(User $actor, Pair $pair, array $input, Request $request): Shipment
    {
        if ($pair->status !== PairStatus::ARecuperer) {
            throw ValidationException::withMessages([
                'uuid' => 'La livraison à distance n’est possible que pour une paire à récupérer.',
            ]);
        }

        if (! ($input['consent_address'] ?? false)) {
            throw ValidationException::withMessages([
                'consent_address' => 'Le consentement à l’usage de l’adresse pour l’expédition est obligatoire.',
            ]);
        }

        $mode = (string) $input['mode'];
        $relay = $this->resolveRelay($mode, $input['relay_id'] ?? null);

        $this->forgetUnpaid($pair);

        $carriers = $this->carriers();
        $shipment = Shipment::query()->create([
            'pair_id' => $pair->id,
            'status' => 'pending_payment',
            'mode' => $mode,
            'carrier' => $mode === 'relay' ? $carriers['relay'] : $carriers['home'],
            'price_cents' => (int) config('shipping.price_cents'),
            'recipient_first_name' => $input['recipient_first_name'],
            'recipient_last_name' => $input['recipient_last_name'],
            'address_line' => $relay['address'] ?? $input['address_line'],
            'postal_code' => $relay['postal_code'] ?? $input['postal_code'],
            'city' => $relay['city'] ?? $input['city'],
            'relay_id' => $relay['id'] ?? null,
            'relay_name' => $relay['name'] ?? null,
            'consent_address_at' => now(),
        ]);

        try {
            $front = rtrim((string) config('app.frontend_url'), '/');
            $session = $this->stripe->createCheckoutSession(
                (int) $shipment->price_cents,
                (string) config('shipping.currency'),
                'Envoi lunettes '.$pair->assigned_code,
                $front.'/client/lunettes/'.$pair->uuid.'?paiement=ok&session_id={CHECKOUT_SESSION_ID}',
                $front.'/client/lunettes/'.$pair->uuid.'/livraison?paiement=echec&session_id={CHECKOUT_SESSION_ID}',
                [
                    'pair_uuid' => $pair->uuid,
                    'shipment_uuid' => $shipment->uuid,
                ],
            );
        } catch (ValidationException $exception) {
            $shipment->delete();
            throw $exception;
        }

        $shipment->payment_ref = $session->id;
        $shipment->save();
        $shipment->setAttribute('checkout_url', $session->url);

        $this->audit->record($actor, 'shipment.checkout', $request, [
            'pair_uuid' => $pair->uuid,
            'shipment_uuid' => $shipment->uuid,
        ]);

        return $shipment;
    }

    /**
     * @param  array{session_id?: string}  $input
     */
    public function pay(User $actor, Pair $pair, array $input, Request $request): Shipment
    {
        $shipment = $this->pendingFor($pair);
        $sessionId = (string) ($input['session_id'] ?? '');

        if ($sessionId === '' || $sessionId !== (string) $shipment->payment_ref) {
            throw ValidationException::withMessages([
                'session_id' => 'Paiement introuvable.',
            ]);
        }

        $session = $this->stripe->retrieveCheckoutSession($sessionId);
        $paid = $session->payment_status === 'paid'
            && (int) $session->amount_total === (int) $shipment->price_cents;

        if (! $paid) {
            $shipment->status = 'failed';
            $shipment->save();
            $this->audit->record($actor, 'shipment.payment_failed', $request, [
                'pair_uuid' => $pair->uuid,
                'shipment_uuid' => $shipment->uuid,
            ]);

            throw ValidationException::withMessages([
                'payment' => 'Le paiement a échoué. Aucune demande d’expédition n’a été créée.',
            ]);
        }

        $paid = DB::transaction(function () use ($actor, $pair, $shipment, $session, $request): Shipment {
            $pair->status = PairStatus::LivraisonDemandee;
            $pair->save();
            $this->recordEvent($pair, 'delivery_requested');

            $shipment->status = 'paid';
            $shipment->paid_at = now();
            $shipment->payment_ref = $session->id;
            $shipment->label_ref = 'BL-'.now()->format('Ymd').'-'.strtoupper(substr($pair->assigned_code, -4));
            $shipment->tracking_ref = $shipment->label_ref;
            $shipment->save();

            $shop = $pair->depositaryOptician;
            if ($shop !== null) {
                $this->inbox->notifyRemoteDelivery($shop, $pair->fresh(['client']), $shipment->fresh());
                $this->inbox->notifyShippingLabel($shop, $pair->fresh(['client']), $shipment->fresh());
            }

            $this->audit->record($actor, 'shipment.paid', $request, [
                'pair_uuid' => $pair->uuid,
                'shipment_uuid' => $shipment->uuid,
            ]);

            return $shipment->fresh();
        });

        $this->ensureCarrierLabel(
            $paid,
            $pair->fresh(['client']) ?? $pair,
            $pair->depositaryOptician,
        );

        return $paid->fresh() ?? $paid;
    }

    public function markShipped(Optician $shop, User $actor, Pair $pair, Request $request): Pair
    {
        if ($pair->depositary_optician_id !== $shop->id || $pair->status !== PairStatus::LivraisonDemandee) {
            throw ValidationException::withMessages([
                'uuid' => 'Dossier introuvable.',
            ]);
        }

        $shipment = $this->paidFor($pair);
        if ($shipment === null) {
            throw ValidationException::withMessages([
                'uuid' => 'Aucun bordereau payé n’est associé à ce dossier.',
            ]);
        }

        return DB::transaction(function () use ($actor, $pair, $shipment, $request): Pair {
            $pair->status = PairStatus::EnLivraison;
            $pair->save();
            $this->recordEvent($pair, 'shipped');
            $shipment->status = 'in_transit';
            $shipment->shipped_at = now();
            $shipment->save();

            $client = $pair->client;
            if ($client !== null && $client->consent_email) {
                $this->notifications->sendEmail(
                    $client->email,
                    'shipment_shipped',
                    new ShipmentShippedMail($client->first_name, $pair, $shipment),
                );
            }

            $this->audit->record($actor, 'shipment.shipped', $request, [
                'pair_uuid' => $pair->uuid,
            ]);

            return $pair->fresh()->load(['client.opticians', 'events', 'shipments']);
        });
    }

    /**
     * @param  list<string>  $uuids
     * @return list<array{uuid: string, filename: string, content: string, encoding: string, mime: string}>
     */
    public function labelsForShop(Optician $shop, array $uuids, bool $bulk = true): array
    {
        $labels = [];
        foreach ($uuids as $uuid) {
            $query = Pair::query()
                ->depositedAt($shop->id)
                ->where('uuid', $uuid);
            if ($bulk) {
                $query->where('status', PairStatus::LivraisonDemandee);
            } else {
                $query->whereIn('status', [PairStatus::LivraisonDemandee, PairStatus::EnLivraison]);
            }
            $pair = $query->with('client')->first();
            if ($pair === null) {
                throw ValidationException::withMessages([
                    'uuids' => $bulk
                        ? 'Seules les paires en livraison demandée de votre magasin peuvent être sélectionnées.'
                        : 'Bordereau introuvable.',
                ]);
            }
            $shipment = $this->paidFor($pair);
            if ($shipment === null) {
                throw ValidationException::withMessages([
                    'uuids' => 'Bordereau introuvable.',
                ]);
            }

            $this->ensureCarrierLabel($shipment, $pair, $shop);
            $shipment = $shipment->fresh() ?? $shipment;
            $labels[] = $this->labelFilePayload($pair, $shipment);
        }

        return $labels;
    }

    /**
     * @return array{uuid: string, filename: string, content: string, encoding: string, mime: string}
     */
    private function labelFilePayload(Pair $pair, Shipment $shipment): array
    {
        $pdfBinary = null;
        if (filled($shipment->label_pdf)) {
            $decoded = base64_decode((string) $shipment->label_pdf, true);
            if (is_string($decoded) && str_starts_with($decoded, '%PDF')) {
                $pdfBinary = $decoded;
            }
        }

        if ($pdfBinary === null && filled($shipment->label_url)) {
            $pdfBinary = $this->mondialRelay->downloadLabelPdf((string) $shipment->label_url);
            if (is_string($pdfBinary) && $pdfBinary !== '') {
                $shipment->label_pdf = base64_encode($pdfBinary);
                $shipment->save();
            }
        }

        if (is_string($pdfBinary) && $pdfBinary !== '') {
            return [
                'uuid' => $pair->uuid,
                'filename' => 'etiquette-'.$pair->assigned_code.'.pdf',
                'content' => base64_encode($pdfBinary),
                'encoding' => 'base64',
                'mime' => 'application/pdf',
            ];
        }

        return [
            'uuid' => $pair->uuid,
            'filename' => 'bordereau-'.$pair->assigned_code.'.txt',
            'content' => $shipment->labelBody($pair),
            'encoding' => 'plain',
            'mime' => 'text/plain;charset=utf-8',
        ];
    }

    private function ensureCarrierLabel(Shipment $shipment, Pair $pair, ?Optician $shop): void
    {
        if (filled($shipment->label_url) || filled($shipment->label_pdf)) {
            return;
        }

        if ($shop === null) {
            return;
        }

        $client = $pair->client;
        $senderStreet = $this->splitStreet((string) ($shop->address ?? 'Adresse magasin'));
        $recipientStreet = $this->splitStreet((string) $shipment->address_line);
        $orderNo = strtoupper(substr(str_replace('-', '', (string) $pair->assigned_code).substr((string) $shipment->uuid, 0, 6), 0, 15));

        $sender = [
            'firstname' => 'Magasin',
            'lastname' => $this->opticianLastName($shop),
            'company' => (string) $shop->name,
            'street' => $senderStreet['street'],
            'house_no' => $senderStreet['house_no'],
            'postal_code' => (string) ($shop->postal_code ?: $shipment->postal_code),
            'city' => (string) ($shop->city ?: $shipment->city),
            'phone' => (string) ($shop->phone ?: '0600000000'),
            'email' => (string) ($shop->email ?: ''),
        ];
        $recipient = [
            'firstname' => (string) $shipment->recipient_first_name,
            'lastname' => (string) $shipment->recipient_last_name,
            'street' => $recipientStreet['street'],
            'house_no' => $recipientStreet['house_no'],
            'postal_code' => (string) $shipment->postal_code,
            'city' => (string) $shipment->city,
            'phone' => (string) ($client?->phone ?: '0600000000'),
            'email' => (string) ($client?->email ?: ''),
        ];

        if ($shipment->mode === 'relay') {
            $created = $this->mondialRelay->createShipmentLabel([
                'order_no' => $orderNo,
                'customer_no' => strtoupper(substr(preg_replace('/\W/', '', (string) ($client?->id ?? $pair->id)) ?? 'CLIENT', 0, 9)),
                'mode' => 'relay',
                'relay_id' => $shipment->relay_id,
                'content' => 'Lunettes '.$pair->type,
                'weight_grams' => 200,
                'sender' => $sender,
                'recipient' => $recipient,
            ]);

            if ($created === null) {
                return;
            }

            $shipment->carrier_shipment_number = $created['shipment_number'];
            $shipment->label_url = $created['label_url'];
            $shipment->tracking_ref = $created['shipment_number'];
            $shipment->label_ref = $created['shipment_number'];
            $shipment->save();

            return;
        }

        $created = $this->colissimo->createHomeLabel([
            'order_no' => $orderNo,
            'weight_kg' => 0.2,
            'commercial_name' => 'Perdues de Vue',
            'sender' => $sender,
            'recipient' => $recipient,
        ]);

        if ($created === null) {
            return;
        }

        $shipment->carrier_shipment_number = $created['shipment_number'];
        $shipment->label_pdf = base64_encode($created['label_pdf']);
        $shipment->label_url = null;
        $shipment->tracking_ref = $created['shipment_number'];
        $shipment->label_ref = $created['shipment_number'];
        $shipment->save();
    }

    /**
     * @return array{house_no: string, street: string}
     */
    private function splitStreet(string $addressLine): array
    {
        $addressLine = trim($addressLine);
        if (preg_match('/^(\d+[A-Za-z]?)\s+(.+)$/u', $addressLine, $matches) === 1) {
            return [
                'house_no' => $matches[1],
                'street' => $matches[2],
            ];
        }

        return [
            'house_no' => '',
            'street' => $addressLine !== '' ? $addressLine : 'Adresse',
        ];
    }

    private function opticianLastName(Optician $shop): string
    {
        $name = trim((string) $shop->name);

        return $name !== '' ? mb_substr($name, 0, 32) : 'Opticien';
    }

    public function currentFor(Pair $pair): ?Shipment
    {
        return Shipment::query()
            ->where('pair_id', $pair->id)
            ->whereIn('status', ['paid', 'in_transit'])
            ->latest('id')
            ->first();
    }

    public function pendingFor(Pair $pair): Shipment
    {
        $shipment = Shipment::query()
            ->where('pair_id', $pair->id)
            ->where('status', 'pending_payment')
            ->latest('id')
            ->first();

        if ($shipment === null) {
            throw ValidationException::withMessages([
                'uuid' => 'Aucune demande de livraison en attente de paiement.',
            ]);
        }

        return $shipment;
    }

    public function paidFor(Pair $pair): ?Shipment
    {
        return $this->currentFor($pair);
    }

    /**
     * @return array{id: string, name: string, address: string, postal_code: string, city: string, lat: float|null, lng: float|null}|array{}
     */
    private function resolveRelay(string $mode, ?string $relayId): array
    {
        if ($mode !== 'relay') {
            return [];
        }

        if ($relayId === null || trim($relayId) === '') {
            throw ValidationException::withMessages([
                'relay_id' => 'Sélectionnez un point relais.',
            ]);
        }

        $relay = $this->mondialRelay->findRelay($relayId);
        if ($relay === null) {
            throw ValidationException::withMessages([
                'relay_id' => 'Sélectionnez un point relais valide.',
            ]);
        }

        return $relay;
    }

    private function forgetUnpaid(Pair $pair): void
    {
        $previous = Shipment::query()
            ->where('pair_id', $pair->id)
            ->whereIn('status', ['pending_payment', 'failed'])
            ->get();

        foreach ($previous as $old) {
            if (filled($old->payment_ref) && str_starts_with((string) $old->payment_ref, 'cs_')) {
                $this->stripe->expireCheckoutSession((string) $old->payment_ref);
            }
            $old->status = 'failed';
            $old->save();
        }
    }

    private function recordEvent(Pair $pair, string $type): void
    {
        PairEvent::query()->create([
            'pair_id' => $pair->id,
            'type' => $type,
        ]);
    }
}
