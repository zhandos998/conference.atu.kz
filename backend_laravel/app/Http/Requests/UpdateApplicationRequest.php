<?php

namespace App\Http\Requests;

use App\Models\Application;
use Illuminate\Foundation\Http\FormRequest;

class UpdateApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        $application = $this->route('application');

        return $application instanceof Application && $this->user()->can('update', $application);
    }

    public function rules(): array
    {
        return [
            'full_name' => ['required', 'string', 'max:255'],
            'organization_position' => ['required', 'string', 'max:255'],
            'academic_degree' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'email' => ['required', 'email', 'max:255'],
            'supervisor_full_name' => ['required', 'string', 'max:255'],
            'supervisor_organization_position' => ['required', 'string', 'max:255'],
            'supervisor_academic_degree' => ['required', 'string', 'max:255'],
            'report_title' => ['required', 'string', 'max:255'],
            'direction' => ['required', 'string', 'max:255'],
            'participation_form' => ['required', 'string', 'max:255'],
            'hotel_booking_needed' => ['required', 'boolean'],
            'file' => ['nullable', 'file', 'mimes:pdf,doc,docx', 'max:10240'],
        ];
    }
}
