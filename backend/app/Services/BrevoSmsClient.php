<?php

namespace App\Services;

use App\Support\Phone;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/** SMS transactionnel Brevo (`/v3/transactionalSMS/sms`) — même clé API que les e-mails. */
class BrevoSmsClient
{
    public function send(string $recipient, string $content): void
    {
        $apiKey = (string) config('services.brevo.key');
        if ($apiKey === '') {
            throw new RuntimeException('Clé API Brevo absente.');
        }

        $response = Http::withHeaders([
            'api-key' => $apiKey,
            'accept' => 'application/json',
            'content-type' => 'application/json',
        ])->timeout(15)->post('https://api.brevo.com/v3/transactionalSMS/sms', [
            'sender' => $this->sender(),
            'recipient' => Phone::toInternationalFr($recipient),
            'content' => $content,
            'type' => 'transactional',
        ]);

        if ($response->failed()) {
            throw new RuntimeException('Brevo SMS HTTP '.$response->status());
        }
    }

    private function sender(): string
    {
        $raw = preg_replace('/[^A-Za-z0-9]/', '', (string) config('services.sms.from', 'PERDUESDV')) ?? '';
        $sender = strtoupper($raw !== '' ? $raw : 'PERDUESDV');

        return substr($sender, 0, 11);
    }
}
