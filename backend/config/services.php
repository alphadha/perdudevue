<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'stripe' => [
        'key' => env('STRIPE_KEY'),
        'secret' => env('STRIPE_SECRET'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
    ],

    'qonto' => [
        'secret' => env('QONTO_SECRET'),
        'iban' => env('QONTO_IBAN'),
    ],

    'mondial_relay' => [
        'mode' => env('MONDIAL_RELAY_MODE', 'test'),
        'api1' => [
            'url' => env('MONDIAL_RELAY_MODE', 'test') === 'production'
                ? env('MONDIAL_RELAY_API1_PRODUCTION_URL')
                : env('MONDIAL_RELAY_API1_TEST_URL'),
            'enseigne' => env('MONDIAL_RELAY_MODE', 'test') === 'production'
                ? env('MONDIAL_RELAY_API1_PRODUCTION_ENSEIGNE')
                : env('MONDIAL_RELAY_API1_TEST_ENSEIGNE'),
            'private_key' => env('MONDIAL_RELAY_MODE', 'test') === 'production'
                ? env('MONDIAL_RELAY_API1_PRODUCTION_PRIVATE_KEY')
                : env('MONDIAL_RELAY_API1_TEST_PRIVATE_KEY'),
            'brand' => env('MONDIAL_RELAY_MODE', 'test') === 'production'
                ? env('MONDIAL_RELAY_API1_PRODUCTION_BRAND')
                : env('MONDIAL_RELAY_API1_TEST_BRAND'),
            'brand_code' => env('MONDIAL_RELAY_MODE', 'test') === 'production'
                ? env('MONDIAL_RELAY_API1_PRODUCTION_BRAND_CODE')
                : env('MONDIAL_RELAY_API1_TEST_BRAND_CODE'),
        ],
        'api2' => [
            'url' => env('MONDIAL_RELAY_MODE', 'test') === 'production'
                ? env('MONDIAL_RELAY_API2_PRODUCTION_URL')
                : env('MONDIAL_RELAY_API2_TEST_URL'),
            'brand_id' => env('MONDIAL_RELAY_MODE', 'test') === 'production'
                ? env('MONDIAL_RELAY_API2_PRODUCTION_BRAND_ID')
                : env('MONDIAL_RELAY_API2_TEST_BRAND_ID'),
            'login' => env('MONDIAL_RELAY_MODE', 'test') === 'production'
                ? env('MONDIAL_RELAY_API2_PRODUCTION_LOGIN')
                : env('MONDIAL_RELAY_API2_TEST_LOGIN'),
            'password' => env('MONDIAL_RELAY_MODE', 'test') === 'production'
                ? env('MONDIAL_RELAY_API2_PRODUCTION_PASSWORD')
                : env('MONDIAL_RELAY_API2_TEST_PASSWORD'),
        ],
    ],

    'colissimo' => [
        'mode' => env('COLISSIMO_MODE', 'test'),
        'api_key' => env('COLISSIMO_API_KEY'),
        'contract_number' => env('COLISSIMO_CONTRACT_NUMBER'),
        'password' => env('COLISSIMO_PASSWORD'),
        'api_url' => env('COLISSIMO_API_URL', 'https://ws.colissimo.fr/sls-ws/SlsServiceWSRest/2.0'),
        'test_api_key' => env('COLISSIMO_TEST_API_KEY'),
        'test_contract_number' => env('COLISSIMO_TEST_CONTRACT_NUMBER'),
        'test_password' => env('COLISSIMO_TEST_PASSWORD'),
        'test_api_url' => env(
            'COLISSIMO_TEST_API_URL',
            'https://ws.colissimo.fr/sls-ws/SlsServiceWSRest/2.0'
        ),
    ],

    'maps' => [
        'provider' => env('MAPS_PROVIDER', 'maplibre'),
        'maplibre_style_url' => env('MAPLIBRE_STYLE_URL'),
    ],

    'google' => [
        'maps_key' => env('GOOGLE_MAPS_KEY'),
    ],

    'sms' => [
        'provider' => env('SMS_PROVIDER', 'log'),
        'api_key' => env('SMS_API_KEY'),
        'api_secret' => env('SMS_API_SECRET'),
        'from' => env('SMS_FROM'),
    ],

];
