<?php

namespace App\Filament\Widgets;

use App\Services\BillingReviewService;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget;
use Illuminate\Support\Collection;

class BillingIssuesTable extends TableWidget
{
    protected int|string|array $columnSpan = 'full';

    protected static ?int $sort = 1;

    public function table(Table $table): Table
    {
        return $table
            ->heading('Anomalies')
            ->description('SIRET, réseaux, tarifs et coordonnées de facturation.')
            ->records(function (?string $sortColumn, ?string $sortDirection, ?string $search, array $filters): Collection {
                $level = $filters['level']['value'] ?? null;

                return collect(app(BillingReviewService::class)->issues())
                    ->values()
                    ->mapWithKeys(fn (array $issue, int $index): array => [
                        (string) ($index + 1) => $issue,
                    ])
                    ->when(
                        filled($level),
                        fn (Collection $rows): Collection => $rows->filter(
                            fn (array $issue): bool => $issue['level'] === $level,
                        ),
                    )
                    ->when(
                        filled($search),
                        fn (Collection $rows): Collection => $rows->filter(
                            function (array $issue) use ($search): bool {
                                $haystack = mb_strtolower($issue['subject'].' '.$issue['message']);

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
                TextColumn::make('level')
                    ->label('Niveau')
                    ->badge()
                    ->formatStateUsing(fn (string $state): string => $state === 'error' ? 'Erreur' : 'Attention')
                    ->color(fn (string $state): string => $state === 'error' ? 'danger' : 'warning')
                    ->sortable(),
                TextColumn::make('subject')
                    ->label('Sujet')
                    ->searchable()
                    ->sortable()
                    ->wrap(),
                TextColumn::make('message')
                    ->label('Message')
                    ->searchable()
                    ->wrap(),
            ])
            ->filters([
                SelectFilter::make('level')
                    ->label('Niveau')
                    ->options([
                        'error' => 'Erreur',
                        'warning' => 'Attention',
                    ]),
            ])
            ->paginated([10, 25, 50])
            ->defaultPaginationPageOption(10)
            ->queryStringIdentifier('issues')
            ->emptyStateHeading('Aucune anomalie')
            ->emptyStateDescription('Aucune anomalie détectée sur les SIRET, réseaux, tarifs et coordonnées de facturation.')
            ->striped();
    }
}
