<?php

namespace App\Http\Requests\Client;

use Illuminate\Foundation\Http\FormRequest;

class UpdateConsentsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role->value === 'client' && $this->user()?->clientProfile !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'consent_email' => ['required', 'boolean'],
            'consent_sms' => ['required', 'boolean'],
        ];
    }
}
