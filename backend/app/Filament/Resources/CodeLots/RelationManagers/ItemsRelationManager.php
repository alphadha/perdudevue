<?php

namespace App\Filament\Resources\CodeLots\RelationManagers;

use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class ItemsRelationManager extends RelationManager
{
    protected static string $relationship = 'items';

    protected static ?string $title = 'Codes du lot';

    protected static bool $isLazy = false;

    public function isReadOnly(): bool
    {
        return true;
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('code')->label('Code')->searchable()->copyable(),
                TextColumn::make('status')
                    ->label('Statut')
                    ->formatStateUsing(fn (string $state): string => $state === 'assigned' ? 'Associé' : 'Disponible')
                    ->badge()
                    ->color(fn (string $state): string => $state === 'assigned' ? 'success' : 'gray'),
                TextColumn::make('pair.assigned_code')->label('Paire')->placeholder('—'),
            ])
            ->paginated([25, 50, 100]);
    }
}
