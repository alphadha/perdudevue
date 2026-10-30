<?php

namespace App\Filament\Resources\LoginLogs;

use App\Filament\Resources\LoginLogs\Pages\ListLoginLogs;
use App\Models\AuditLog;
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

class LoginLogResource extends Resource
{
    protected static ?string $model = AuditLog::class;

    protected static ?string $navigationLabel = 'Journal des connexions';

    protected static ?string $modelLabel = 'connexion';

    protected static ?string $pluralModelLabel = 'connexions';

    protected static ?string $slug = 'journal-connexions';

    protected static string|UnitEnum|null $navigationGroup = 'Supervision';

    protected static ?int $navigationSort = 21;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedFingerPrint;

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->authEvents();
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
                TextColumn::make('space')
                    ->label('Espace')
                    ->state(fn (AuditLog $record): string => (string) data_get($record->meta, 'space', '—'))
                    ->badge(),
                TextColumn::make('action')
                    ->label('Résultat')
                    ->badge()
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'login' => 'Succès',
                        'login_failed' => 'Échec',
                        'logout' => 'Déconnexion',
                        default => $state,
                    })
                    ->color(fn (string $state): string => match ($state) {
                        'login' => 'success',
                        'login_failed' => 'danger',
                        'logout' => 'gray',
                        default => 'gray',
                    }),
                TextColumn::make('summary')
                    ->label('Détail')
                    ->searchable()
                    ->wrap()
                    ->limit(100)
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
                SelectFilter::make('action')
                    ->label('Résultat')
                    ->options([
                        'login' => 'Succès',
                        'login_failed' => 'Échec',
                        'logout' => 'Déconnexion',
                    ]),
                SelectFilter::make('space')
                    ->label('Espace')
                    ->options([
                        'client' => 'Client',
                        'opticien' => 'Opticien',
                        'admin' => 'Admin',
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        $value = $data['value'] ?? null;

                        return filled($value)
                            ? $query->where('meta->space', $value)
                            : $query;
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
            'index' => ListLoginLogs::route('/'),
        ];
    }
}
