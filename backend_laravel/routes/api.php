<?php

use App\Http\Controllers\Api\ApplicationController;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\ModeratorApplicationController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:10,1');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
    Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:10,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
    });
});

Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/me', fn (Request $request) => $request->user());

    Route::get('/applications', [ApplicationController::class, 'index']);
    Route::post('/applications', [ApplicationController::class, 'store']);
    Route::patch('/applications/{application}', [ApplicationController::class, 'update']);
    Route::get('/applications/{application}', [ApplicationController::class, 'show']);
    Route::get('/applications/{application}/file', [ApplicationController::class, 'download']);
    Route::post('/applications/{application}/payment-receipt', [ApplicationController::class, 'uploadPaymentReceipt']);
    Route::get('/applications/{application}/payment-receipt-file', [ApplicationController::class, 'paymentReceiptFile']);

    Route::prefix('moderator')->group(function () {
        Route::get('/applications', [ModeratorApplicationController::class, 'index']);
        Route::patch('/applications/{application}/status', [ModeratorApplicationController::class, 'updateStatus']);
        Route::get('/applications-export', [ModeratorApplicationController::class, 'export']);
    });
});
