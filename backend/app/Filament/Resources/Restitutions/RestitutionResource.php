<?php

namespace App\Filament\Resources\Restitutions;

use App\Enums\PairStatus;
use App\Filament\Resources\Restitutions\Pages\ListRestitutions;
use App\Models\Pair;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use UnitEnum;

class RestitutionResource extends Resource
{
    protected static ?string $model = Pair::class;

    protected static ?string $slug = 'restitutions';

    protected static ?string $navigationLabel = 'Restitutions en cours';

    protected static ?string $modelLabel = 'restitution';

    protected static ?string $pluralModelLabel = 'restitutions';

    protected static string|UnitEnum|null $navigationGroup = 'Consultation';

    protected static ?int $navigationSort = 30;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedArchiveBox;

    public static function canCreate(): bool
    {
        return false;
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->whereIn('status', [
            PairStatus::ARecuperer,
            PairStatus::LivraisonDemandee,
            PairStatus::EnLivraison,
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('assigned_code')->label('Code assigné')->searchable(),
                TextColumn::make('status')
                    ->label('Statut')
                    ->formatStateUsing(fn (PairStatus $state): string => $state->label())
                    ->badge(),
                TextColumn::make('depositaryOptician.name')->label('Dépositaire'),
                TextColumn::make('client.email')->label('Client'),
                TextColumn::make('found_at')->label('Trouvée le')->date('d/m/Y')->placeholder('—'),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->label('Statut')
                    ->options([
                        PairStatus::ARecuperer->value => PairStatus::ARecuperer->label(),
                        PairStatus::LivraisonDemandee->value => PairStatus::LivraisonDemandee->label(),
                        PairStatus::EnLivraison->value => PairStatus::EnLivraison->label(),
                    ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListRestitutions::route('/'),
        ];
    }
}
