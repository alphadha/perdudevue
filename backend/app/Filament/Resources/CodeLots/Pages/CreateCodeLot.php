<?php

namespace App\Filament\Resources\CodeLots\Pages;

use App\Filament\Resources\CodeLots\CodeLotResource;
use App\Services\CodeLotService;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Database\Eloquent\Model;

class CreateCodeLot extends CreateRecord
{
    protected static string $resource = CodeLotResource::class;

    protected function handleRecordCreation(array $data): Model
    {
        return app(CodeLotService::class)->create(
            (string) $data['name'],
            (int) $data['quantity'],
        );
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('view', ['record' => $this->getRecord()]);
    }
}
