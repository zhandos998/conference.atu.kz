<?php

namespace App\Http\Controllers\Admin;

use App\Exports\ApplicationsExport;
use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\ApplicationStatusLog;
use App\Notifications\ApplicationStatusChangedNotification;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Maatwebsite\Excel\Facades\Excel;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $query = Application::query()->with('user')->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $applications = $query->paginate(20)->withQueryString();

        return view('admin.dashboard', [
            'applications' => $applications,
            'status' => (string) $request->query('status', ''),
        ]);
    }

    public function update(Request $request, Application $application)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['accepted', 'revision', 'rejected'])],
            'moderator_comment' => ['nullable', 'string'],
        ]);

        $oldStatus = $application->status;
        $application->update($data);

        ApplicationStatusLog::create([
            'application_id' => $application->id,
            'moderator_id' => $request->user()->id,
            'old_status' => $oldStatus,
            'new_status' => $application->status,
            'moderator_comment' => $data['moderator_comment'] ?? null,
        ]);

        $application->user->notify(new ApplicationStatusChangedNotification(
            $application->status,
            $application->moderator_comment,
        ));

        return back()->with('success', 'Анкета успешно обновлена.');
    }

    public function export()
    {
        $filename = 'conference_application_' . now()->format('Y-m-d-His') . '.xlsx';

        return Excel::download(new ApplicationsExport(), $filename);
    }
}
