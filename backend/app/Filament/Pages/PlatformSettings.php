<?php

namespace App\Filament\Pages;

use App\Services\PlatformSettingsService;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Components\Actions;
use Filament\Schemas\Components\EmbeddedSchema;
use Filament\Schemas\Components\Form;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Tabs;
use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Schema;
use Filament\Support\Enums\Alignment;
use Filament\Support\Icons\Heroicon;
use Illuminate\Support\Facades\Auth;

/**
 * @property-read Schema $form
 */
class PlatformSettings extends Page
{
    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedCog6Tooth;

    protected static ?string $navigationLabel = 'Paramètres';

    protected static ?string $title = 'Paramètres plateforme';

    protected static ?string $slug = 'parametres';

    protected static bool $shouldRegisterNavigation = false;

    /**
     * @var array<string, mixed>|null
     */
    public ?array $data = [];

    public static function canAccess(): bool
    {
        return Auth::user()?->canAccessPanel(filament()->getCurrentOrDefaultPanel()) ?? false;
    }

    public function mount(): void
    {
        $this->form->fill(app(PlatformSettingsService::class)->formState());
    }

    public function form(Schema $schema): Schema
    {
        $settings = app(PlatformSettingsService::class);

        return $schema
            ->components([
                Tabs::make('Paramètres')
                    ->persistTabInQueryString()
                    ->tabs([
                        Tab::make('Mondial Relay')
                            ->icon(Heroicon::OutlinedTruck)
                            ->schema([
                                Section::make('Environnement')
                                    ->schema([
                                        Select::make('mondial_relay.mode')
                                            ->label('Environnement actif')
                                            ->options([
                                                'test' => 'Test / sandbox',
                                                'production' => 'Production',
                                            ])
                                            ->required(),
                                    ]),
                                Section::make('API 1 — Production')
                                    ->columns(2)
                                    ->schema([
                                        $this->text('mondial_relay.api1.production.url', 'URL de l’API'),
                                        $this->text('mondial_relay.api1.production.enseigne', 'Code enseigne'),
                                        $this->secret('mondial_relay.api1.production.private_key', 'Clé privée', $settings),
                                        $this->text('mondial_relay.api1.production.brand', 'Marque'),
                                        $this->text('mondial_relay.api1.production.brand_code', 'Code marque numérique'),
                                    ]),
                                Section::make('API 1 — Test')
                                    ->columns(2)
                                    ->schema([
                                        $this->text('mondial_relay.api1.test.url', 'URL de l’API'),
                                        $this->text('mondial_relay.api1.test.enseigne', 'Code enseigne'),
                                        $this->secret('mondial_relay.api1.test.private_key', 'Clé privée', $settings),
                                        $this->text('mondial_relay.api1.test.brand', 'Marque'),
                                        $this->text('mondial_relay.api1.test.brand_code', 'Code marque numérique'),
                                    ]),
                                Section::make('API 2 — Production (Shipment)')
                                    ->columns(2)
                                    ->schema([
                                        $this->text('mondial_relay.api2.production.url', 'URL de l’API'),
                                        $this->text('mondial_relay.api2.production.brand_id', 'Identification de marque'),
                                        $this->text('mondial_relay.api2.production.login', 'Connexion API'),
                                        $this->secret('mondial_relay.api2.production.password', 'Mot de passe API', $settings),
                                    ]),
                                Section::make('API 2 — Test (Shipment)')
                                    ->columns(2)
                                    ->schema([
                                        $this->text('mondial_relay.api2.test.url', 'URL de l’API'),
                                        $this->text('mondial_relay.api2.test.brand_id', 'Identification de marque'),
                                        $this->text('mondial_relay.api2.test.login', 'Connexion API'),
                                        $this->secret('mondial_relay.api2.test.password', 'Mot de passe API', $settings),
                                    ]),
                            ]),
                        Tab::make('Colissimo')
                            ->icon(Heroicon::OutlinedCube)
                            ->schema([
                                Select::make('colissimo.mode')
                                    ->label('Environnement actif')
                                    ->options([
                                        'test' => 'Test',
                                        'production' => 'Production',
                                    ]),
                                Section::make('Production')->columns(2)->schema([
                                    $this->secret('colissimo.api_key', 'Clé API Web Services', $settings)->columnSpanFull(),
                                    $this->text('colissimo.contract_number', 'N° de contrat (legacy)'),
                                    $this->secret('colissimo.password', 'Mot de passe (legacy)', $settings),
                                    $this->text('colissimo.api_url', 'URL API')->columnSpanFull(),
                                ]),
                                Section::make('Test')->columns(2)->schema([
                                    $this->secret('colissimo.test_api_key', 'Clé API Web Services', $settings)->columnSpanFull(),
                                    $this->text('colissimo.test_contract_number', 'N° de contrat (legacy)'),
                                    $this->secret('colissimo.test_password', 'Mot de passe (legacy)', $settings),
                                    $this->text('colissimo.test_api_url', 'URL API')->columnSpanFull(),
                                ]),
                            ]),
                        Tab::make('Stripe')
                            ->icon(Heroicon::OutlinedCreditCard)
                            ->schema([
                                Section::make('Paiement envoi à distance')->columns(1)->schema([
                                    $this->text('stripe.key', 'Clé publishable (pk_…)'),
                                    $this->secret('stripe.secret', 'Clé secrète (sk_…)', $settings),
                                    $this->secret('stripe.webhook_secret', 'Secret webhook (whsec_…)', $settings),
                                ]),
                            ]),
                        Tab::make('SMTP')
                            ->icon(Heroicon::OutlinedEnvelope)
                            ->schema([
                                Section::make('Serveur e-mail')->columns(2)->schema([
                                    Select::make('mail.mailer')
                                        ->label('Mailer')
                                        ->options([
                                            'smtp' => 'SMTP',
                                            'log' => 'Log (dev)',
                                            'array' => 'Array (tests)',
                                        ]),
                                    $this->text('mail.host', 'Hôte'),
                                    $this->text('mail.port', 'Port'),
                                    $this->text('mail.encryption', 'Chiffrement (tls / ssl)'),
                                    $this->text('mail.username', 'Utilisateur'),
                                    $this->secret('mail.password', 'Mot de passe', $settings),
                                    $this->text('mail.from_address', 'E-mail expéditeur'),
                                    $this->text('mail.from_name', 'Nom expéditeur'),
                                ]),
                            ]),
                        Tab::make('Qonto')
                            ->icon(Heroicon::OutlinedBanknotes)
                            ->schema([
                                Section::make('Facturation opticiens')->schema([
                                    $this->secret('qonto.secret', 'Secret / clé API', $settings),
                                    $this->text('qonto.iban', 'IBAN'),
                                ]),
                            ]),
                        Tab::make('Cartes')
                            ->icon(Heroicon::OutlinedMapPin)
                            ->schema([
                                Section::make('Cartographie front (points relais)')
                                    ->description('Choisissez le moteur de carte affiché côté client. Google Maps exige une clé navigateur (restrictions HTTP referrer recommandées). MapLibre utilise OpenStreetMap sans clé.')
                                    ->schema([
                                        Select::make('maps.provider')
                                            ->label('Fournisseur')
                                            ->options([
                                                'maplibre' => 'Carte libre OSM (Leaflet / OpenStreetMap, gratuit)',
                                                'google' => 'Google Maps',
                                            ])
                                            ->required()
                                            ->live(),
                                        $this->secret('google.maps_key', 'Clé API Google Maps', $settings)
                                            ->visible(fn ($get): bool => $get('maps.provider') === 'google')
                                            ->helperText('Clé Maps JavaScript — exposée au front client authentifié (restrictions HTTP referrer recommandées). Laisser vide pour conserver.'),
                                    ]),
                            ]),
                        Tab::make('SMS')
                            ->icon(Heroicon::OutlinedDevicePhoneMobile)
                            ->schema([
                                Section::make('Provider SMS')->columns(2)->schema([
                                    Select::make('sms.provider')
                                        ->label('Provider')
                                        ->options([
                                            'log' => 'Log (dev)',
                                            'twilio' => 'Twilio',
                                            'ovh' => 'OVH',
                                        ]),
                                    $this->text('sms.from', 'Expéditeur'),
                                    $this->secret('sms.api_key', 'Clé API', $settings),
                                    $this->secret('sms.api_secret', 'Secret API', $settings),
                                ]),
                            ]),
                    ]),
            ])
            ->statePath('data');
    }

