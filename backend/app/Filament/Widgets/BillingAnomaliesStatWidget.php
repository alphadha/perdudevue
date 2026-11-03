<?php

namespace App\Filament\Widgets;

use App\Filament\Pages\BillingReview;
use App\Services\BillingReviewService;
use Filament\Support\Icons\Heroicon;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class BillingAnomaliesStatWidget extends StatsOverviewWidget
{
    protected static bool $isDiscovered = false;

    protected static ?int $sort = 0;

    public static function makeStat(): Stat
    {
        $issues = app(BillingReviewService::class)->issues();
        $count = count($issues);
        $errors = collect($issues)->where('level', 'error')->count();

        $color = match (true) {
            $errors > 0 => 'danger',
            $count > 0 => 'warning',
            default => 'success',
        };

        $description = match (true) {
            $errors > 0 => $errors.' erreur'.($errors > 1 ? 's' : '').' — SIRET, réseaux, tarifs',
            $count > 0 => 'Alertes SIRET, réseaux, tarifs',
            default => 'Aucune anomalie détectée',
        };

        return Stat::make('Anomalies', $count)
            ->description($description)
            ->icon(Heroicon::OutlinedExclamationTriangle)
            ->color($color)
            ->url(BillingReview::getUrl());
    }

    protected function getStats(): array
    {
        return [static::makeStat()];
    }
}
