<?php

namespace App\Filament\Resources\NotificationLogs;

use App\Filament\Resources\NotificationLogs\Pages\ListNotificationLogs;
use App\Models\NotificationLog;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use UnitEnum;

class NotificationLogResource extends Resource
{
    protected static ?string $model = NotificationLog::class;

    protected static ?string $navigationLabel = 'Journal des notifications';

    protected static ?string $modelLabel = 'notification';

    protected static ?string $pluralModelLabel = 'notifications';

    protected static string|UnitEnum|null $navigationGroup = 'Supervision';

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedBell;

    public static function canCreate(): bool
    {
        return false;
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('created_at')->label('Date')->dateTime('d/m/Y H:i')->sortable(),
                TextColumn::make('channel')->label('Canal'),
                TextColumn::make('type')->label('Type')->searchable(),
                TextColumn::make('recipient')->label('Destinataire')->searchable(),
                TextColumn::make('status')->label('Statut')->badge(),
                TextColumn::make('error')->label('Erreur')->limit(40)->placeholder('—'),
            ])
            ->filters([
                SelectFilter::make('channel')->options([
                    'email' => 'E-mail',
                    'sms' => 'SMS',
                ]),
                SelectFilter::make('status')->options([
                    'sent' => 'Envoyée',
                    'skipped' => 'Ignorée',
                    'failed' => 'Échec',
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => ListNotificationLogs::route('/'),
        ];
    }
}
