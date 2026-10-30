<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use SimpleXMLElement;

class MondialRelayGateway
{
    private const SOAP_NS = 'http://www.mondialrelay.fr/webservice/';

    private const SOAP_ACTION = 'http://www.mondialrelay.fr/webservice/WSI4_PointRelais_Recherche';

    /**
     * @return list<array{id: string, name: string, address: string, postal_code: string, city: string, lat: float|null, lng: float|null}>
     */
    public function searchRelays(
        string $postalCode,
        string $country = 'FR',
        int $limit = 6,
        ?string $city = null,
        ?float $latitude = null,
        ?float $longitude = null,
        int $radiusKm = 5,
    ): array {
        $postalCode = preg_replace('/\s+/', '', $postalCode) ?? '';
        if ($postalCode === '') {
            return [];
        }

        $city = $city !== null ? trim($city) : '';
        if ($city !== '') {
            $city = strtoupper($this->stripAccents($city));
        }

        $hasCoords = $latitude !== null && $longitude !== null;
        $points = $this->request([
            'Pays' => strtoupper($country),
            'NumPointRelais' => '',
            'Ville' => $hasCoords ? '' : $city,
            'CP' => $postalCode,
            'Latitude' => $this->formatMrCoordinate($latitude),
            'Longitude' => $this->formatMrCoordinate($longitude),
            'Taille' => '',
            'Poids' => '',
            'Action' => '',
            'DelaiEnvoi' => '',
            'RayonRecherche' => (string) max(1, min($radiusKm, 20)),
            'TypeActivite' => '',
            'NACE' => '',
            'NombreResultats' => (string) max(1, min($limit, 8)),
        ]);

        $mapped = array_map(fn (array $point) => $this->mapPoint($point), $points);
        usort($mapped, fn (array $a, array $b) => ($a['distance_m'] ?? PHP_INT_MAX) <=> ($b['distance_m'] ?? PHP_INT_MAX));

        return array_values(array_slice($mapped, 0, max(1, min($limit, 8))));
    }

    private function stripAccents(string $value): string
    {
        $converted = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);

