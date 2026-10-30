<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Évite les appels transporteurs réels pendant les Feature tests (credentials .env).
        config([
            'services.mondial_relay.api2.url' => '',
            'services.mondial_relay.api2.login' => '',
            'services.mondial_relay.api2.password' => '',
            'services.mondial_relay.api2.brand_id' => '',
            'services.colissimo.test_contract_number' => '',
            'services.colissimo.test_password' => '',
            'services.colissimo.contract_number' => '',
            'services.colissimo.password' => '',
        ]);
    }
}
