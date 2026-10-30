<?php

namespace App\Filament\Widgets;

use App\Services\BillingReviewService;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget;
use Illuminate\Support\Collection;

class BillingPreviewsTable extends TableWidget
{
    protected int|string|array $columnSpan = 'full';

    protected static ?int $sort = 2;

    public function table(Table $table): Table
    {
        $period = now()->translatedFormat('F Y');

        return $table
            ->heading('Préparation — '.$period)
            ->description('Volumes des paires enregistrées ce mois (y compris archivées). Montants indicatifs uniquement.')
            ->records(function (?string $sortColumn, ?string $sortDirection, ?string $search): Collection {
                return collect(app(BillingReviewService::class)->previews())
                    ->values()
                    ->mapWithKeys(fn (array $row, int $index): array => [
                        (string) ($index + 1) => $row,
                    ])
                    ->when(
                        filled($search),
                        fn (Collection $rows): Collection => $rows->filter(
                            function (array $row) use ($search): bool {
                                $haystack = mb_strtolower(
                                    $row['shop'].' '.$row['network'].' '.$row['tariff'].' '.$row['amount_label'],
                                );

                                return str_contains($haystack, mb_strtolower((string) $search));
                            },
                        ),
                    )
                    ->when(
                        filled($sortColumn),
                        fn (Collection $rows): Collection => $rows->sortBy(
                            $sortColumn,
                            SORT_NATURAL | SORT_FLAG_CASE,
                            $sortDirection === 'desc',
                        ),
                    );
            })
            ->columns([
                TextColumn::make('shop')
                    ->label('Magasin')
                    ->searchable()
                    ->sortable()
                    ->wrap(),
                TextColumn::make('network')
                    ->label('Réseau')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('pairs')
                    ->label('Paires du mois')
                    ->numeric()
                    ->sortable()
                    ->alignEnd(),
                TextColumn::make('tariff')
                    ->label('Tarif')
                    ->wrap()
                    ->toggleable(),
                TextColumn::make('amount_label')
                    ->label('Montant indicatif')
                    ->wrap()
                    ->sortable(),
            ])
            ->paginated([10, 25, 50])
            ->defaultPaginationPageOption(25)
            ->queryStringIdentifier('previews')
            ->emptyStateHeading('Aucun magasin')
            ->emptyStateDescription('Aucun magasin à afficher pour la préparation du mois.')
            ->striped();
    }
}
