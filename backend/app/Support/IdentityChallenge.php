<?php

namespace App\Support;

final class IdentityChallenge
{
    public function __construct(
        public readonly string $actionToken,
        public readonly string $otpChannel,
        public readonly ?string $maskedEmail = null,
        public readonly ?string $maskedPhone = null,
    ) {}
}
