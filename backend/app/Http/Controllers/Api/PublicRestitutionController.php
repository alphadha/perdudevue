<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicRestitutionResource;
use App\Models\PublicRestitutionToken;
use App\Support\ApiResponse;
use App\Support\SecureToken;
use Illuminate\Http\JsonResponse;

class PublicRestitutionController extends Controller
{
    public function show(string $token): JsonResponse
    {
        $record = PublicRestitutionToken::query()
            ->where('token_hash', SecureToken::hash($token))
            ->with(['pair.originOptician', 'pair.depositaryOptician'])
            ->first();

        if ($record === null || $record->pair === null) {
            return ApiResponse::message('Ce lien n’est plus valide.', 404, 'link_invalid');
        }

        if (! $record->isUsable()) {
            return ApiResponse::message('Ce lien n’est plus valide.', 410, 'link_expired');
        }

        if (! $record->pair->status->isOpenRestitution()) {
            return ApiResponse::message('Ces lunettes vous ont été remises.', 409, 'already_returned');
        }

        return ApiResponse::success(PublicRestitutionResource::make($record->pair)->resolve());
    }
}
