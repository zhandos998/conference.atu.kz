<?php

namespace App\Http\Controllers\Api;

use App\Exports\ApplicationsExport;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateApplicationStatusRequest;
use App\Models\Application;
use App\Models\ApplicationStatusLog;
use App\Notifications\ApplicationStatusChangedNotification;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class ModeratorApplicationController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('moderate', Application::class);

        $query = Application::query()->with('user')->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('direction')) {
            $query->where('direction', $request->string('direction'));
        }

        return response()->json($query->paginate(20));
    }

    public function updateStatus(UpdateApplicationStatusRequest $request, Application $application)
    {
        $this->authorize('moderate', Application::class);

        $oldStatus = $application->status;
        $payload = $request->validated();

        if (isset($payload['moderator_comment']) && is_string($payload['moderator_comment'])) {
            $payload['moderator_comment'] = $this->normalizeUtf8($payload['moderator_comment']);
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
        ));

        return response()->json($application->fresh('user'));
    }

    public function export()
    {
        $this->authorize('moderate', Application::class);

        $filename = 'conference_application_' . now()->format('Y-m-d-His') . '.xlsx';

        return Excel::download(new ApplicationsExport(), $filename);
    }

    private function normalizeUtf8(string $value): string
    {
        if (mb_check_encoding($value, 'UTF-8')) {
            return $value;
        }

        return mb_convert_encoding($value, 'UTF-8', 'Windows-1251,CP1251,ISO-8859-1,UTF-8');
    }
}
