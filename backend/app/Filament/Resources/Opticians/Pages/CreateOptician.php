<?php

namespace App\Filament\Resources\Opticians\Pages;

use App\Filament\Resources\Opticians\OpticianResource;
use App\Services\OpticianAdminService;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Database\Eloquent\Model;

class CreateOptician extends CreateRecord
{
    protected static string $resource = OpticianResource::class;

    protected function handleRecordCreation(array $data): Model
    {
        $result = app(OpticianAdminService::class)->create($data, auth()->user(), request());

        Notification::make()
            ->title('Opticien créé')
            ->body('Un e-mail d’invitation a été envoyé à '.$result['user']->email.' pour définir le mot de passe.')
            ->success()
            ->send();

        return $result['optician'];
    }
}
