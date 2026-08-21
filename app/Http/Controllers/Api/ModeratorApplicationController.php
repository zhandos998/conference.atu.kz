<?php

namespace App\Http\Controllers\Api;

use App\Exports\ApplicationsExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateApplicationStatusRequest;
use App\Models\Application;
use App\Models\ApplicationStatusLog;
use App\Models\SystemSetting;
use App\Notifications\ApplicationStatusChangedNotification;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class ModeratorApplicationController extends Controller
{
    public function submissionSettings(Request $request)
    {
        $this->authorize('moderate', Application::class);
        $conferenceType = $this->conferenceFromRequest($request);

        return response()->json([
            'conference_type' => $conferenceType,
            'enabled' => $this->isApplicationSubmissionEnabled($conferenceType),
        ]);
    }

    public function updateSubmissionSettings(Request $request)
    {
        $this->authorize('moderate', Application::class);
        $conferenceType = $this->conferenceFromRequest($request);

        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
        ]);

        SystemSetting::setBoolean(SystemSetting::applicationSubmissionKey($conferenceType), (bool) $validated['enabled']);

        return response()->json([
            'conference_type' => $conferenceType,
            'enabled' => $this->isApplicationSubmissionEnabled($conferenceType),
        ]);
    }

    public function feeSettings(Request $request)
    {
        $this->authorize('moderate', Application::class);

        return response()->json(SystemSetting::getConferenceFees($this->conferenceFromRequest($request)));
    }

    public function updateFeeSettings(Request $request)
    {
        $this->authorize('moderate', Application::class);

        $validated = $request->validate([
            'participant' => ['required', 'array'],
            'participant.kz' => ['required', 'array'],
            'participant.kz.amount' => ['required', 'numeric', 'min:0', 'max:100000000'],
            'participant.foreign' => ['required', 'array'],
            'participant.foreign.amount' => ['required', 'numeric', 'min:0', 'max:100000000'],
            'student' => ['required', 'array'],
            'student.kz' => ['required', 'array'],
            'student.kz.amount' => ['required', 'numeric', 'min:0', 'max:100000000'],
            'student.foreign' => ['required', 'array'],
            'student.foreign.amount' => ['required', 'numeric', 'min:0', 'max:100000000'],
        ]);

        SystemSetting::setConferenceFees($validated, $this->conferenceFromRequest($request));

        return response()->json(SystemSetting::getConferenceFees($this->conferenceFromRequest($request)));
    }

    public function index(Request $request)
    {
        $this->authorize('moderate', Application::class);

        $query = Application::query()->with('user')->latest();
        $receipt = (string) $request->query('receipt', '');

        if ($request->filled('conference') || $request->filled('conference_type')) {
            $query->where('conference_type', $this->conferenceFromRequest($request));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('direction')) {
            $query->where('direction', $request->string('direction'));
        }

        if ($request->filled('full_name')) {
            $query->where('full_name', 'like', '%' . $request->string('full_name')->trim() . '%');
        }

        if ($request->filled('report_title')) {
            $query->where('report_title', 'like', '%' . $request->string('report_title')->trim() . '%');
        }

        if ($receipt === 'with') {
            $query->whereNotNull('payment_receipt_path')
                ->where('payment_receipt_path', '!=', '');
        }

        if ($receipt === 'without') {
            $query->where(function ($builder) {
                $builder->whereNull('payment_receipt_path')
                    ->orWhere('payment_receipt_path', '');
            });
        }

        return response()->json($query->paginate(20));
    }

    public function show(Application $application)
    {
        $this->authorize('moderate', Application::class);

        return response()->json($application->load('user'));
    }

    public function updateStatus(UpdateApplicationStatusRequest $request, Application $application)
    {
        $this->authorize('moderate', Application::class);

        $oldStatus = $application->status;
        $payload = $request->validated();

        if (isset($payload['moderator_comment']) && is_string($payload['moderator_comment'])) {
            $payload['moderator_comment'] = $this->normalizeUtf8($payload['moderator_comment']);
        }

        if ($payload['status'] === Application::STATUS_ACCEPTED) {
            $fee = SystemSetting::conferenceFeeFor($application->participant_category, $application->country_group, $application->conference_type);
            $payload['payment_fee_amount'] = $fee['amount'];
            $payload['payment_fee_currency'] = $fee['currency'];
        } else {
            $payload['payment_fee_amount'] = null;
            $payload['payment_fee_currency'] = null;
        }

        $application->update($payload);

        ApplicationStatusLog::create([
            'application_id' => $application->id,
            'moderator_id' => $request->user()->id,
            'old_status' => $oldStatus,
            'new_status' => $application->status,
            'moderator_comment' => $payload['moderator_comment'] ?? null,
        ]);

        $application->user->notify(new ApplicationStatusChangedNotification(
            $application->status,
            $application->moderator_comment,
            $application->fresh(),
        ));

        return response()->json($application->fresh('user'));
    }

    public function export(Request $request)
    {
        $this->authorize('moderate', Application::class);
        $conferenceType = $this->conferenceFromRequest($request);

        $filename = 'conference_application_' . $conferenceType . '_' . now()->format('Y-m-d-His') . '.xlsx';

        return Excel::download(new ApplicationsExport($conferenceType), $filename);
    }

    private function conferenceFromRequest(Request $request): string
    {
        return Application::normalizeConferenceType(
            $request->input('conference_type', $request->query('conference')),
        );
    }

    private function normalizeUtf8(string $value): string
    {
        if (mb_check_encoding($value, 'UTF-8')) {
            return $value;
        }

        return mb_convert_encoding($value, 'UTF-8', 'Windows-1251,CP1251,ISO-8859-1,UTF-8');
    }

    private function isApplicationSubmissionEnabled(?string $conferenceType = null): bool
    {
        return SystemSetting::getBoolean(SystemSetting::applicationSubmissionKey($conferenceType), true);
    }
}
