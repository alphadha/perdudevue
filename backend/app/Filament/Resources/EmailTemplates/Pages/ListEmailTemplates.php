<?php

namespace App\Filament\Resources\EmailTemplates\Pages;

use App\Filament\Resources\EmailTemplates\EmailTemplateResource;
use App\Services\EmailTemplateService;
use Filament\Resources\Pages\ListRecords;

class ListEmailTemplates extends ListRecords
{
    protected static string $resource = EmailTemplateResource::class;

    public function mount(): void
    {
        app(EmailTemplateService::class)->ensureDefaults();

        parent::mount();
    }
}
