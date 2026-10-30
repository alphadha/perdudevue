<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreOpticianRequest;
use App\Services\OpticianAdminService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class OpticianController extends Controller
{
    public function __construct(private readonly OpticianAdminService $opticians) {}

    public function store(StoreOpticianRequest $request): JsonResponse
    {
        $result = $this->opticians->create($request->validated(), $request->user(), $request);

        return ApiResponse::success([
            'uuid' => $result['optician']->uuid,
            'name' => $result['optician']->name,
            'admin_email' => $result['user']->email,
        ], null, 201);
    }
}
