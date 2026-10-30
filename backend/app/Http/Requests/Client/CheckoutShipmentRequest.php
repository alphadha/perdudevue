<?php

namespace App\Http\Requests\Client;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CheckoutShipmentRequest extends FormRequest
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
        $home = $this->input('mode') === 'home';

        return [
            'mode' => ['required', 'string', Rule::in(['home', 'relay'])],
            'consent_address' => ['required', 'accepted'],
            'recipient_first_name' => ['required', 'string', 'max:80'],
            'recipient_last_name' => ['required', 'string', 'max:80'],
            'address_line' => [$home ? 'required' : 'nullable', 'string', 'max:180'],
            'postal_code' => [$home ? 'required' : 'nullable', 'string', 'max:16'],
            'city' => [$home ? 'required' : 'nullable', 'string', 'max:80'],
            'relay_id' => [$this->input('mode') === 'relay' ? 'required' : 'nullable', 'string'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'consent_address.accepted' => 'Le consentement à l’usage de l’adresse pour l’expédition est obligatoire.',
        ];
    }
}
