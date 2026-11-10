<?php

namespace App\Filament\Resources\EmailTemplates;

use App\Filament\Resources\EmailTemplates\Pages\EditEmailTemplate;
use App\Filament\Resources\EmailTemplates\Pages\ListEmailTemplates;
use App\Models\EmailTemplate;
use BackedEnum;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Model;
use UnitEnum;

class EmailTemplateResource extends Resource
{
    protected static ?string $model = EmailTemplate::class;

    protected static ?string $navigationLabel = 'Modèles d’e-mails';

    protected static ?string $modelLabel = 'modèle d’e-mail';

    protected static ?string $pluralModelLabel = 'modèles d’e-mails';

    protected static string|UnitEnum|null $navigationGroup = 'Contenu';

    protected static ?int $navigationSort = 10;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedEnvelopeOpen;

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canDeleteAny(): bool
    {
        return false;
    }

    public static function canDelete(Model $record): bool
    {
        return false;
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('Identité')->schema([
                TextInput::make('name')->label('Nom')->disabled()->dehydrated(false),
                TextInput::make('slug')->label('Clé')->disabled()->dehydrated(false),
            ])->columns(2),
            Section::make('Textes')
                ->description(fn (?EmailTemplate $record): string => $record === null
                    ? 'Variables : {{nom}}'
                    : 'Variables disponibles : '.collect($record->placeholders ?? [])->map(fn (string $key): string => '{{'.$key.'}}')->implode(' · '))
                ->schema([
                    TextInput::make('subject')->label('Objet')->required()->maxLength(180),
                    TextInput::make('heading')->label('Titre')->required()->maxLength(180),
                    Textarea::make('body')
                        ->label('Corps')
                        ->required()
                        ->rows(10)
                        ->helperText('Texte brut uniquement. Les sauts de ligne sont conservés. Pas de HTML.'),
                    TextInput::make('button_label')->label('Libellé du bouton')->maxLength(80),
                    TextInput::make('highlight_label')->label('Libellé du code (OTP, restitution, suivi)')->maxLength(80),
                ]),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')->label('E-mail')->searchable(),
                TextColumn::make('subject')->label('Objet')->limit(60),
                TextColumn::make('updated_at')->label('Modifié')->dateTime('d/m/Y H:i')->sortable(),
            ])
            ->defaultSort('name')
            ->recordActions([
                EditAction::make(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListEmailTemplates::route('/'),
            'edit' => EditEmailTemplate::route('/{record}/edit'),
        ];
    }
}
