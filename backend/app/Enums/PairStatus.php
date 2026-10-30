<?php

namespace App\Enums;

enum PairStatus: string
{
    case AGraver = 'a_graver';
    case Active = 'active';
    case Perdue = 'perdue';
    case Inactive = 'inactive';
    case ARecuperer = 'a_recuperer';
    case LivraisonDemandee = 'livraison_demandee';
    case EnLivraison = 'en_livraison';
    case Archivee = 'archivee';

    public function label(): string
    {
        return match ($this) {
            self::AGraver => 'À graver',
            self::Active => 'Active',
            self::Perdue => 'Perdue',
            self::Inactive => 'Inactive',
            self::ARecuperer => 'À récupérer',
            self::LivraisonDemandee => 'Livraison demandée',
            self::EnLivraison => 'En livraison',
            self::Archivee => 'Supprimée',
        };
    }

    public function allowsLostOrFound(): bool
    {
        return in_array($this, [self::Active, self::Perdue], true);
    }

    /** Figma opticien : « Déclarer comme inactive » uniquement depuis Active. */
    public function canInactivate(): bool
    {
        return $this === self::Active;
    }

    /** Figma client : inactive depuis Active ou Perdue. */
    public function canClientInactivate(): bool
    {
        return in_array($this, [self::Active, self::Perdue], true);
    }

    public function isOpenRestitution(): bool
    {
        return in_array($this, [self::ARecuperer, self::LivraisonDemandee, self::EnLivraison], true);
    }

    public function isVisibleToClient(): bool
    {
        return in_array($this, self::clientListOrder(), true);
    }

    /**
     * @return list<self>
     */
    public static function clientListOrder(): array
    {
        return [
            self::ARecuperer,
            self::EnLivraison,
            self::LivraisonDemandee,
            self::Perdue,
            self::Active,
            self::Inactive,
        ];
    }

    public function clientSortIndex(): int
    {
        foreach (self::clientListOrder() as $index => $status) {
            if ($status === $this) {
                return $index;
            }
        }

        return 99;
    }
}
