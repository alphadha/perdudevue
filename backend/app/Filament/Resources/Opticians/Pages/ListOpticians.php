<?php

namespace App\Filament\Resources\Opticians\Pages;

use App\Filament\Resources\Opticians\OpticianResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListOpticians extends ListRecords
{
    protected static string $resource = OpticianResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
