<?php

namespace App\Filament\Resources\Opticians\Schemas;

use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class OpticianForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Magasin')
                    ->schema([
                        TextInput::make('name')->label('Nom du magasin')->required()->maxLength(255),
                        TextInput::make('siret')
                            ->label('SIRET')
                            ->length(14)
                            ->unique(ignoreRecord: true),
                        TextInput::make('address')->label('Adresse')->maxLength(255),
                        TextInput::make('postal_code')->label('Code postal')->maxLength(16),
                        TextInput::make('city')->label('Ville')->maxLength(100),
                        TextInput::make('phone')->label('Téléphone magasin')->maxLength(32),
                    ]),
                Section::make('Facturation')
                    ->schema([
                        Select::make('network_id')
                            ->label('Réseau')
                            ->relationship('network', 'name')
                            ->searchable()
                            ->preload(),
                        TextInput::make('billing_email')->label('E-mail facturation')->email(),
                        TextInput::make('billing_iban')->label('IBAN')->maxLength(34),
                        TextInput::make('qonto_id')->label('ID contrepartie Qonto')->maxLength(64),
                    ]),
                Section::make('Administrateur du magasin')
                    ->description('Un e-mail d’invitation lui permettra de définir son mot de passe.')
                    ->visibleOn('create')
                    ->schema([
                        TextInput::make('first_name')->label('Prénom')->required()->maxLength(100),
                        TextInput::make('last_name')->label('Nom')->required()->maxLength(100),
                        TextInput::make('email')->label('E-mail')->email()->required()->unique('users', 'email'),
                    ]),
            ]);
    }
}
