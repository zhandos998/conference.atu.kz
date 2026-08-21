<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreApplicationRequest;
use App\Http\Requests\UpdateApplicationRequest;
use App\Http\Requests\UploadPaymentReceiptRequest;
use App\Models\Application;
use App\Models\SystemSetting;
use App\Notifications\ApplicationSubmittedNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ApplicationController extends Controller
{
    public function submissionSettings(Request $request)
    {
        $conferenceType = $this->conferenceFromRequest($request);

        return response()->json([
            'conference_type' => $conferenceType,
            'enabled' => $this->isApplicationSubmissionEnabled($conferenceType),
        ]);
    }

    public function feeSettings(Request $request)
    {
        return response()->json(SystemSetting::getConferenceFees($this->conferenceFromRequest($request)));
    }

    public function index(Request $request)
    {
        $query = $request->user()->applications()->latest();

        if ($request->filled('conference') || $request->filled('conference_type')) {
            $query->where('conference_type', $this->conferenceFromRequest($request));
        }

        return response()->json($query->get());
    }

    public function store(StoreApplicationRequest $request)
    {
        $conferenceType = $this->conferenceFromRequest($request);

        if (! $this->isApplicationSubmissionEnabled($conferenceType)) {
            return response()->json([
                'message' => 'Прием заявок временно отключен менеджером.',
            ], 403);
        }

        $filePath = null;
        if ($request->hasFile('file')) {
            $filePath = $request->file('file')->store('applications', 'public');
        }

        $data = $request->validated();
        $data['conference_type'] = $conferenceType;
        $data['participant_category'] = $data['participant_category'] ?? Application::PARTICIPANT_CATEGORY_PARTICIPANT;
        $data['country_group'] = $data['country_group'] ?? Application::COUNTRY_GROUP_KZ;

        $application = $request->user()->applications()->create([
            ...$data,
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

        $conferenceType = Application::normalizeConferenceType($request->input('conference_type', $application->conference_type));

        if (! $this->isApplicationSubmissionEnabled($conferenceType)) {
            return response()->json([
                'message' => 'Повторная отправка заявок временно отключена менеджером.',
            ], 403);
        }

        $data = $request->validated();
        $data['conference_type'] = $conferenceType;
        $data['participant_category'] = $data['participant_category'] ?? Application::PARTICIPANT_CATEGORY_PARTICIPANT;
        $data['country_group'] = $data['country_group'] ?? Application::COUNTRY_GROUP_KZ;

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
            'payment_fee_amount' => null,
            'payment_fee_currency' => null,
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

    private function conferenceFromRequest(Request $request): string
    {
        return Application::normalizeConferenceType(
            $request->input('conference_type', $request->query('conference')),
        );
    }

    private function isApplicationSubmissionEnabled(?string $conferenceType = null): bool
    {
        return SystemSetting::getBoolean(SystemSetting::applicationSubmissionKey($conferenceType), true);
    }
}
