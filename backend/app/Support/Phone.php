<?php

namespace App\Support;

final class Phone
{
    public static function digits(?string $phone): ?string
    {
        if ($phone === null || $phone === '') {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $phone);

        return $digits === '' ? null : $digits;
    }

    public static function mask(?string $phone): ?string
    {
        $digits = self::digits($phone);
        if ($digits === null) {
            return null;
        }
        $len = strlen($digits);
        if ($len < 4) {
            return str_repeat('*', $len);
        }

        return substr($digits, 0, 2).str_repeat('*', max(0, $len - 4)).substr($digits, -2);
    }

    public static function maskEmail(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');
        $keep = substr($local, 0, 1);

        return $keep.'******@'.$domain;
    }
}
