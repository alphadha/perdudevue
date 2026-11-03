<?php

return [
    'price_cents' => (int) env('SHIPPING_PRICE_CENTS', 299),
    'price_home_cents' => (int) env('SHIPPING_PRICE_HOME_CENTS', 990),
    'price_relay_cents' => (int) env('SHIPPING_PRICE_RELAY_CENTS', 490),
    'currency' => 'eur',
    /** @deprecated Utiliser carrier_home / carrier_relay */
    'carrier' => env('SHIPPING_CARRIER', 'Colissimo'),
    'carrier_home' => env('SHIPPING_CARRIER_HOME', 'Colissimo'),
    'carrier_relay' => env('SHIPPING_CARRIER_RELAY', 'Mondial Relay'),
    'eta_label' => env('SHIPPING_ETA_LABEL', 'Disponible sous 4-6 jours ouvrés'),
];
