<?php

namespace App\Exceptions;

use App\Models\Client;
use RuntimeException;

class ClientDuplicateException extends RuntimeException
{
    public function __construct(
        public readonly Client $client,
        public readonly string $actionToken,
        public readonly bool $alreadyLinked = false,
    ) {
        parent::__construct('Un compte client avec les informations personnelles que vous avez saisies existe déjà.');
    }
}
