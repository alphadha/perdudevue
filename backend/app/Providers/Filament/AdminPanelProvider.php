<?php

namespace App\Providers\Filament;

use App\Filament\Pages\PlatformSettings;
use App\Filament\Widgets\PdvStatsWidget;
use Filament\Actions\Action;
use Filament\Http\Middleware\Authenticate;
use Filament\Http\Middleware\AuthenticateSession;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Pages\Dashboard;
use Filament\Panel;
use Filament\PanelProvider;
use Filament\Support\Assets\Css;
use Filament\Support\Icons\Heroicon;
use Filament\Widgets\AccountWidget;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;

class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->default()
            ->id('admin')
            ->path('admin')
            ->brandName('Perdues de Vue')
            ->brandLogo(asset('images/brand/logo.svg'))
            ->brandLogoHeight('2.5rem')
            ->favicon(asset('images/brand/logo.svg'))
            ->login()
            ->colors([
                // CTA UI kit #24364D (shades Filament 500/600 = CTA exact)
                'primary' => [
                    50 => '#E9F2EE',
                    100 => '#DEE5ED',
                    200 => '#BBC8DD',
                    300 => '#7A8FA8',
                    400 => '#4A5A73',
                    500 => '#24364D',
                    600 => '#24364D',
                    700 => '#1A2838',
                    800 => '#13263F',
                    900 => '#0C1829',
                    950 => '#070E18',
                ],
                // Vert logo
                'success' => [
                    50 => '#F0F7F4',
                    100 => '#E2EDE8',
                    200 => '#B7D8C6',
                    300 => '#9CC7B0',
                    400 => '#8CBC9F',
                    500 => '#7CB19A',
                    600 => '#6A9A85',
                    700 => '#418164',
                    800 => '#346048',
                    900 => '#2A4D3A',
                    950 => '#1B3226',
                ],
                'info' => [
                    50 => '#D2DFF4',
                    100 => '#A7CBE0',
                    200 => '#8BB4D4',
                    300 => '#6E9CC4',
                    400 => '#4F7BB0',
                    500 => '#3860A4',
                    600 => '#3860A4',
                    700 => '#2E4E86',
                    800 => '#1D5677',
                    900 => '#163F5A',
                    950 => '#0F2A3C',
                ],
                'warning' => [
                    50 => '#F8D4C9',
                    100 => '#F5C4B4',
                    200 => '#EFA890',
                    300 => '#E58A6C',
                    400 => '#D46A45',
                    500 => '#AC3A16',
                    600 => '#AC3A16',
                    700 => '#8C2F12',
                    800 => '#6C240E',
                    900 => '#4C1A0A',
                    950 => '#2C0F06',
                ],
                'danger' => [
                    50 => '#F7D0D0',
                    100 => '#F0B5B5',
                    200 => '#E58A8A',
                    300 => '#D45F5F',
                    400 => '#C83838',
                    500 => '#BA1212',
                    600 => '#BA1212',
                    700 => '#960E0E',
                    800 => '#720B0B',
                    900 => '#4E0707',
                    950 => '#2A0404',
                ],
                // Neutres sombres (sidebar = gray-400/500 → navy, pas bleu clair)
                'gray' => [
                    50 => '#FCFCFC',
                    100 => '#F5F7FA',
                    200 => '#DEE5ED',
                    300 => '#BBC8DD',
                    400 => '#355175',
                    500 => '#24364D',
                    600 => '#1A2838',
                    700 => '#13263F',
                    800 => '#0C1829',
                    900 => '#070E18',
                    950 => '#04080F',
                ],
            ])
            ->assets([
                Css::make('pdv-filament', asset('css/pdv-filament.css')),
            ])
            ->discoverResources(in: app_path('Filament/Resources'), for: 'App\Filament\Resources')
            ->discoverPages(in: app_path('Filament/Pages'), for: 'App\Filament\Pages')
            ->pages([
                Dashboard::class,
            ])
            ->discoverWidgets(in: app_path('Filament/Widgets'), for: 'App\Filament\Widgets')
            ->widgets([
                PdvStatsWidget::class,
                AccountWidget::class,
            ])
            ->userMenuItems([
                Action::make('platformSettings')
                    ->label('Paramètres')
                    ->icon(Heroicon::OutlinedCog6Tooth)
                    ->url(fn (): string => PlatformSettings::getUrl())
                    ->sort(-10),
            ])
            ->middleware([
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
                StartSession::class,
                AuthenticateSession::class,
                ShareErrorsFromSession::class,
                VerifyCsrfToken::class,
                SubstituteBindings::class,
                DisableBladeIconComponents::class,
                DispatchServingFilamentEvent::class,
            ])
            ->authMiddleware([
                Authenticate::class,
            ]);
    }
}
