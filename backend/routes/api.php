<?php

use App\Http\Controllers\Api\Admin\OpticianController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Client\PairController as ClientPairController;
use App\Http\Controllers\Api\Client\ProfileController as ClientProfileController;
use App\Http\Controllers\Api\Client\ShipmentController as ClientShipmentController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\InvitationController;
use App\Http\Controllers\Api\Opticien\ClientController;
use App\Http\Controllers\Api\Opticien\DashboardController;
use App\Http\Controllers\Api\Opticien\NotificationController as OpticienNotificationController;
use App\Http\Controllers\Api\Opticien\PairController;
use App\Http\Controllers\Api\Opticien\RestitutionController;
use App\Http\Controllers\Api\Opticien\AccountController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\PublicRestitutionController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);

Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/auth/password/forgot', [PasswordResetController::class, 'forgot'])->middleware('throttle:password-otp');
Route::post('/auth/password/otp', [PasswordResetController::class, 'verify'])->middleware('throttle:password-otp');
Route::post('/auth/password/reset', [PasswordResetController::class, 'reset'])->middleware('throttle:password-otp');

Route::get('/auth/invitation/{token}', [InvitationController::class, 'show']);
Route::post('/auth/invitation/{token}', [InvitationController::class, 'activate']);

Route::get('/public/restitutions/{token}', [PublicRestitutionController::class, 'show']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::middleware('role:admin_pdv')->prefix('admin')->group(function () {
        Route::post('/opticians', [OpticianController::class, 'store']);
    });

    Route::middleware('role:client')->prefix('client')->group(function () {
        Route::get('/profile', [ClientProfileController::class, 'show']);
        Route::patch('/profile', [ClientProfileController::class, 'update']);
        Route::patch('/profile/consents', [ClientProfileController::class, 'updateConsents']);
        Route::patch('/account/password', [AccountController::class, 'password']);
        Route::patch('/account/email', [AccountController::class, 'email']);
        Route::delete('/account', [AccountController::class, 'destroy']);
        Route::get('/pairs', [ClientPairController::class, 'index']);
        Route::get('/pairs/{uuid}', [ClientPairController::class, 'show']);
        Route::post('/pairs/{uuid}/lost', [ClientPairController::class, 'declareLost']);
        Route::post('/pairs/{uuid}/recovered', [ClientPairController::class, 'cancelLost']);
        Route::post('/pairs/{uuid}/inactivate', [ClientPairController::class, 'inactivate']);
        Route::delete('/pairs/{uuid}', [ClientPairController::class, 'destroy']);
        Route::post('/pairs/{uuid}/resend', [ClientPairController::class, 'resend'])
            ->middleware('throttle:pickup-resend');
        Route::get('/pairs/{uuid}/shipping', [ClientShipmentController::class, 'quote']);
        Route::post('/pairs/{uuid}/shipments', [ClientShipmentController::class, 'checkout']);
        Route::post('/pairs/{uuid}/shipments/pay', [ClientShipmentController::class, 'pay']);
    });

    Route::middleware('role:opticien_admin,opticien_user')->prefix('opticien')->group(function () {
        Route::get('/clients', [ClientController::class, 'index']);
        Route::post('/clients', [ClientController::class, 'store']);
        Route::post('/clients/duplicates/{token}/confirm', [ClientController::class, 'confirmDuplicate']);
        Route::post('/clients/duplicates/{token}/update', [ClientController::class, 'updateDuplicate']);
        Route::post('/clients/identity/{token}/otp', [ClientController::class, 'verifyIdentity'])
            ->middleware('throttle:identity-otp');
        Route::post('/clients/identity/{token}/resend', [ClientController::class, 'resendIdentity'])
            ->middleware('throttle:identity-otp');
        Route::get('/clients/{uuid}', [ClientController::class, 'show']);
        Route::patch('/clients/{uuid}', [ClientController::class, 'update']);
        Route::delete('/clients/{uuid}', [ClientController::class, 'destroy']);
        Route::patch('/account/password', [AccountController::class, 'password']);
        Route::patch('/account/email', [AccountController::class, 'email']);
        Route::delete('/account', [AccountController::class, 'destroy']);
        Route::get('/dashboard', [DashboardController::class, 'show']);
        Route::get('/catalogs/pairs', [PairController::class, 'catalog']);
        Route::get('/pairs', [PairController::class, 'index']);
        Route::post('/pairs', [PairController::class, 'store']);
        Route::get('/pairs/{uuid}', [PairController::class, 'show']);
        Route::post('/pairs/{uuid}/engrave', [PairController::class, 'engrave']);
        Route::post('/pairs/{uuid}/inactivate', [PairController::class, 'inactivate']);
        Route::delete('/pairs/{uuid}', [PairController::class, 'destroy']);
        Route::get('/restitutions', [RestitutionController::class, 'index']);
        Route::post('/restitutions/identify', [RestitutionController::class, 'identify']);
        Route::post('/restitutions', [RestitutionController::class, 'store']);
        Route::post('/restitutions/lookup', [RestitutionController::class, 'lookup']);
        Route::post('/restitutions/handover', [RestitutionController::class, 'handover']);
        Route::post('/restitutions/{uuid}/resend', [RestitutionController::class, 'resend'])
            ->middleware('throttle:pickup-resend');
        Route::post('/restitutions/{uuid}/ship', [RestitutionController::class, 'markShipped']);
        Route::get('/restitutions/{uuid}/label', [RestitutionController::class, 'label']);
        Route::post('/labels', [RestitutionController::class, 'labels']);
        Route::get('/notifications', [OpticienNotificationController::class, 'index']);
        Route::patch('/notifications/read-all', [OpticienNotificationController::class, 'markAllRead']);
        Route::delete('/notifications', [OpticienNotificationController::class, 'destroyAll']);
        Route::patch('/notifications/{uuid}/read', [OpticienNotificationController::class, 'markRead']);
    });
});
