<?php

namespace App\Filament\Resources\Networks;

use App\Filament\Resources\Networks\Pages\CreateNetwork;
use App\Filament\Resources\Networks\Pages\EditNetwork;
use App\Filament\Resources\Networks\Pages\ListNetworks;
use App\Models\Network;
use BackedEnum;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use UnitEnum;

class NetworkResource extends Resource
{
    protected static ?string $model = Network::class;

    protected static ?string $navigationLabel = 'Réseaux & tarifs';

    protected static ?string $modelLabel = 'réseau';

    protected static ?string $pluralModelLabel = 'réseaux';

    protected static string|UnitEnum|null $navigationGroup = 'Facturation';

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedRectangleStack;

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('Réseau')->schema([
                TextInput::make('name')->label('Nom')->required()->maxLength(120),
                Toggle::make('active')->label('Actif')->default(true),
            ]),
            Section::make('Tarifs')->schema([
                Repeater::make('tariffs')
                    ->relationship()
                    ->schema([
                        TextInput::make('label')->label('Libellé')->required(),
                        Select::make('unit')
                            ->label('Unité')
                            ->options([
                                'per_pair' => 'À la paire',
                                'monthly' => 'Forfait mensuel',
                                'engraving' => 'Gravure',
                            ])
                            ->required(),
                        TextInput::make('amount_cents')->label('Montant (centimes)')->numeric()->required()->minValue(0),
                        TextInput::make('currency')->label('Devise')->default('EUR')->maxLength(3),
                    ])
                    ->defaultItems(1)
                    ->addActionLabel('Ajouter un tarif'),
            ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')->label('Réseau')->searchable(),
                IconColumn::make('active')->label('Actif')->boolean(),
                TextColumn::make('tariffs_count')->counts('tariffs')->label('Tarifs'),
                TextColumn::make('opticians_count')->counts('opticians')->label('Magasins'),
            ])
            ->recordActions([
                EditAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListNetworks::route('/'),
            'create' => CreateNetwork::route('/create'),
            'edit' => EditNetwork::route('/{record}/edit'),
        ];
    }
}
