<?php

namespace App\Http\Requests\Opticien;

use App\Models\Pair;
use App\Support\PairCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePairRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Pair::class) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', 'string', Rule::in(PairCatalog::types())],
            'brand' => ['required', 'string', 'max:100'],
            'custom_brand' => ['nullable', 'required_if:brand,'.PairCatalog::OTHER_BRAND, 'string', 'max:100'],
            'colors' => ['required', 'array', 'min:1'],
            'colors.*' => ['required', 'string', Rule::in(PairCatalog::colors())],
            'description' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'custom_brand.required_if' => 'Saisissez le nom de la marque.',
        ];
    }
}