    public function content(Schema $schema): Schema
    {
        return $schema->components([
            Form::make([EmbeddedSchema::make('form')])
                ->id('form')
                ->livewireSubmitHandler('save')
                ->footer([
                    Actions::make([
                        Action::make('save')
                            ->label('Enregistrer')
                            ->submit('save')
                            ->keyBindings(['mod+s']),
                    ])->alignment(Alignment::Start),
                ]),
        ]);
    }

    public function save(): void
    {
        $data = $this->form->getState();
        app(PlatformSettingsService::class)->save(
            $data,
            Auth::user(),
            request(),
        );

        $this->form->fill(app(PlatformSettingsService::class)->formState());

        Notification::make()
            ->title('Paramètres enregistrés')
            ->body('Écriture dans le fichier .env + config:clear. Les champs secrets laissés vides sont conservés.')
            ->success()
            ->send();
    }

    private function text(string $name, string $label): TextInput
    {
        return TextInput::make($name)->label($label)->maxLength(500);
    }

    private function secret(string $name, string $label, PlatformSettingsService $settings): TextInput
    {
        $configured = $settings->isConfigured($name);

        return TextInput::make($name)
            ->label($label)
            ->password()
            ->revealable()
            ->maxLength(500)
            ->helperText($configured
                ? 'Déjà configuré — laisser vide pour conserver la valeur actuelle.'
                : 'Non configuré pour le moment.')
            ->dehydrated(fn (?string $state): bool => filled($state));
    }
}
