<?php

namespace App\Services;

use App\Models\NotificationLog;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Mail;

class NotificationService
{
    public function sendEmail(string $recipient, string $type, Mailable $mail): void
    {
        $this->send('email', $recipient, $type, function () use ($recipient, $mail): void {
            Mail::to($recipient)->send($mail);
        });
    }

    public function sendSms(string $recipient, string $type, ?callable $provider = null): void
    {
        $this->send('sms', $recipient, $type, function () use ($provider): void {
            if ($provider !== null) {
                $provider();
            }
        });
    }

    public function send(string $channel, string $recipient, string $type, callable $dispatch): void
    {
        try {
            $dispatch();
            $this->write($channel, $recipient, $type, 'sent');
        } catch (\Throwable) {
            $this->write($channel, $recipient, $type, 'error', 'provider_failure');
        }
    }

    private function write(string $channel, string $recipient, string $type, string $status, ?string $error = null): void
    {
        NotificationLog::query()->create([
            'channel' => $channel,
            'recipient' => $recipient,
            'type' => $type,
            'status' => $status,
            'error' => $error,
        ]);
    }
}
