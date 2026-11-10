<?php

namespace App\Support;

final class Brand
{
    public static function url(string $path = ''): string
    {
        return rtrim((string) config('app.url'), '/').($path !== '' ? '/'.ltrim($path, '/') : '');
    }

    public static function logoUrl(): string
    {
        return self::url('images/brand/logo.svg');
    }

    public static function logoPngUrl(): string
    {
        return self::url('images/brand/logo.png');
    }
}
