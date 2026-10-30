<?php

namespace App\Support;

use App\Models\Pair;

final class PickupCode
{
    public const LENGTH = 6;

    private const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    public static function generateUnique(): string
    {
        do {
            $code = self::random();
        } while (Pair::query()->where('pickup_code', $code)->exists());

        return $code;
    }

    public static function normalize(string $code): string
    {
        return strtoupper((string) preg_replace('/\s+/', '', $code));
    }

    private static function random(): string
    {
        $out = '';
        $max = strlen(self::ALPHABET) - 1;
        for ($i = 0; $i < self::LENGTH; $i++) {
            $out .= self::ALPHABET[random_int(0, $max)];
        }

        return $out;
    }
};
