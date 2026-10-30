<?php

namespace App\Filament\Resources\CodeLots;

use App\Filament\Resources\CodeLots\Pages\CreateCodeLot;
use App\Filament\Resources\CodeLots\Pages\ListCodeLots;
use App\Filament\Resources\CodeLots\Pages\ViewCodeLot;
use App\Filament\Resources\CodeLots\RelationManagers\ItemsRelationManager;
use App\Models\CodeLot;
use App\Services\CodeLotService;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Actions\ViewAction;
use Filament\Forms\Components\TextInput;
use Filament\Infolists\Components\TextEntry;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use UnitEnum;

class CodeLotResource extends Resource
{
    protected static ?string $model = CodeLot::class;

    protected static ?string $navigationLabel = 'Lots de codes';

    protected static ?string $modelLabel = 'lot de codes';

    protected static ?string $pluralModelLabel = 'lots de codes';

    protected static ?string $recordTitleAttribute = 'name';

    protected static string|UnitEnum|null $navigationGroup = 'Codes';

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedQrCode;

    public static function canEdit(Model $record): bool
    {
        return false;
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('name')->label('Nom du lot')->required()->maxLength(120),
            TextInput::make('quantity')->label('Nombre de codes')->numeric()->required()->minValue(1)->maxValue(500)->default(50),
        ]);
    }

    public static function infolist(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('Lot')->schema([
                TextEntry::make('name')->label('Nom'),
                TextEntry::make('quantity')->label('Quantité'),
                TextEntry::make('status')->label('Statut')->formatStateUsing(
                    fn (string $state, CodeLot $record): string => $record->statusLabel()
                ),
                TextEntry::make('exported_at')->label('Exporté le')->dateTime('d/m/Y H:i')->placeholder('—'),
                TextEntry::make('created_at')->label('Créé le')->date('d/m/Y H:i'),
            ])->columns(2),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->withCount([
                'items as available_count' => fn (Builder $inner) => $inner->where('status', 'available'),
                'items as assigned_count' => fn (Builder $inner) => $inner->where('status', 'assigned'),
            ]))
            ->columns([
                TextColumn::make('name')->label('Lot')->searchable(),
                TextColumn::make('quantity')->label('Quantité'),
                TextColumn::make('available_count')->label('Disponibles'),
                TextColumn::make('assigned_count')->label('Associés'),
                TextColumn::make('status')
                    ->label('Statut')
                    ->formatStateUsing(fn (string $state, CodeLot $record): string => $record->statusLabel()),
                TextColumn::make('exported_at')->label('Exporté le')->dateTime('d/m/Y H:i')->placeholder('—'),
                TextColumn::make('created_at')->label('Créé le')->date('d/m/Y'),
            ])
            ->recordActions([
                ViewAction::make(),
                Action::make('export')
                    ->label('Exporter CSV')
                    ->action(function (CodeLot $record) {
                        $csv = app(CodeLotService::class)->csv($record);

                        return response()->streamDownload(function () use ($csv): void {
                            echo $csv;
                        }, 'lot-codes-'.$record->uuid.'.csv', [
                            'Content-Type' => 'text/csv; charset=UTF-8',
                        ]);
                    }),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            ItemsRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListCodeLots::route('/'),
            'create' => CreateCodeLot::route('/create'),
            'view' => ViewCodeLot::route('/{record}'),
        ];
    }
}
