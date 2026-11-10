<?php

namespace App\Services;

use App\Mail\IdentityOtpMail;
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

    public function sendSms(string $recipient, string $type, ?callable $override = null, ?string $body = null): void
    {
        $this->send('sms', $recipient, $type, function () use ($recipient, $type, $override, $body): void {
            if ($override !== null) {
                $override();
            }

            if ($this->smsProvider() !== 'brevo') {
                return;
            }

            app(BrevoSmsClient::class)->send(
                $recipient,
                $body ?? $this->defaultSmsContent($type),
            );
        });
    }

    public function sendIdentityOtpSms(string $phone, string $code): void
    {
        $text = 'Perdues de Vue : votre code est '.$code.'. Il expire dans 15 minutes.';
        $sink = $this->smsProvider() === 'brevo'
            ? null
            : function () use ($code): void {
                Mail::to(config('mail.from.address'))->send(new IdentityOtpMail($code, 'sms'));
            };

        $this->sendSms($phone, 'identity_otp', $sink, $text);
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

    private function smsProvider(): string
    {
        return (string) config('services.sms.provider', 'log');
    }

    private function defaultSmsContent(string $type): string
    {
        return match ($type) {
            'identity_otp' => 'Perdues de Vue : votre code de vérification. Il expire dans 15 minutes.',
            'pair_found' => 'Perdues de Vue : vos lunettes ont été retrouvées. Consultez votre e-mail ou l’espace client pour le code de restitution.',
            default => 'Notification Perdues de Vue.',
        };
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
