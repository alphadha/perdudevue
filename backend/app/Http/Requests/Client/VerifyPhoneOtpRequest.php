<?php

namespace App\Http\Requests\Client;

use Illuminate\Foundation\Http\FormRequest;

class VerifyPhoneOtpRequest extends FormRequest
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
            'code' => ['required', 'string', 'size:6'],
        ];
    }
}
