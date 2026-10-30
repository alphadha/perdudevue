<?php

namespace App\Services;

use App\Models\User;
use App\Support\EnvFile;
use Dotenv\Dotenv;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Artisan;

class PlatformSettingsService
{
    private ?EnvFile $envFile = null;

    public function useEnvFile(EnvFile $envFile): self
    {
        $this->envFile = $envFile;

        return $this;
    }

    public function envFile(): EnvFile
    {
        if ($this->envFile !== null) {
            return $this->envFile;
        }

        if (app()->environment('testing')) {
            throw new \RuntimeException('Configurer un EnvFile de test via useEnvFile() — écriture .env réelle interdite en testing.');
        }

        return $this->envFile = EnvFile::base();
    }

    /**
     * @return array<string, array{env: string, label: string, secret?: bool, group: string, default?: string|null}>
     */
    public function definitions(): array
    {
        return [
            'mondial_relay.mode' => ['env' => 'MONDIAL_RELAY_MODE', 'label' => 'Environnement actif', 'group' => 'mondial_relay', 'default' => 'test'],

            'mondial_relay.api1.production.url' => ['env' => 'MONDIAL_RELAY_API1_PRODUCTION_URL', 'label' => 'API 1 prod — URL', 'group' => 'mondial_relay', 'default' => 'https://api.mondialrelay.com/WebService.asmx'],
            'mondial_relay.api1.production.enseigne' => ['env' => 'MONDIAL_RELAY_API1_PRODUCTION_ENSEIGNE', 'label' => 'API 1 prod — Code enseigne', 'group' => 'mondial_relay'],
            'mondial_relay.api1.production.private_key' => ['env' => 'MONDIAL_RELAY_API1_PRODUCTION_PRIVATE_KEY', 'label' => 'API 1 prod — Clé privée', 'group' => 'mondial_relay', 'secret' => true],
            'mondial_relay.api1.production.brand' => ['env' => 'MONDIAL_RELAY_API1_PRODUCTION_BRAND', 'label' => 'API 1 prod — Marque', 'group' => 'mondial_relay'],
            'mondial_relay.api1.production.brand_code' => ['env' => 'MONDIAL_RELAY_API1_PRODUCTION_BRAND_CODE', 'label' => 'API 1 prod — Code marque numérique', 'group' => 'mondial_relay'],

            'mondial_relay.api1.test.url' => ['env' => 'MONDIAL_RELAY_API1_TEST_URL', 'label' => 'API 1 test — URL', 'group' => 'mondial_relay', 'default' => 'https://api.mondialrelay.com/WebService.asmx'],
            'mondial_relay.api1.test.enseigne' => ['env' => 'MONDIAL_RELAY_API1_TEST_ENSEIGNE', 'label' => 'API 1 test — Code enseigne', 'group' => 'mondial_relay'],
            'mondial_relay.api1.test.private_key' => ['env' => 'MONDIAL_RELAY_API1_TEST_PRIVATE_KEY', 'label' => 'API 1 test — Clé privée', 'group' => 'mondial_relay', 'secret' => true],
            'mondial_relay.api1.test.brand' => ['env' => 'MONDIAL_RELAY_API1_TEST_BRAND', 'label' => 'API 1 test — Marque', 'group' => 'mondial_relay'],
            'mondial_relay.api1.test.brand_code' => ['env' => 'MONDIAL_RELAY_API1_TEST_BRAND_CODE', 'label' => 'API 1 test — Code marque numérique', 'group' => 'mondial_relay'],

            'mondial_relay.api2.production.url' => ['env' => 'MONDIAL_RELAY_API2_PRODUCTION_URL', 'label' => 'API 2 prod — URL', 'group' => 'mondial_relay', 'default' => 'https://connect-api.mondialrelay.com/api/Shipment'],
            'mondial_relay.api2.production.brand_id' => ['env' => 'MONDIAL_RELAY_API2_PRODUCTION_BRAND_ID', 'label' => 'API 2 prod — Identification marque', 'group' => 'mondial_relay'],
            'mondial_relay.api2.production.login' => ['env' => 'MONDIAL_RELAY_API2_PRODUCTION_LOGIN', 'label' => 'API 2 prod — Connexion API', 'group' => 'mondial_relay'],
            'mondial_relay.api2.production.password' => ['env' => 'MONDIAL_RELAY_API2_PRODUCTION_PASSWORD', 'label' => 'API 2 prod — Mot de passe API', 'group' => 'mondial_relay', 'secret' => true],

            'mondial_relay.api2.test.url' => ['env' => 'MONDIAL_RELAY_API2_TEST_URL', 'label' => 'API 2 test — URL', 'group' => 'mondial_relay', 'default' => 'https://connect-api-sandbox.mondialrelay.com/api/shipment'],
            'mondial_relay.api2.test.brand_id' => ['env' => 'MONDIAL_RELAY_API2_TEST_BRAND_ID', 'label' => 'API 2 test — Identification marque', 'group' => 'mondial_relay'],
            'mondial_relay.api2.test.login' => ['env' => 'MONDIAL_RELAY_API2_TEST_LOGIN', 'label' => 'API 2 test — Connexion API', 'group' => 'mondial_relay'],
            'mondial_relay.api2.test.password' => ['env' => 'MONDIAL_RELAY_API2_TEST_PASSWORD', 'label' => 'API 2 test — Mot de passe API', 'group' => 'mondial_relay', 'secret' => true],

            'colissimo.mode' => ['env' => 'COLISSIMO_MODE', 'label' => 'Environnement actif', 'group' => 'colissimo', 'default' => 'test'],
            'colissimo.api_key' => ['env' => 'COLISSIMO_API_KEY', 'label' => 'Clé API Web Services', 'group' => 'colissimo', 'secret' => true],
            'colissimo.contract_number' => ['env' => 'COLISSIMO_CONTRACT_NUMBER', 'label' => 'N° de contrat (legacy)', 'group' => 'colissimo'],
            'colissimo.password' => ['env' => 'COLISSIMO_PASSWORD', 'label' => 'Mot de passe (legacy)', 'group' => 'colissimo', 'secret' => true],
            'colissimo.api_url' => ['env' => 'COLISSIMO_API_URL', 'label' => 'URL API REST', 'group' => 'colissimo', 'default' => 'https://ws.colissimo.fr/sls-ws/SlsServiceWSRest/2.0'],
            'colissimo.test_api_key' => ['env' => 'COLISSIMO_TEST_API_KEY', 'label' => 'Clé API Web Services (test)', 'group' => 'colissimo', 'secret' => true],
            'colissimo.test_contract_number' => ['env' => 'COLISSIMO_TEST_CONTRACT_NUMBER', 'label' => 'N° de contrat (legacy test)', 'group' => 'colissimo'],
            'colissimo.test_password' => ['env' => 'COLISSIMO_TEST_PASSWORD', 'label' => 'Mot de passe (legacy test)', 'group' => 'colissimo', 'secret' => true],
            'colissimo.test_api_url' => ['env' => 'COLISSIMO_TEST_API_URL', 'label' => 'URL API REST (test)', 'group' => 'colissimo', 'default' => 'https://ws.colissimo.fr/sls-ws/SlsServiceWSRest/2.0'],

            'stripe.key' => ['env' => 'STRIPE_KEY', 'label' => 'Clé publishable', 'group' => 'stripe'],
            'stripe.secret' => ['env' => 'STRIPE_SECRET', 'label' => 'Clé secrète', 'group' => 'stripe', 'secret' => true],
            'stripe.webhook_secret' => ['env' => 'STRIPE_WEBHOOK_SECRET', 'label' => 'Secret webhook', 'group' => 'stripe', 'secret' => true],

            'mail.mailer' => ['env' => 'MAIL_MAILER', 'label' => 'Mailer', 'group' => 'smtp', 'default' => 'smtp'],
            'mail.host' => ['env' => 'MAIL_HOST', 'label' => 'Hôte SMTP', 'group' => 'smtp'],
            'mail.port' => ['env' => 'MAIL_PORT', 'label' => 'Port', 'group' => 'smtp', 'default' => '587'],
            'mail.username' => ['env' => 'MAIL_USERNAME', 'label' => 'Utilisateur', 'group' => 'smtp'],
            'mail.password' => ['env' => 'MAIL_PASSWORD', 'label' => 'Mot de passe', 'group' => 'smtp', 'secret' => true],
            'mail.encryption' => ['env' => 'MAIL_SCHEME', 'label' => 'Schéma / chiffrement (tls / ssl / vide)', 'group' => 'smtp', 'default' => 'tls'],
            'mail.from_address' => ['env' => 'MAIL_FROM_ADDRESS', 'label' => 'E-mail expéditeur', 'group' => 'smtp'],
            'mail.from_name' => ['env' => 'MAIL_FROM_NAME', 'label' => 'Nom expéditeur', 'group' => 'smtp'],

            'qonto.secret' => ['env' => 'QONTO_SECRET', 'label' => 'Clé / secret API', 'group' => 'qonto', 'secret' => true],
            'qonto.iban' => ['env' => 'QONTO_IBAN', 'label' => 'IBAN', 'group' => 'qonto'],

            'maps.provider' => ['env' => 'MAPS_PROVIDER', 'label' => 'Fournisseur de carte', 'group' => 'maps', 'default' => 'maplibre'],
            'maps.maplibre_style_url' => ['env' => 'MAPLIBRE_STYLE_URL', 'label' => 'URL style MapLibre (optionnel)', 'group' => 'maps'],
            'google.maps_key' => ['env' => 'GOOGLE_MAPS_KEY', 'label' => 'Clé Google Maps (navigateur)', 'group' => 'maps', 'secret' => true],

            'sms.provider' => ['env' => 'SMS_PROVIDER', 'label' => 'Provider (twilio / ovh / log)', 'group' => 'sms', 'default' => 'log'],
            'sms.api_key' => ['env' => 'SMS_API_KEY', 'label' => 'Clé API', 'group' => 'sms', 'secret' => true],
            'sms.api_secret' => ['env' => 'SMS_API_SECRET', 'label' => 'Secret API', 'group' => 'sms', 'secret' => true],
            'sms.from' => ['env' => 'SMS_FROM', 'label' => 'Expéditeur / sender', 'group' => 'sms'],
        ];
    }

