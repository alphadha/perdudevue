<?php

namespace App\Filament\Pages;

use App\Models\QontoSyncLog;
use App\Services\BillingReviewService;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Support\Icons\Heroicon;
use UnitEnum;

class QontoSync extends Page
{
    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedArrowsRightLeft;

    protected static ?string $navigationLabel = 'Qonto';

    protected static ?string $title = 'Synchronisation Qonto';

    protected static string|UnitEnum|null $navigationGroup = 'Facturation';

    protected static ?int $navigationSort = 30;

    protected string $view = 'filament.pages.qonto-sync';

    /**
     * @return array<string, mixed>
     */
    public function getViewData(): array
    {
        return [
            'configured' => filled(config('services.qonto.secret')),
            'logs' => QontoSyncLog::query()->latest('id')->limit(20)->get(),
        ];
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('sync')
                ->label('Lancer la synchronisation')
                ->action(function (): void {
                    $log = app(BillingReviewService::class)->syncQonto();
                    $notification = Notification::make()->title($log->message);
                    if ($log->status === 'skipped') {
                        $notification->warning();
                    } else {
                        $notification->success();
                    }
                    $notification->send();
                }),
        ];
    }
}
