<?php

namespace App\Filament\Resources\AuditLogs;

use App\Filament\Resources\AuditLogs\Pages\ListAuditLogs;
use App\Models\AuditLog;
use App\Models\Optician;
use App\Models\User;
use BackedEnum;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\Filter;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use UnitEnum;

class AuditLogResource extends Resource
{
    protected static ?string $model = AuditLog::class;

    protected static ?string $navigationLabel = 'Journal des modifications';

    protected static ?string $modelLabel = 'modification';

    protected static ?string $pluralModelLabel = 'modifications';

    protected static ?string $slug = 'journal-modifications';

    protected static string|UnitEnum|null $navigationGroup = 'Supervision';

    protected static ?int $navigationSort = 20;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedClipboardDocumentList;

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->activities();
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canEdit($record): bool
    {
        return false;
    }

    public static function canDelete($record): bool
    {
        return false;
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('created_at')
                    ->label('Quand')
                    ->dateTime('d/m/Y H:i:s')
                    ->sortable(),
                TextColumn::make('actor_label')
                    ->label('Qui')
                    ->searchable()
                    ->wrap()
                    ->placeholder('—'),
                TextColumn::make('summary')
                    ->label('Quoi')
                    ->searchable()
                    ->wrap()
                    ->limit(120)
                    ->tooltip(fn (AuditLog $record): string => $record->readableSummary()),
                TextColumn::make('action')
                    ->label('Action')
                    ->badge()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('optician.name')
                    ->label('Magasin')
                    ->placeholder('—')
                    ->toggleable(),
                TextColumn::make('ip_address')
                    ->label('IP')
                    ->searchable()
                    ->copyable()
                    ->placeholder('—'),
            ])
            ->filters([
                Filter::make('period')
                    ->label('Période')
                    ->form([
                        DatePicker::make('from')->label('Du'),
                        DatePicker::make('until')->label('Au'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when($data['from'] ?? null, fn (Builder $q, $date) => $q->whereDate('created_at', '>=', $date))
                            ->when($data['until'] ?? null, fn (Builder $q, $date) => $q->whereDate('created_at', '<=', $date));
                    }),
                SelectFilter::make('user_id')
                    ->label('Utilisateur')
                    ->options(fn (): array => User::query()
                        ->orderBy('email')
                        ->limit(200)
                        ->get()
                        ->mapWithKeys(fn (User $u) => [$u->id => $u->email])
                        ->all())
                    ->searchable(),
                SelectFilter::make('optician_id')
                    ->label('Magasin')
                    ->options(fn (): array => Optician::query()
                        ->orderBy('name')
                        ->pluck('name', 'id')
                        ->all())
                    ->searchable(),
                SelectFilter::make('action')
                    ->label('Type d’action')
                    ->options(fn (): array => AuditLog::query()
                        ->activities()
                        ->select('action')
                        ->distinct()
                        ->orderBy('action')
                        ->pluck('action', 'action')
                        ->all())
                    ->searchable(),
                Filter::make('ip_address')
                    ->label('Adresse IP')
                    ->form([
                        TextInput::make('value')->label('IP')->placeholder('ex. 127.0.0.1'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        $ip = trim((string) ($data['value'] ?? ''));

                        return $ip === ''
                            ? $query
                            : $query->where('ip_address', 'like', '%'.$ip.'%');
                    }),
            ])
            ->defaultSort('created_at', 'desc')
            ->paginated([25, 50, 100]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListAuditLogs::route('/'),
        ];
    }
}
