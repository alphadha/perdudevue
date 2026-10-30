<?php

namespace App\Http\Requests\Opticien;

use App\Support\AssignedCode;
use App\Support\PairCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePairRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', \App\Models\Pair::class) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'client_uuid' => ['required', 'uuid'],
            'type' => ['required', 'string', Rule::in(PairCatalog::types())],
            'brand' => ['required', 'string', 'max:100'],
            'custom_brand' => ['nullable', 'required_if:brand,'.PairCatalog::OTHER_BRAND, 'string', 'max:100'],
            'colors' => ['required', 'array', 'min:1'],
            'colors.*' => ['required', 'string', Rule::in(PairCatalog::colors())],
            'description' => ['nullable', 'string', 'max:255'],
            'already_engraved' => ['required', 'boolean'],
            'assigned_code' => ['nullable', 'required_if:already_engraved,true', 'string', 'size:'.AssignedCode::LENGTH, 'regex:'.AssignedCode::PATTERN],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->exists('assigned_code')) {
            $this->merge([
                'assigned_code' => AssignedCode::normalize((string) $this->input('assigned_code')),
            ]);
        }
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'assigned_code.required_if' => 'Saisissez le code unique déjà gravé.',
            'assigned_code.regex' => 'Le code assigné doit être au format FR suivi de 4 chiffres et 2 lettres (ex. '.AssignedCode::EXAMPLE.').',
            'assigned_code.size' => 'Le code assigné doit être au format FR suivi de 4 chiffres et 2 lettres (ex. '.AssignedCode::EXAMPLE.').',
            'custom_brand.required_if' => 'Saisissez le nom de la marque.',
        ];
    }
}
