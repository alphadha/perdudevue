<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ColissimoGateway
{
    private const DEFAULT_REST_URL = 'https://ws.colissimo.fr/sls-ws/SlsServiceWSRest/2.0';

    /**
     * Affranchissement domicile (productCode DOM) — étiquette PDF.
     *
     * Auth préférée : header `apiKey` (clé Web Services Colissimo Entreprise).
     * Fallback legacy : contractNumber + password dans le body.
     *
     * @param  array{
     *     order_no: string,
     *     sender: array{company?: string|null, firstname?: string|null, lastname?: string|null, street: string, house_no?: string, postal_code: string, city: string, phone?: string|null, email?: string|null},
     *     recipient: array{firstname: string, lastname: string, street: string, house_no?: string, postal_code: string, city: string, phone?: string|null, email?: string|null},
     *     weight_kg?: float,
     *     commercial_name?: string
     * }  $payload
     * @return array{shipment_number: string, label_pdf: string}|null
     */
    public function createHomeLabel(array $payload): ?array
    {
        $credentials = $this->credentials();
        if ($credentials === null) {
            Log::info('colissimo.label_skipped_missing_credentials');

            return null;
        }

        $body = $this->buildGenerateLabelBody($credentials, $payload);
        $request = Http::timeout(30)
            ->accept('application/json')
            ->asJson();

        if (($credentials['auth'] ?? '') === 'api_key') {
            $request = $request->withHeaders(['apiKey' => $credentials['api_key']]);
        }

        try {
            $response = $request->post(rtrim($credentials['api_url'], '/').'/generateLabel', $body);
        } catch (ConnectionException $exception) {
            Log::warning('colissimo.label_connection_failed', [
                'message' => $exception->getMessage(),
            ]);

            return null;
        }

        if (! $response->successful()) {
            Log::warning('colissimo.label_http_failed', [
                'status' => $response->status(),
                'body' => mb_substr($response->body(), 0, 500),
            ]);

            return null;
        }

        return $this->parseGenerateLabelResponse($response->body(), $response->header('Content-Type'));
    }

    /**
     * @return array{auth: 'api_key', api_key: string, api_url: string}|array{auth: 'password', contract_number: string, password: string, api_url: string}|null
     */
    public function credentials(): ?array
    {
        $mode = (string) config('services.colissimo.mode', 'test');
        $isProd = $mode === 'production';

        $apiKey = trim((string) config($isProd
            ? 'services.colissimo.api_key'
            : 'services.colissimo.test_api_key'));
        // Compat : ancienne saisie dans password si ça ressemble à une clé WS (longue).
        if ($apiKey === '') {
            $legacyPassword = trim((string) config($isProd
                ? 'services.colissimo.password'
                : 'services.colissimo.test_password'));
            if (strlen($legacyPassword) > 20) {
                $apiKey = $legacyPassword;
            }
        }

        $apiUrl = trim((string) config($isProd
            ? 'services.colissimo.api_url'
            : 'services.colissimo.test_api_url'));

        if ($apiUrl === '') {
            $apiUrl = self::DEFAULT_REST_URL;
        }

        $apiUrl = preg_replace('#/SlsServiceWS(?:\?.*)?$#', '/SlsServiceWSRest/2.0', $apiUrl) ?? $apiUrl;
        $apiUrl = rtrim($apiUrl, '/');

        if ($apiKey !== '') {
            return [
                'auth' => 'api_key',
                'api_key' => $apiKey,
                'api_url' => $apiUrl,
            ];
        }

        $contract = trim((string) config($isProd
            ? 'services.colissimo.contract_number'
            : 'services.colissimo.test_contract_number'));
        $password = (string) config($isProd
            ? 'services.colissimo.password'
            : 'services.colissimo.test_password');

        if ($contract === '' || $password === '') {
            return null;
        }

        return [
            'auth' => 'password',
            'contract_number' => $contract,
            'password' => $password,
            'api_url' => $apiUrl,
        ];
    }

    /**
     * @param  array{auth: string, api_key?: string, contract_number?: string, password?: string, api_url: string}  $credentials
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function buildGenerateLabelBody(array $credentials, array $payload): array
    {
        $sender = $payload['sender'] ?? [];
        $recipient = $payload['recipient'] ?? [];
        $weight = max(0.01, round((float) ($payload['weight_kg'] ?? 0.2), 2));
        $orderNo = mb_substr(preg_replace('/[^0-9A-Za-z_\-]/', '', (string) ($payload['order_no'] ?? 'PDV')) ?? 'PDV', 0, 35);
        $commercial = mb_substr((string) ($payload['commercial_name'] ?? 'Perdues de Vue'), 0, 35);

        $senderLine = trim(trim((string) ($sender['house_no'] ?? '')).' '.trim((string) ($sender['street'] ?? '')));
        $recipientLine = trim(trim((string) ($recipient['house_no'] ?? '')).' '.trim((string) ($recipient['street'] ?? '')));

        $body = [
            'outputFormat' => [
                'x' => 0,
                'y' => 0,
                'outputPrintingType' => 'PDF_A4_300dpi',
            ],
            'letter' => [
                'service' => [
                    'productCode' => 'DOM',
                    'depositDate' => now()->format('Y-m-d'),
                    'orderNumber' => $orderNo !== '' ? $orderNo : 'PDV',
                    'commercialName' => $commercial !== '' ? $commercial : 'Perdues de Vue',
                ],
                'parcel' => [
                    'weight' => $weight,
                ],
                'sender' => [
                    'senderParcelRef' => $orderNo !== '' ? $orderNo : 'PDV',
                    'address' => [
                        'companyName' => mb_substr((string) ($sender['company'] ?? 'Opticien'), 0, 35),
                        'lastName' => mb_substr((string) ($sender['lastname'] ?? 'Magasin'), 0, 35),
                        'firstName' => mb_substr((string) ($sender['firstname'] ?? ''), 0, 29),
                        'line2' => mb_substr($senderLine !== '' ? $senderLine : 'Adresse', 0, 35),
                        'countryCode' => 'FR',
                        'city' => mb_substr((string) ($sender['city'] ?? ''), 0, 35),
                        'zipCode' => preg_replace('/\s+/', '', (string) ($sender['postal_code'] ?? '')) ?? '',
                        'phoneNumber' => $this->normalizeFrPhone((string) ($sender['phone'] ?? '')),
                        'email' => mb_substr(trim((string) ($sender['email'] ?? '')), 0, 80),
                    ],
                ],
                'addressee' => [
                    'addresseeParcelRef' => $orderNo !== '' ? $orderNo : 'PDV',
                    'address' => [
                        'lastName' => mb_substr((string) ($recipient['lastname'] ?? ''), 0, 35),
                        'firstName' => mb_substr((string) ($recipient['firstname'] ?? ''), 0, 29),
                        'line2' => mb_substr($recipientLine !== '' ? $recipientLine : 'Adresse', 0, 35),
                        'countryCode' => 'FR',
                        'city' => mb_substr((string) ($recipient['city'] ?? ''), 0, 35),
                        'zipCode' => preg_replace('/\s+/', '', (string) ($recipient['postal_code'] ?? '')) ?? '',
                        'mobileNumber' => $this->normalizeFrPhone((string) ($recipient['phone'] ?? '')),
                        'email' => mb_substr(trim((string) ($recipient['email'] ?? '')), 0, 80),
                    ],
                ],
            ],
        ];

        if (($credentials['auth'] ?? '') === 'password') {
            $body['contractNumber'] = $credentials['contract_number'] ?? '';
            $body['password'] = $credentials['password'] ?? '';
        }

        return $body;
    }

    /**
     * @return array{shipment_number: string, label_pdf: string}|null
     */
    private function parseGenerateLabelResponse(string $body, ?string $contentType): ?array
    {
        $messageId = null;
        if (preg_match('/"id"\s*:\s*"([^"]+)"/', $body, $matches) === 1
            || preg_match('/<id>([^<]+)<\/id>/', $body, $matches) === 1) {
            $messageId = trim($matches[1]);
        }

        if ($messageId !== null && $messageId !== '0') {
            $message = '';
            if (preg_match('/"messageContent"\s*:\s*"([^"]*)"/', $body, $msgMatches) === 1
                || preg_match('/<messageContent>([^<]*)<\/messageContent>/', $body, $msgMatches) === 1) {
                $message = $msgMatches[1];
            }
            Log::warning('colissimo.label_status_error', [
                'id' => $messageId,
                'message' => $message,
                'content_type' => $contentType,
            ]);

            return null;
        }

        $parcelNumber = null;
        if (preg_match('/"parcelNumber"\s*:\s*"([^"]+)"/', $body, $matches) === 1
            || preg_match('/<parcelNumber>([^<]+)<\/parcelNumber>/', $body, $matches) === 1) {
            $parcelNumber = trim($matches[1]);
        }

        $pdfStart = strpos($body, '%PDF');
        $pdfEnd = $pdfStart === false ? false : strrpos($body, '%%EOF');
        $pdf = null;
        if ($pdfStart !== false && $pdfEnd !== false && $pdfEnd > $pdfStart) {
            $pdf = substr($body, $pdfStart, $pdfEnd - $pdfStart + 5);
        }

        if ($parcelNumber === null || $parcelNumber === '' || ! is_string($pdf) || $pdf === '') {
            Log::warning('colissimo.label_missing_output', [
                'has_parcel' => $parcelNumber !== null && $parcelNumber !== '',
                'has_pdf' => is_string($pdf) && $pdf !== '',
                'content_type' => $contentType,
            ]);

            return null;
        }

        return [
            'shipment_number' => $parcelNumber,
            'label_pdf' => $pdf,
        ];
    }

    private function normalizeFrPhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';
        if ($digits === '') {
            return '0600000000';
        }
        if (str_starts_with($digits, '33') && strlen($digits) >= 11) {
            return '0'.substr($digits, 2, 9);
        }
        if (strlen($digits) === 9) {
            return '0'.$digits;
        }

        return substr($digits, 0, 10);
    }
}
