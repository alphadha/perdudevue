<?php

namespace App\Http\Requests\Opticien;

use Illuminate\Foundation\Http\FormRequest;

class PickupCodeRequest extends FormRequest
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
            'pickup_code' => ['required', 'string', 'min:4', 'max:16'],
        ];
    }
}
