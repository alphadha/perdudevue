<?php

namespace Tests\Feature;

use App\Mail\InvitationMail;
use App\Mail\PasswordOtpMail;
use App\Models\EmailTemplate;
use App\Models\User;
use App\Services\EmailTemplateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmailTemplateTest extends TestCase
{
    use RefreshDatabase;

    public function test_invitation_html_uses_pdv_layout_and_first_name(): void
    {
        $html = (new InvitationMail('token-abc', 'Camille'))->render();

        $this->assertStringContainsString('Bienvenue Camille', $html);
        $this->assertStringContainsString('Définir mon mot de passe', $html);
        $this->assertStringContainsString('/invitation/token-abc', $html);
        $this->assertStringContainsString('#24364D', $html);
        $this->assertStringContainsString('support@perduesdevue.fr', $html);
        $this->assertStringContainsString(rtrim((string) config('app.url'), '/').'/images/brand/logo.png', $html);
        $this->assertStringNotContainsString('cid:', $html);
        $this->assertStringNotContainsString('logo-mail.png', $html);
        $this->assertStringNotContainsString('<script>', $html);
    }

    public function test_admin_can_change_email_copy(): void
    {
        app(EmailTemplateService::class)->ensureDefaults();
        EmailTemplate::query()->where('slug', 'password_otp')->update([
            'heading' => 'Nouveau titre OTP',
            'body' => 'Texte modifié pour le code.',
        ]);

        $html = (new PasswordOtpMail('654321'))->render();

        $this->assertStringContainsString('Nouveau titre OTP', $html);
        $this->assertStringContainsString('Texte modifié pour le code.', $html);
        $this->assertStringContainsString('654321', $html);
    }

    public function test_template_body_html_is_escaped(): void
    {
        app(EmailTemplateService::class)->ensureDefaults();
        EmailTemplate::query()->where('slug', 'invitation')->update([
            'body' => '<script>alert(1)</script> Bonjour {{firstName}}',
        ]);

        $html = (new InvitationMail('tok', 'Léa'))->render();

        $this->assertStringNotContainsString('<script>alert(1)</script>', $html);
        $this->assertStringContainsString('Bonjour Léa', $html);
    }

    public function test_admin_opens_email_templates_opticien_forbidden(): void
    {
        app(EmailTemplateService::class)->ensureDefaults();
        $admin = User::factory()->admin()->create();
        $opticien = User::factory()->opticienAdmin()->create();

        $this->actingAs($admin)->get('/admin/email-templates')->assertOk()->assertSee('Invitation client');
        $this->actingAs($admin)
            ->get('/admin/email-templates/'.EmailTemplate::query()->where('slug', 'invitation')->value('id').'/edit')
            ->assertOk()
            ->assertSee('{{firstName}}');
        $this->actingAs($opticien)->get('/admin/email-templates')->assertForbidden();
    }
}
