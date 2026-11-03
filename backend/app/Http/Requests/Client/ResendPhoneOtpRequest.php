<?php

namespace App\Http\Requests\Client;

use Illuminate\Foundation\Http\FormRequest;

class ResendPhoneOtpRequest extends FormRequest
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