    public function get(string $key, ?string $default = null): ?string
    {
        $def = $this->definitions()[$key] ?? null;
        if ($def === null) {
            return $default;
        }

        $fromFile = $this->envFile()->get($def['env']);
        if ($fromFile !== null && $fromFile !== '') {
            return $fromFile;
        }

        $fromRuntime = env($def['env']);
        if ($fromRuntime !== null && $fromRuntime !== '') {
            return (string) $fromRuntime;
        }

        return $default ?? ($def['default'] ?? null);
    }

    public function isConfigured(string $key): bool
    {
        return filled($this->get($key));
    }

    /**
     * @return array<string, mixed>
     */
    public function formState(): array
    {
        $state = [];
        foreach ($this->definitions() as $key => $meta) {
            $stored = $this->get($key);
            if (! empty($meta['secret'])) {
                Arr::set($state, $key, '');
            } else {
                Arr::set($state, $key, $stored ?? ($meta['default'] ?? ''));
            }
        }

        return $state;
    }

    /**
     * @param  array<string, mixed>  $nested
     */
    public function save(array $nested, User $actor, ?Request $request = null): void
    {
        $flat = Arr::dot($nested);
        $toWrite = [];
        $changed = [];

        foreach ($this->definitions() as $key => $meta) {
            if (! array_key_exists($key, $flat)) {
                continue;
            }

            $incoming = $flat[$key];
            $incoming = is_string($incoming) ? trim($incoming) : $incoming;
            $isSecret = (bool) ($meta['secret'] ?? false);

            if ($isSecret && ($incoming === null || $incoming === '')) {
                continue;
            }

            $newValue = $incoming === null ? '' : (string) $incoming;
            $current = $this->get($key) ?? '';
            if ($current === $newValue) {
                continue;
            }

            $toWrite[$meta['env']] = $newValue;
            $changed[] = $key;
        }

        if ($toWrite !== []) {
            $this->envFile()->setMany($toWrite);
            $this->reloadEnvironment($toWrite);
            Artisan::call('config:clear');
            $this->applyToConfig();
        }

        if ($changed !== []) {
            app(AuditService::class)->record($actor, 'platform_settings.updated', $request, [
                'keys' => $changed,
                'storage' => 'env',
            ]);
        }
    }

