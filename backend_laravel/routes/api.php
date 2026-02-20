<?php

use App\Http\Controllers\Api\ApplicationController;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\ModeratorApplicationController;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:10,1');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
    });
});

Route::get('/email/verify/{id}/{hash}', function (Request $request) {
    if (! $request->hasValidSignature()) {
        abort(403);
    }

    $user = User::findOrFail((int) $request->route('id'));

    if (! hash_equals((string) $request->route('hash'), sha1($user->getEmailForVerification()))) {
        abort(403);
    }

    if (! $user->hasVerifiedEmail()) {
        $user->markEmailAsVerified();
        event(new Verified($user));
    }

    if ($request->expectsJson()) {
        return response()->json(['message' => 'Email успешно подтвержден.']);
    }

    $frontendUrl = rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/');

    return redirect()->away($frontendUrl . '/?verified=1');
})->middleware('signed')->name('verification.verify');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/email/verification-notification', function (Request $request) {
        $request->user()->sendEmailVerificationNotification();

        return response()->json(['message' => 'Ссылка для подтверждения отправлена.']);
    })->middleware('throttle:6,1')->name('verification.send');
});

Route::middleware(['auth:sanctum', 'verified'])->group(function () {
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
