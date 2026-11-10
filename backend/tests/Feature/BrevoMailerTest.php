<?php

namespace Tests\Feature;

use App\Mail\PasswordOtpMail;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Exception\TransportException;
use Tests\TestCase;

class BrevoMailerTest extends TestCase
{
    use RefreshDatabase;

    public function test_brevo_mailer_posts_to_api_not_smtp(): void
    {
        Http::fake([
            'https://api.brevo.com/v3/smtp/email' => Http::response(['messageId' => 'test-id'], 201),
        ]);

        config([
            'mail.default' => 'brevo',
            'mail.mailers.brevo' => [
                'transport' => 'brevo',
                'key' => 'xkeysib-test',
            ],
            'services.brevo.key' => 'xkeysib-test',
            'mail.from.address' => 'ne-pas-repondre@perduesdevue.fr',
            'mail.from.name' => 'Perdues de Vue',
        ]);
        Mail::purge('brevo');

        Mail::to('client@example.com')->send(new PasswordOtpMail('123456'));

        Http::assertSent(function ($request): bool {
            $payload = $request->data();

            return $request->url() === 'https://api.brevo.com/v3/smtp/email'
                && $request->hasHeader('api-key', 'xkeysib-test')
                && ($payload['to'][0]['email'] ?? null) === 'client@example.com'
                && ($payload['sender']['email'] ?? null) === 'ne-pas-repondre@perduesdevue.fr'
                && str_contains((string) ($payload['subject'] ?? ''), 'réinitialisation');
        });
    }

    public function test_brevo_mailer_fails_without_api_key(): void
    {
        Http::fake();

        config([
            'mail.default' => 'brevo',
            'mail.mailers.brevo' => [
                'transport' => 'brevo',
                'key' => '',
            ],
            'services.brevo.key' => '',
        ]);
        Mail::purge('brevo');

        $this->expectException(TransportException::class);
        Mail::to('client@example.com')->send(new PasswordOtpMail('123456'));
    }

    public function test_brevo_sms_posts_to_transactional_api(): void
    {
        Http::fake([
            'https://api.brevo.com/v3/transactionalSMS/sms' => Http::response(['reference' => 'sms-1'], 201),
        ]);

        config([
            'services.brevo.key' => 'xkeysib-test',
            'services.sms.provider' => 'brevo',
            'services.sms.from' => 'PERDUESDV',
        ]);

        app(NotificationService::class)->sendIdentityOtpSms('0612345678', '654321');

        Http::assertSent(function ($request): bool {
            $payload = $request->data();

            return $request->url() === 'https://api.brevo.com/v3/transactionalSMS/sms'
                && $request->hasHeader('api-key', 'xkeysib-test')
                && ($payload['recipient'] ?? null) === '33612345678'
                && ($payload['sender'] ?? null) === 'PERDUESDV'
                && str_contains((string) ($payload['content'] ?? ''), '654321');
        });
        $this->assertDatabaseHas('notification_logs', [
            'channel' => 'sms',
            'type' => 'identity_otp',
            'recipient' => '0612345678',
            'status' => 'sent',
        ]);
    }
}
