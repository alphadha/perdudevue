<?php

namespace App\Filament\Resources\Pairs;

use App\Enums\PairStatus;
use App\Filament\Resources\Pairs\Pages\ListPairs;
use App\Models\Pair;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use UnitEnum;

class PairResource extends Resource
{
    protected static ?string $model = Pair::class;

    protected static ?string $navigationLabel = 'Paires';

    protected static ?string $modelLabel = 'paire';

    protected static ?string $pluralModelLabel = 'paires';

    protected static string|UnitEnum|null $navigationGroup = 'Consultation';

    protected static ?int $navigationSort = 20;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedEye;

    public static function canCreate(): bool
    {
        return false;
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('assigned_code')->label('Code assigné')->searchable()->sortable(),
                TextColumn::make('status')
                    ->label('Statut')
                    ->formatStateUsing(fn (PairStatus $state): string => $state->label())
                    ->badge(),
                TextColumn::make('client.email')->label('Client')->searchable(),
                TextColumn::make('originOptician.name')->label('Origine')->toggleable(),
                TextColumn::make('depositaryOptician.name')->label('Dépositaire')->placeholder('—')->toggleable(),
                TextColumn::make('type')->label('Type'),
                TextColumn::make('brand')->label('Marque')->searchable(),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->label('Statut')
                    ->options(collect(PairStatus::cases())->mapWithKeys(
                        fn (PairStatus $status): array => [$status->value => $status->label()]
                    )),
            ])
            ->defaultSort('id', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => ListPairs::route('/'),
        ];
    }
}
