<?php

namespace App\Enums;

enum Role: string
{
    case AdminPdv = 'admin_pdv';
    case OpticienAdmin = 'opticien_admin';
    case OpticienUser = 'opticien_user';
    case Client = 'client';

    /**
     * @return list<self>
     */
    public static function forSpace(string $space): array
    {
        return match ($space) {
            'admin' => [self::AdminPdv],
            'opticien' => [self::OpticienAdmin, self::OpticienUser],
            'client' => [self::Client],
            default => [],
        };
    }

    public function homePath(): string
    {
        return match ($this) {
            self::AdminPdv => '/admin',
            self::OpticienAdmin, self::OpticienUser => '/opticien',
            self::Client => '/client',
        };
    }
}
