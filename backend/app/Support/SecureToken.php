<?php

namespace App\Support;

class SecureToken
{
    public static function plain(int $bytes = 32): string
    {
        return rtrim(strtr(base64_encode(random_bytes($bytes)), '+/', '-_'), '=');
    }

    public static function hash(string $plain): string
    {
        return hash('sha256', $plain);
    }

    public static function otp(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }
}
