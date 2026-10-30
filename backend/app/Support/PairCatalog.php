<?php

namespace App\Support;

final class PairCatalog
{
    public const OTHER_BRAND = 'Autre marque';

    /**
     * @return list<string>
     */
    public static function types(): array
    {
        return ['Vue', 'Soleil', 'Solaire de Vue'];
    }

    /**
     * @return list<string>
     */
    public static function brands(): array
    {
        return [
            'Gucci',
            'Ray-Ban',
            'Oakley',
            'Persol',
            'Dior',
            'Chanel',
            'Tom Ford',
            'Prada',
            self::OTHER_BRAND,
        ];
    }

    /**
     * @return list<string>
     */
    public static function colors(): array
    {
        return [
            'Noir',
            'Blanc',
            'Bleu',
            'Gris',
            'Marron',
            'Doré',
            'Argenté',
            'Rose',
            'Rouge',
            'Vert',
            'Écaille',
            'Transparent',
        ];
    }

    /**
     * @return array{types: list<string>, brands: list<string>, colors: list<string>}
     */
    public static function all(): array
    {
        return [
            'types' => self::types(),
            'brands' => self::brands(),
            'colors' => self::colors(),
        ];
    }
}