    /**
     * @param  array<string, string>  $values
     */
    private function reloadEnvironment(array $values): void
    {
        foreach ($values as $name => $value) {
            putenv($name.'='.$value);
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }

        // Recharge aussi le fichier pour les clés non touchées dans ce save.
        if (is_file($this->envFile()->path())) {
            Dotenv::createMutable(dirname($this->envFile()->path()), basename($this->envFile()->path()))->load();
        }
    }

    public function applyToConfig(): void
    {
        $mode = $this->get('mondial_relay.mode', 'test') === 'production' ? 'production' : 'test';

        config([
            'services.stripe.key' => $this->get('stripe.key', (string) env('STRIPE_KEY', '')),
            'services.stripe.secret' => $this->get('stripe.secret', (string) env('STRIPE_SECRET', '')),
            'services.stripe.webhook_secret' => $this->get('stripe.webhook_secret'),
            'services.qonto.secret' => $this->get('qonto.secret', (string) env('QONTO_SECRET', '')),
            'services.qonto.iban' => $this->get('qonto.iban', (string) env('QONTO_IBAN', '')),
            'services.mondial_relay.mode' => $this->get('mondial_relay.mode', 'test'),
            'services.mondial_relay.api1' => [
                'url' => $this->get("mondial_relay.api1.{$mode}.url"),
                'enseigne' => $this->get("mondial_relay.api1.{$mode}.enseigne"),
                'private_key' => $this->get("mondial_relay.api1.{$mode}.private_key"),
                'brand' => $this->get("mondial_relay.api1.{$mode}.brand"),
                'brand_code' => $this->get("mondial_relay.api1.{$mode}.brand_code"),
            ],
            'services.mondial_relay.api2' => [
                'url' => $this->get("mondial_relay.api2.{$mode}.url"),
                'brand_id' => $this->get("mondial_relay.api2.{$mode}.brand_id"),
                'login' => $this->get("mondial_relay.api2.{$mode}.login"),
                'password' => $this->get("mondial_relay.api2.{$mode}.password"),
            ],
            'services.colissimo' => [
                'mode' => $this->get('colissimo.mode', 'test'),
                'api_key' => $this->get('colissimo.api_key'),
                'contract_number' => $this->get('colissimo.contract_number'),
                'password' => $this->get('colissimo.password'),
                'api_url' => $this->get('colissimo.api_url'),
                'test_api_key' => $this->get('colissimo.test_api_key'),
                'test_contract_number' => $this->get('colissimo.test_contract_number'),
                'test_password' => $this->get('colissimo.test_password'),
                'test_api_url' => $this->get('colissimo.test_api_url'),
            ],
            'services.maps.provider' => $this->get('maps.provider', 'maplibre') === 'google' ? 'google' : 'maplibre',
            'services.maps.maplibre_style_url' => $this->get('maps.maplibre_style_url', (string) env('MAPLIBRE_STYLE_URL', '')),
            'services.google.maps_key' => $this->get('google.maps_key', (string) env('GOOGLE_MAPS_KEY', '')),
            'services.sms' => [
                'provider' => $this->get('sms.provider', 'log'),
                'api_key' => $this->get('sms.api_key'),
                'api_secret' => $this->get('sms.api_secret'),
                'from' => $this->get('sms.from'),
            ],
        ]);

        if (filled($this->get('mail.mailer'))) {
            config(['mail.default' => $this->get('mail.mailer')]);
        }
        if (filled($this->get('mail.host'))) {
            config([
                'mail.mailers.smtp.scheme' => filled($this->get('mail.encryption')) ? $this->get('mail.encryption') : null,
                'mail.mailers.smtp.host' => $this->get('mail.host'),
                'mail.mailers.smtp.port' => (int) ($this->get('mail.port', '587') ?: 587),
                'mail.mailers.smtp.username' => $this->get('mail.username'),
                'mail.mailers.smtp.password' => $this->get('mail.password'),
            ]);
        }
        if (filled($this->get('mail.from_address'))) {
            config([
                'mail.from.address' => $this->get('mail.from_address'),
                'mail.from.name' => $this->get('mail.from_name', config('app.name')),
            ]);
        }
    }
}
