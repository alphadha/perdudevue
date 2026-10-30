<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\PlatformSettingsService;
use App\Support\EnvFile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Livewire\Livewire;
use Tests\TestCase;

class PlatformSettingsTest extends TestCase
{
    use RefreshDatabase;

    private string $envPath;

    protected function setUp(): void
    {
        parent::setUp();

        $this->envPath = storage_path('framework/testing/.env.platform-settings');
        File::ensureDirectoryExists(dirname($this->envPath));
        File::put($this->envPath, "APP_KEY=base64:dGVzdGtleXRlc3RrZXl0ZXN0a2V5dGVzdGt5dGVzdA==\n");

        $this->app->singleton(PlatformSettingsService::class, function () {
            return (new PlatformSettingsService)->useEnvFile(new EnvFile($this->envPath));
        });
    }

    protected function tearDown(): void
    {
        if (is_file($this->envPath)) {
            @unlink($this->envPath);
        }
        parent::tearDown();
    }

    public function test_admin_can_open_settings_page_from_user_menu_route(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->get('/admin/parametres')
            ->assertOk()
            ->assertSee('Mondial Relay')
            ->assertSee('Colissimo')
            ->assertSee('Stripe')
            ->assertSee('SMTP')
            ->assertSee('Cartes');
    }

    public function test_opticien_cannot_open_settings(): void
    {
        $user = User::factory()->opticienAdmin()->create();

        $this->actingAs($user)
            ->get('/admin/parametres')
            ->assertForbidden();
    }

    public function test_saving_settings_writes_env_and_clears_config(): void
    {
        $admin = User::factory()->admin()->create();

        Livewire::actingAs($admin)
            ->test(\App\Filament\Pages\PlatformSettings::class)
            ->fillForm([
                'mondial_relay.mode' => 'test',
                'mondial_relay.api1.test.enseigne' => 'TTMRSDBX',
                'mondial_relay.api1.test.private_key' => 'secret-test-key',
                'mondial_relay.api1.test.brand' => 'TT',
                'mondial_relay.api1.test.brand_code' => '99',
                'stripe.secret' => 'sk_test_example',
            ])
            ->call('save')
            ->assertHasNoFormErrors();

        $env = File::get($this->envPath);
        $this->assertStringContainsString('MONDIAL_RELAY_API1_TEST_ENSEIGNE=TTMRSDBX', $env);
        $this->assertStringContainsString('MONDIAL_RELAY_API1_TEST_PRIVATE_KEY=secret-test-key', $env);
        $this->assertStringContainsString('STRIPE_SECRET=sk_test_example', $env);

        $this->assertSame('TTMRSDBX', config('services.mondial_relay.api1.enseigne'));
        $this->assertSame('secret-test-key', config('services.mondial_relay.api1.private_key'));
        $this->assertSame('sk_test_example', config('services.stripe.secret'));
    }

    public function test_blank_secret_keeps_previous_env_value(): void
    {
        $admin = User::factory()->admin()->create();
        $service = app(PlatformSettingsService::class);

        $service->save([
            'stripe' => ['secret' => 'sk_keep_me'],
        ], $admin);

        Livewire::actingAs($admin)
            ->test(\App\Filament\Pages\PlatformSettings::class)
            ->fillForm([
                'stripe.secret' => '',
            ])
            ->call('save');

        $this->assertStringContainsString('STRIPE_SECRET=sk_keep_me', File::get($this->envPath));
    }
}
