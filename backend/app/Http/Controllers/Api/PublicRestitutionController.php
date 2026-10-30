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

        if ($record === null || ! $record->isUsable() || $record->pair === null || ! $record->pair->status->isOpenRestitution()) {
            return ApiResponse::message('Lien introuvable.', 404);
        }

        return ApiResponse::success(PublicRestitutionResource::make($record->pair)->resolve());
    }
}
