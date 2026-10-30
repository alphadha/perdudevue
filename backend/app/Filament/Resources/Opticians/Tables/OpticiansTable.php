<?php

namespace App\Filament\Resources\Opticians\Tables;

use App\Models\Optician;
use App\Models\User;
use Filament\Actions\Action;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class OpticiansTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')->label('Magasin')->searchable()->sortable(),
                TextColumn::make('siret')->label('SIRET')->placeholder('—')->toggleable(),
                TextColumn::make('network.name')->label('Réseau')->placeholder('—')->toggleable(),
                TextColumn::make('city')->label('Ville')->searchable(),
                TextColumn::make('billing_email')->label('E-mail factu')->placeholder('—')->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('created_at')->label('Créé le')->date('d/m/Y')->sortable(),
            ])
            ->recordActions([
                EditAction::make(),
                Action::make('blockAccess')
                    ->label('Bloquer les accès')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->visible(fn (Optician $record): bool => $record->users()->whereNull('users.blocked_at')->exists())
                    ->action(function (Optician $record): void {
                        $record->users->each(fn (User $user) => $user->block());
                    }),
                Action::make('unblockAccess')
                    ->label('Débloquer les accès')
                    ->visible(fn (Optician $record): bool => $record->users()->whereNotNull('users.blocked_at')->exists())
                    ->action(function (Optician $record): void {
                        $record->users->each(fn (User $user) => $user->unblock());
                    }),
            ]);
    }
}
