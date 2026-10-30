<?php

namespace App\Filament\Resources\Opticians\RelationManagers;

use App\Enums\Role;
use App\Models\Optician;
use App\Models\User;
use App\Services\ShopUserService;
use Filament\Actions\Action;
use Filament\Actions\CreateAction;
use Filament\Forms\Components\TextInput;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class UsersRelationManager extends RelationManager
{
    protected static string $relationship = 'users';

    protected static ?string $title = 'Utilisateurs du magasin';

    protected static bool $isLazy = false;

    public function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->whereIn('users.role', [
                Role::OpticienAdmin->value,
                Role::OpticienUser->value,
            ]))
            ->columns([
                TextColumn::make('last_name')->label('Nom')->searchable(),
                TextColumn::make('first_name')->label('Prénom')->searchable(),
                TextColumn::make('email')->label('E-mail')->searchable(),
                TextColumn::make('role')
                    ->label('Rôle')
                    ->formatStateUsing(fn (Role $state): string => $state === Role::OpticienAdmin
                        ? 'Administrateur magasin'
                        : 'Utilisateur magasin'),
                TextColumn::make('password_set_at')
                    ->label('Statut')
                    ->formatStateUsing(fn ($state): string => $state ? 'Actif' : 'Invitation envoyée'),
            ])
            ->headerActions([
                CreateAction::make()
                    ->label('Inviter un utilisateur')
                    ->createAnother(false)
                    ->schema([
                        TextInput::make('last_name')->label('Nom')->required()->maxLength(100),
                        TextInput::make('first_name')->label('Prénom')->required()->maxLength(100),
                        TextInput::make('email')->label('E-mail')->email()->required(),
                    ])
                    ->using(function (array $data): User {
                        /** @var Optician $shop */
                        $shop = $this->getOwnerRecord();

                        return app(ShopUserService::class)->invite($shop, auth()->user(), $data, request());
                    }),
            ])
            ->recordActions([
                Action::make('resend')
                    ->label('Renvoyer l’invitation')
                    ->visible(fn (User $record): bool => $record->role === Role::OpticienUser && ! $record->hasPassword())
                    ->action(function (User $record): void {
                        /** @var Optician $shop */
                        $shop = $this->getOwnerRecord();
                        app(ShopUserService::class)->resend($shop, auth()->user(), $record->uuid, request());
                    }),
                Action::make('remove')
                    ->label('Retirer')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->visible(fn (User $record): bool => $record->role === Role::OpticienUser)
                    ->action(function (User $record): void {
                        /** @var Optician $shop */
                        $shop = $this->getOwnerRecord();
                        app(ShopUserService::class)->remove($shop, auth()->user(), $record->uuid, request());
                    }),
            ]);
    }
}
