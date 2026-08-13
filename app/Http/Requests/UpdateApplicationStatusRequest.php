<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateApplicationStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('moderate', \App\Models\Application::class);
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(['accepted', 'revision', 'rejected'])],
            'moderator_comment' => ['nullable', 'string'],
        ];
    }
}
