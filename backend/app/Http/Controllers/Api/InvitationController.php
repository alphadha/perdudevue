<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ActivateInvitationRequest;
use App\Http\Resources\UserResource;
use App\Services\InvitationService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class InvitationController extends Controller
{
    public function __construct(private readonly InvitationService $invitations) {}

    public function show(string $token): JsonResponse
    {
        $invitation = $this->invitations->findUsable($token);
        if ($invitation === null) {
            return ApiResponse::message('Lien d’invitation invalide ou déjà utilisé.', 404);
        }

        $user = $invitation->user;

        return ApiResponse::success([
            'email' => $user->email,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'cgu_required' => true,
        ]);
    }

    public function activate(ActivateInvitationRequest $request, string $token): JsonResponse
    {
        $invitation = $this->invitations->findUsable($token);
        if ($invitation === null) {
            return ApiResponse::message('Lien d’invitation invalide ou déjà utilisé.', 404);
        }

        $user = $this->invitations->activate($invitation, $request->string('password')->toString());
        $access = $user->createToken('web')->plainTextToken;

        return ApiResponse::success([
            'token' => $access,
            'user' => UserResource::make($user)->resolve(),
        ]);
    }
}
