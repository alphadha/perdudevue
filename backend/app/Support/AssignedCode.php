<?php

namespace App\Support;

use App\Models\CodeLotItem;
use App\Models\Pair;

final class AssignedCode
{
    public const PREFIX = 'FR';

    public const LENGTH = 8;

    public const EXAMPLE = 'FR5487OK';

    public const PATTERN = '/^FR[0-9]{4}[A-Z]{2}$/';

    public static function generateUnique(): string
    {
        do {
            $code = self::random();
        } while (
            Pair::query()->where('assigned_code', $code)->exists()
            || CodeLotItem::query()->where('code', $code)->exists()
        );

        return $code;
    }

    public static function normalize(string $code): string
    {
        return strtoupper((string) preg_replace('/\s+/', '', $code));
    }

    public static function isValid(string $code): bool
    {
        return (bool) preg_match(self::PATTERN, self::normalize($code));
    }

    private static function random(): string
    {
        $digits = '';
        for ($i = 0; $i < 4; $i++) {
            $digits .= (string) random_int(0, 9);
        }

        $letters = '';
        for ($i = 0; $i < 2; $i++) {
            $letters .= chr(random_int(65, 90));
        }

        return self::PREFIX.$digits.$letters;
    }
}
