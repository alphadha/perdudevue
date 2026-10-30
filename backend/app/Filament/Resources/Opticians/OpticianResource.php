<?php

namespace App\Filament\Resources\Opticians;

use App\Filament\Resources\Opticians\Pages\CreateOptician;
use App\Filament\Resources\Opticians\Pages\EditOptician;
use App\Filament\Resources\Opticians\Pages\ListOpticians;
use App\Filament\Resources\Opticians\RelationManagers\UsersRelationManager;
use App\Filament\Resources\Opticians\Schemas\OpticianForm;
use App\Filament\Resources\Opticians\Tables\OpticiansTable;
use App\Models\Optician;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class OpticianResource extends Resource
{
    protected static ?string $model = Optician::class;

    protected static ?string $navigationLabel = 'Opticiens';

    protected static ?string $modelLabel = 'opticien';

    protected static ?string $pluralModelLabel = 'opticiens';

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedBuildingStorefront;

    public static function form(Schema $schema): Schema
    {
        return OpticianForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return OpticiansTable::configure($table);
    }

    public static function getRelations(): array
    {
        return [
            UsersRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListOpticians::route('/'),
            'create' => CreateOptician::route('/create'),
            'edit' => EditOptician::route('/{record}/edit'),
        ];
    }
}
