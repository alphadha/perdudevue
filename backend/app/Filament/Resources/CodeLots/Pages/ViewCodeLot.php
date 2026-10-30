<?php

namespace App\Filament\Resources\CodeLots\Pages;

use App\Filament\Resources\CodeLots\CodeLotResource;
use App\Models\CodeLot;
use App\Services\CodeLotService;
use Filament\Actions\Action;
use Filament\Resources\Pages\ViewRecord;

class ViewCodeLot extends ViewRecord
{
    protected static string $resource = CodeLotResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Action::make('export')
                ->label('Exporter CSV')
                ->action(function (): mixed {
                    /** @var CodeLot $lot */
                    $lot = $this->getRecord();
                    $csv = app(CodeLotService::class)->csv($lot);

                    return response()->streamDownload(function () use ($csv): void {
                        echo $csv;
                    }, 'lot-codes-'.$lot->uuid.'.csv', [
                        'Content-Type' => 'text/csv; charset=UTF-8',
                    ]);
                }),
        ];
    }
}
