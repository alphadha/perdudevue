<?php

namespace App\Http\Requests\Opticien;

use App\Support\AssignedCode;
use Illuminate\Foundation\Http\FormRequest;

class AssignedCodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('reportFound', \App\Models\Pair::class) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'assigned_code' => ['required', 'string', 'size:'.AssignedCode::LENGTH, 'regex:'.AssignedCode::PATTERN],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'assigned_code.regex' => 'Le code assigné doit être au format FR suivi de 4 chiffres et 2 lettres (ex. '.AssignedCode::EXAMPLE.').',
            'assigned_code.size' => 'Le code assigné doit être au format FR suivi de 4 chiffres et 2 lettres (ex. '.AssignedCode::EXAMPLE.').',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'assigned_code' => AssignedCode::normalize((string) $this->input('assigned_code')),
        ]);
    }
}
