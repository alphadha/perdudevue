<?php

namespace App\Providers;

use App\Listeners\RecordFilamentAuthAudit;
use App\Services\PlatformSettingsService;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(PlatformSettingsService::class);
    }

    public function boot(): void
    {
        Event::listen(Login::class, [RecordFilamentAuthAudit::class, 'handleLogin']);
        Event::listen(Failed::class, [RecordFilamentAuthAudit::class, 'handleFailed']);
        Event::listen(Logout::class, [RecordFilamentAuthAudit::class, 'handleLogout']);

        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip().'|'.strtolower((string) $request->input('email')));
        });

        RateLimiter::for('password-otp', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip().'|'.strtolower((string) $request->input('email')));
        });

        RateLimiter::for('identity-otp', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip().'|'.$request->user()?->id.'|'.$request->route('token'));
        });

        RateLimiter::for('pickup-resend', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip().'|'.$request->user()?->id.'|'.$request->route('uuid'));
        });
    }
}
