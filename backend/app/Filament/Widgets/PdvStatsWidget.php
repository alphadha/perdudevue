<?php

namespace App\Filament\Widgets;

use App\Enums\PairStatus;
use App\Models\Client;
use App\Models\Optician;
use App\Models\Pair;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class PdvStatsWidget extends StatsOverviewWidget
{
    protected static ?int $sort = 1;

    protected function getStats(): array
    {
        $open = Pair::query()->whereIn('status', [
            PairStatus::ARecuperer,
            PairStatus::LivraisonDemandee,
            PairStatus::EnLivraison,
        ])->count();

        return [
            Stat::make('Opticiens', Optician::query()->count()),
            Stat::make('Clients', Client::query()->count()),
            Stat::make('Paires', Pair::query()->count())
                ->description('Y compris archivées'),
            Stat::make('Restitutions en cours', $open),
            Stat::make('À graver', Pair::query()->where('status', PairStatus::AGraver)->count()),
            Stat::make('Livraisons demandées', Pair::query()->where('status', PairStatus::LivraisonDemandee)->count()),
        ];
    }
}
