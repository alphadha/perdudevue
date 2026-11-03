<?php

namespace App\Http\Requests\Opticien;

use Illuminate\Foundation\Http\FormRequest;

class ResendEmailOtpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'action_token' => ['required', 'string'],
        ];
    }
}
