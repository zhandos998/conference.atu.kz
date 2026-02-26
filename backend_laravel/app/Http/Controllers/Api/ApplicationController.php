<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreApplicationRequest;
use App\Http\Requests\UpdateApplicationRequest;
use App\Http\Requests\UploadPaymentReceiptRequest;
use App\Models\Application;
use App\Notifications\ApplicationSubmittedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ApplicationController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            $request->user()->applications()->latest()->get()
        );
    }

    public function store(StoreApplicationRequest $request)
    {
        $filePath = null;
        if ($request->hasFile('file')) {
            $filePath = $request->file('file')->store('applications', 'public');
        }

        $application = $request->user()->applications()->create([
            ...$request->validated(),
            'file_path' => $filePath,
            'status' => Application::STATUS_PENDING,
        ]);

        $request->user()->notify(new ApplicationSubmittedNotification($application));

        return response()->json($application, 201);
    }

    public function show(Request $request, Application $application)
    {
        $this->authorize('view', $application);

        return response()->json($application);
    }

    public function update(UpdateApplicationRequest $request, Application $application)
    {
        $this->authorize('update', $application);

        $data = $request->validated();

        if ($request->hasFile('file')) {
            if ($application->file_path) {
                Storage::disk('public')->delete($application->file_path);
            }

            $data['file_path'] = $request->file('file')->store('applications', 'public');
        }

        unset($data['file']);

        $application->update([
            ...$data,
            'status' => Application::STATUS_PENDING,
            'moderator_comment' => null,
        ]);

        $request->user()->notify(new ApplicationSubmittedNotification($application, true));

        return response()->json([
            'message' => 'Р—Р°СЏРІРєР° РѕР±РЅРѕРІР»РµРЅР° Рё РѕС‚РїСЂР°РІР»РµРЅР° РЅР° РїРѕРІС‚РѕСЂРЅРѕРµ СЂР°СЃСЃРјРѕС‚СЂРµРЅРёРµ.',
            'application' => $application->fresh(),
        ]);
    }

    public function download(Request $request, Application $application)
    {
        $this->authorize('view', $application);

        return Storage::disk('public')->download($application->file_path);
    }

    public function uploadPaymentReceipt(UploadPaymentReceiptRequest $request, Application $application)
    {
        $this->authorize('view', $application);

        if ($application->user_id !== $request->user()->id) {
            abort(403);
        }

        if ($application->status !== Application::STATUS_ACCEPTED) {
            return response()->json([
                'message' => 'Р—Р°РіСЂСѓР·РєР° С‡РµРєР° РґРѕСЃС‚СѓРїРЅР° С‚РѕР»СЊРєРѕ РґР»СЏ РїСЂРёРЅСЏС‚С‹С… РґРѕРєР»Р°РґРѕРІ.',
            ], 422);
        }

        if ($application->payment_receipt_path) {
            Storage::disk('public')->delete($application->payment_receipt_path);
        }

        $path = $request->file('payment_receipt')->store('payment-receipts', 'public');

        $application->update(['payment_receipt_path' => $path]);

        return response()->json([
            'message' => 'Р§РµРє СѓСЃРїРµС€РЅРѕ Р·Р°РіСЂСѓР¶РµРЅ.',
            'application' => $application->fresh(),
        ]);
    }

    public function paymentReceiptFile(Request $request, Application $application)
    {
        $this->authorize('view', $application);

        if (! $application->payment_receipt_path) {
            return response()->json(['message' => 'Р§РµРє РЅРµ Р·Р°РіСЂСѓР¶РµРЅ.'], 404);
        }

        if (! Storage::disk('public')->exists($application->payment_receipt_path)) {
            return response()->json(['message' => 'Р¤Р°Р№Р» С‡РµРєР° РЅРµ РЅР°Р№РґРµРЅ.'], 404);
        }

        $absolutePath = Storage::disk('public')->path($application->payment_receipt_path);
        $mime = Storage::disk('public')->mimeType($application->payment_receipt_path) ?? 'application/octet-stream';

        return response()->file($absolutePath, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline; filename="' . basename($application->payment_receipt_path) . '"',
        ]);
    }
}
