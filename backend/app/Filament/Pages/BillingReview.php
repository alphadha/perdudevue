<?php

namespace App\Filament\Pages;

use App\Filament\Widgets\BillingIssuesTable;
use App\Filament\Widgets\BillingPreviewsTable;
use BackedEnum;
use Filament\Pages\Page;
use Filament\Support\Icons\Heroicon;
use UnitEnum;

class BillingReview extends Page
{
    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedExclamationTriangle;

    protected static ?string $navigationLabel = 'Contrôle facturation';

    protected static ?string $title = 'Évaluation et erreurs de facturation';

    protected static string|UnitEnum|null $navigationGroup = 'Facturation';

    protected static ?int $navigationSort = 20;

    protected string $view = 'filament.pages.billing-review';

    /**
     * @return array<class-string>
     */
    public function getHeaderWidgets(): array
    {
        return [
            BillingIssuesTable::class,
            BillingPreviewsTable::class,
        ];
    }

    public function getHeaderWidgetsColumns(): int|array
    {
        return 1;
    }
}
