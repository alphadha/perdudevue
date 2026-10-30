<?php

namespace App\Filament\Resources\Clients;

use App\Filament\Resources\Clients\Pages\ListClients;
use App\Models\Client;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Resources\Resource;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use UnitEnum;

class ClientResource extends Resource
{
    protected static ?string $model = Client::class;

    protected static ?string $navigationLabel = 'Clients';

    protected static ?string $modelLabel = 'client';

    protected static ?string $pluralModelLabel = 'clients';

    protected static string|UnitEnum|null $navigationGroup = 'Consultation';

    protected static ?int $navigationSort = 10;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedUsers;

    public static function canCreate(): bool
    {
        return false;
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('last_name')->label('Nom')->searchable()->sortable(),
                TextColumn::make('first_name')->label('Prénom')->searchable(),
                TextColumn::make('email')->label('E-mail')->searchable(),
                TextColumn::make('phone')->label('Téléphone')->placeholder('—'),
                TextColumn::make('pairs_count')->counts('pairs')->label('Paires'),
                IconColumn::make('user.blocked_at')
                    ->label('Bloqué')
                    ->boolean()
                    ->getStateUsing(fn (Client $record): bool => $record->user?->isBlocked() ?? false),
            ])
            ->recordActions([
                Action::make('block')
                    ->label('Bloquer')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->visible(fn (Client $record): bool => $record->user !== null && ! $record->user->isBlocked())
                    ->action(fn (Client $record) => $record->user?->block()),
                Action::make('unblock')
                    ->label('Débloquer')
                    ->visible(fn (Client $record): bool => $record->user?->isBlocked() ?? false)
                    ->action(fn (Client $record) => $record->user?->unblock()),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListClients::route('/'),
        ];
    }
}
