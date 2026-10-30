<?php

namespace App\Filament\Resources\CodeLots\Pages;

use App\Filament\Resources\CodeLots\CodeLotResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListCodeLots extends ListRecords
{
    protected static string $resource = CodeLotResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
