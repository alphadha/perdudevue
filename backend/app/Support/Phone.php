<?php

namespace App\Support;

final class Phone
{
    public static function toInternationalFr(?string $phone): string
    {
        $digits = self::digits($phone) ?? '';
        if (str_starts_with($digits, '33')) {
            return $digits;
        }
        if (strlen($digits) === 10 && str_starts_with($digits, '0')) {
            return '33'.substr($digits, 1);
        }

        return $digits;
    }

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