        return $converted === false ? $value : $converted;
    }

    /**
     * @return array{id: string, name: string, address: string, postal_code: string, city: string, lat: float|null, lng: float|null}|null
     */
    public function findRelay(string $relayId, string $country = 'FR'): ?array
    {
        $relayId = trim($relayId);
        if ($relayId === '') {
            return null;
        }

        $points = $this->request([
            'Pays' => strtoupper($country),
            'NumPointRelais' => $relayId,
            'Ville' => '',
            'CP' => '',
            'Latitude' => '',
            'Longitude' => '',
            'Taille' => '',
            'Poids' => '',
            'Action' => '',
            'DelaiEnvoi' => '',
            'RayonRecherche' => '',
            'TypeActivite' => '',
            'NACE' => '',
            'NombreResultats' => '1',
        ]);

        $first = $points[0] ?? null;

        return $first === null ? null : $this->mapPoint($first);
    }

    /**
     * @param  array<string, string>  $fields
     * @return list<array<string, string>>
     */
    private function request(array $fields): array
    {
        $config = config('services.mondial_relay.api1');
        $url = trim((string) ($config['url'] ?? ''));
        $enseigne = trim((string) ($config['enseigne'] ?? ''));
        $privateKey = (string) ($config['private_key'] ?? '');

        if ($url === '' || $enseigne === '' || $privateKey === '') {
            throw ValidationException::withMessages([
                'relay_id' => 'La recherche de points relais est momentanément indisponible.',
            ]);
        }

        $securityFields = [
            $enseigne,
            $fields['Pays'],
            $fields['NumPointRelais'],
            $fields['Ville'],
            $fields['CP'],
            $fields['Latitude'],
            $fields['Longitude'],
            $fields['Taille'],
            $fields['Poids'],
            $fields['Action'],
            $fields['DelaiEnvoi'],
            $fields['RayonRecherche'],
            $fields['TypeActivite'],
            $fields['NombreResultats'],
        ];
        $security = strtoupper(md5(implode('', $securityFields).$privateKey));

        $xml = $this->buildSoapEnvelope($enseigne, $fields, $security);

        try {
            $response = Http::timeout(20)
                ->withHeaders([
                    'Content-Type' => 'text/xml; charset=utf-8',
                    'SOAPAction' => '"'.self::SOAP_ACTION.'"',
                ])
                ->withBody($xml, 'text/xml; charset=utf-8')
                ->post($url);
        } catch (ConnectionException $exception) {
            Log::warning('mondial_relay.search_connection_failed', [
                'message' => $exception->getMessage(),
            ]);
            throw ValidationException::withMessages([
                'relay_id' => 'La recherche de points relais est momentanément indisponible.',
            ]);
        }

        if (! $response->successful()) {
            Log::warning('mondial_relay.search_http_failed', [
                'status' => $response->status(),
            ]);
            throw ValidationException::withMessages([
                'relay_id' => 'La recherche de points relais est momentanément indisponible.',
            ]);
        }

        return $this->parsePoints((string) $response->body());
    }

    /**
     * @param  array<string, string>  $fields
     */
    private function buildSoapEnvelope(string $enseigne, array $fields, string $security): string
    {
        $escape = static fn (string $value): string => htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');

        $body = '<WSI4_PointRelais_Recherche xmlns="'.self::SOAP_NS.'">'
            .'<Enseigne>'.$escape($enseigne).'</Enseigne>'
            .'<Pays>'.$escape($fields['Pays']).'</Pays>'
            .'<NumPointRelais>'.$escape($fields['NumPointRelais']).'</NumPointRelais>'
            .'<Ville>'.$escape($fields['Ville']).'</Ville>'
            .'<CP>'.$escape($fields['CP']).'</CP>'
            .'<Latitude>'.$escape($fields['Latitude']).'</Latitude>'
            .'<Longitude>'.$escape($fields['Longitude']).'</Longitude>'
            .'<Taille>'.$escape($fields['Taille']).'</Taille>'
            .'<Poids>'.$escape($fields['Poids']).'</Poids>'
            .'<Action>'.$escape($fields['Action']).'</Action>'
            .'<DelaiEnvoi>'.$escape($fields['DelaiEnvoi']).'</DelaiEnvoi>'
            .'<RayonRecherche>'.$escape($fields['RayonRecherche']).'</RayonRecherche>'
            .'<TypeActivite>'.$escape($fields['TypeActivite']).'</TypeActivite>'
            .'<NACE>'.$escape($fields['NACE']).'</NACE>'
            .'<NombreResultats>'.$escape($fields['NombreResultats']).'</NombreResultats>'
            .'<Security>'.$escape($security).'</Security>'
            .'</WSI4_PointRelais_Recherche>';

        return '<?xml version="1.0" encoding="utf-8"?>'
            .'<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
            .'xmlns:xsd="http://www.w3.org/2001/XMLSchema" '
            .'xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">'
            .'<soap:Body>'.$body.'</soap:Body>'
            .'</soap:Envelope>';
    }

    /**
     * @return list<array<string, string>>
     */
    private function parsePoints(string $body): array
    {
        try {
            $xml = new SimpleXMLElement($body);
        } catch (\Exception) {
            throw ValidationException::withMessages([
                'relay_id' => 'Réponse transporteur invalide.',
            ]);
        }

        $xml->registerXPathNamespace('soap', 'http://schemas.xmlsoap.org/soap/envelope/');
        $xml->registerXPathNamespace('mr', self::SOAP_NS);

        $statNodes = $xml->xpath('//mr:WSI4_PointRelais_RechercheResult/mr:STAT');
        $stat = trim((string) ($statNodes[0] ?? ''));
        if ($stat !== '0') {
            Log::warning('mondial_relay.search_stat', ['stat' => $stat]);
            throw ValidationException::withMessages([
                'relay_id' => 'La recherche de points relais a échoué (transporteur).',
            ]);
        }

        $nodes = $xml->xpath('//mr:PointRelais_Details') ?: [];
        $points = [];
        foreach ($nodes as $node) {
            $points[] = [
                'Num' => trim((string) ($node->Num ?? '')),
                'LgAdr1' => trim((string) ($node->LgAdr1 ?? '')),
                'LgAdr3' => trim((string) ($node->LgAdr3 ?? '')),
                'CP' => trim((string) ($node->CP ?? '')),
                'Ville' => trim((string) ($node->Ville ?? '')),
                'Latitude' => trim((string) ($node->Latitude ?? '')),
                'Longitude' => trim((string) ($node->Longitude ?? '')),
                'Distance' => trim((string) ($node->Distance ?? '')),
            ];
        }

        return array_values(array_filter($points, fn (array $point) => $point['Num'] !== ''));
    }

    /**
     * @param  array<string, string>  $point
     * @return array{id: string, name: string, address: string, postal_code: string, city: string, lat: float|null, lng: float|null, distance_m: int|null}
     */
    private function mapPoint(array $point): array
    {
        $distance = preg_replace('/\D/', '', $point['Distance'] ?? '') ?? '';

        return [
            'id' => $point['Num'],
            'name' => $point['LgAdr1'] !== '' ? $point['LgAdr1'] : 'Point relais '.$point['Num'],
            'address' => $point['LgAdr3'] !== '' ? $point['LgAdr3'] : $point['LgAdr1'],
            'postal_code' => $point['CP'],
            'city' => $point['Ville'],
            'lat' => $this->parseCoordinate($point['Latitude'] ?? ''),
            'lng' => $this->parseCoordinate($point['Longitude'] ?? ''),
            'distance_m' => $distance !== '' ? (int) $distance : null,
        ];
    }

    private function formatMrCoordinate(?float $value): string
    {
        if ($value === null) {
            return '';
        }

        // API1 sandbox : séparateur décimal point (STAT 67 si virgule).
        return sprintf('%.6f', $value);
    }

    private function parseCoordinate(string $value): ?float
    {
        $normalized = str_replace(',', '.', trim($value));
        if ($normalized === '' || ! is_numeric($normalized)) {
            return null;
        }

        return (float) $normalized;
    }

    /**
     * API2 Dual Carrier — création d’expédition + URL PDF (étiquette avec code-barres / QR).
     *
     * @param  array{
     *     order_no: string,
     *     customer_no: string,
     *     mode: 'home'|'relay',
     *     relay_id?: string|null,
     *     sender: array{firstname: string, lastname: string, street: string, house_no?: string, postal_code: string, city: string, phone?: string|null, email?: string|null, company?: string|null},
     *     recipient: array{firstname: string, lastname: string, street: string, house_no?: string, postal_code: string, city: string, phone?: string|null, email?: string|null},
     *     content?: string,
     *     weight_grams?: int
     * }  $payload
     * @return array{shipment_number: string, label_url: string}|null
     */
    public function createShipmentLabel(array $payload): ?array
    {
        $config = config('services.mondial_relay.api2');
        $url = trim((string) ($config['url'] ?? ''));
        $login = trim((string) ($config['login'] ?? ''));
        $password = (string) ($config['password'] ?? '');
        $customerId = trim((string) ($config['brand_id'] ?? ''));

        if ($url === '' || $login === '' || $password === '' || $customerId === '') {
            Log::info('mondial_relay.label_skipped_missing_credentials');

            return null;
        }

        $xml = $this->buildShipmentCreationXml($login, $password, $customerId, $payload);

        try {
            $response = Http::timeout(30)
                ->withHeaders([
                    'Content-Type' => 'text/xml; charset=utf-8',
                    'Accept' => 'application/xml',
                ])
                ->withBody($xml, 'text/xml; charset=utf-8')
                ->post($url);
        } catch (ConnectionException $exception) {
            Log::warning('mondial_relay.label_connection_failed', [
                'message' => $exception->getMessage(),
            ]);

            return null;
        }

        if (! $response->successful()) {
            Log::warning('mondial_relay.label_http_failed', [
                'status' => $response->status(),
            ]);

            return null;
        }

        return $this->parseShipmentCreationResponse((string) $response->body());
    }

    public function downloadLabelPdf(string $labelUrl): ?string
    {
        $labelUrl = trim($labelUrl);
        if ($labelUrl === '') {
            return null;
        }

        try {
            $response = Http::timeout(30)->get($labelUrl);
        } catch (ConnectionException $exception) {
            Log::warning('mondial_relay.label_pdf_download_failed', [
                'message' => $exception->getMessage(),
            ]);

            return null;
        }

        if (! $response->successful()) {
            Log::warning('mondial_relay.label_pdf_http_failed', [
                'status' => $response->status(),
            ]);

            return null;
        }

        $body = $response->body();
        if ($body === '' || ! str_starts_with($body, '%PDF')) {
            Log::warning('mondial_relay.label_pdf_invalid_body');

            return null;
        }

        return $body;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function buildShipmentCreationXml(string $login, string $password, string $customerId, array $payload): string
    {
        $escape = static fn (string $value): string => htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');

        $mode = (string) ($payload['mode'] ?? 'home');
        $deliveryMode = $mode === 'relay' ? '24R' : 'HOM';
        $deliveryLocation = $mode === 'relay'
            ? preg_replace('/\D/', '', (string) ($payload['relay_id'] ?? '')) ?? ''
            : '';

        $weight = max(10, (int) ($payload['weight_grams'] ?? 200));
        $content = $this->sanitizeMrText((string) ($payload['content'] ?? 'Lunettes'), 40);
        $orderNo = $this->sanitizeMrRef((string) ($payload['order_no'] ?? ''), 15);
        $customerNo = $this->sanitizeMrRef((string) ($payload['customer_no'] ?? ''), 9);

        $sender = $payload['sender'] ?? [];
        $recipient = $payload['recipient'] ?? [];

        return '<?xml version="1.0" encoding="utf-8"?>'
            .'<ShipmentCreationRequest xmlns="http://www.example.org/Request">'
            .'<Context>'
            .'<Login>'.$escape($login).'</Login>'
            .'<Password>'.$escape($password).'</Password>'
            .'<CustomerId>'.$escape($customerId).'</CustomerId>'
            .'<Culture>fr-FR</Culture>'
            .'<VersionAPI>1.0</VersionAPI>'
            .'</Context>'
            .'<OutputOptions>'
            .'<OutputFormat>10x15</OutputFormat>'
            .'<OutputType>PdfUrl</OutputType>'
            .'</OutputOptions>'
            .'<ShipmentsList><Shipment>'
            .'<OrderNo>'.$escape($orderNo).'</OrderNo>'
            .'<CustomerNo>'.$escape($customerNo).'</CustomerNo>'
            .'<ParcelCount>1</ParcelCount>'
            .'<DeliveryMode><Mode>'.$escape($deliveryMode).'</Mode><Location>'.$escape($deliveryLocation).'</Location></DeliveryMode>'
            .'<CollectionMode><Mode>CCC</Mode><Location></Location></CollectionMode>'
            .'<Parcels><Parcel>'
            .'<Content>'.$escape($content).'</Content>'
            .'<Weight Value="'.$weight.'" Unit="gr"/>'
            .'</Parcel></Parcels>'
            .$this->addressXml('Sender', $sender, $escape)
            .$this->addressXml('Recipient', $recipient, $escape)
            .'</Shipment></ShipmentsList>'
            .'</ShipmentCreationRequest>';
    }

    /**
     * @param  array<string, mixed>  $address
     * @param  callable(string): string  $escape
     */
    private function addressXml(string $role, array $address, callable $escape): string
    {
        $firstname = $this->sanitizeMrText((string) ($address['firstname'] ?? ''), 32);
        $lastname = $this->sanitizeMrText((string) ($address['lastname'] ?? ''), 32);
        $street = $this->sanitizeMrText((string) ($address['street'] ?? ''), 40);
        $houseNo = $this->sanitizeMrText((string) ($address['house_no'] ?? ''), 10);
        $postal = preg_replace('/\s+/', '', (string) ($address['postal_code'] ?? '')) ?? '';
        $city = $this->sanitizeMrText((string) ($address['city'] ?? ''), 30);
        $company = $this->sanitizeMrText((string) ($address['company'] ?? ''), 30);
        $phone = $this->normalizeFrPhone((string) ($address['phone'] ?? ''));
        $email = trim((string) ($address['email'] ?? ''));

        return '<'.$role.'><Address>'
            .'<Title></Title>'
            .'<Firstname>'.$escape($firstname).'</Firstname>'
            .'<Lastname>'.$escape($lastname).'</Lastname>'
            .'<Streetname>'.$escape($street).'</Streetname>'
            .'<HouseNo>'.$escape($houseNo).'</HouseNo>'
            .'<CountryCode>FR</CountryCode>'
            .'<PostCode>'.$escape($postal).'</PostCode>'
            .'<City>'.$escape($city).'</City>'
            .'<AddressAdd1>'.$escape($company).'</AddressAdd1>'
            .'<AddressAdd2></AddressAdd2>'
            .'<AddressAdd3></AddressAdd3>'
            .'<PhoneNo>'.$escape($phone).'</PhoneNo>'
            .'<MobileNo></MobileNo>'
            .'<Email>'.$escape($email).'</Email>'
            .'</Address></'.$role.'>';
    }

    /**
     * @return array{shipment_number: string, label_url: string}|null
     */
    private function parseShipmentCreationResponse(string $body): ?array
    {
        try {
            $xml = new SimpleXMLElement($body);
        } catch (\Exception) {
            Log::warning('mondial_relay.label_invalid_xml');

            return null;
        }

        $xml->registerXPathNamespace('mr', 'http://www.example.org/Response');

        $statusNodes = $xml->xpath('//mr:StatusList/mr:Status') ?: $xml->xpath('//StatusList/Status') ?: [];
        foreach ($statusNodes as $status) {
            $code = trim((string) ($status['Code'] ?? $status->Code ?? ''));
            $level = strtolower(trim((string) ($status['Level'] ?? $status->Level ?? '')));
            $message = trim((string) ($status['Message'] ?? $status->Message ?? ''));
            if ($code !== '' && $code !== '0' && (str_contains($level, 'error') || str_contains($level, 'critical'))) {
                Log::warning('mondial_relay.label_status_error', [
                    'code' => $code,
                    'message' => $message,
                ]);

                return null;
            }
        }

        $shipmentNumber = trim((string) (
            ($xml->xpath('//mr:ShipmentsList/mr:Shipment/mr:ShipmentNumber')[0] ?? null)
            ?? ($xml->xpath('//ShipmentsList/Shipment/ShipmentNumber')[0] ?? '')
        ));
        $labelUrl = trim((string) (
            ($xml->xpath('//mr:ShipmentsList/mr:Shipment/mr:LabelList/mr:Label/mr:Output')[0] ?? null)
            ?? ($xml->xpath('//ShipmentsList/Shipment/LabelList/Label/Output')[0] ?? '')
        ));

        if ($shipmentNumber === '' || $labelUrl === '') {
            Log::warning('mondial_relay.label_missing_output', [
                'has_number' => $shipmentNumber !== '',
                'has_url' => $labelUrl !== '',
            ]);

            return null;
        }

        return [
            'shipment_number' => $shipmentNumber,
            'label_url' => $labelUrl,
        ];
    }

    private function sanitizeMrText(string $value, int $max): string
    {
        $converted = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        $value = $converted === false ? $value : $converted;
        $value = preg_replace("/[^0-9A-Za-z_\\-'., \\/]/", ' ', $value) ?? $value;
        $value = trim(preg_replace('/\s+/', ' ', $value) ?? $value);

        return mb_substr($value, 0, $max);
    }

    private function sanitizeMrRef(string $value, int $max): string
    {
        $value = strtoupper(preg_replace('/[^0-9A-Za-z_\-]/', '', $value) ?? '');

        return mb_substr($value, 0, $max);
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
