<?php

namespace App\Support;

class PasswordRules
{
    /**
     * @return list<string>
     */
    public static function rules(): array
    {
        return [
            'required',
            'string',
            'min:8',
            'regex:/[A-Z]/',
            'regex:/[0-9]/',
            'confirmed',
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function messages(): array
    {
        return [
            'password.min' => '8 caractères minimum.',
            'password.regex' => 'Le mot de passe doit contenir au moins une majuscule et un chiffre.',
            'password.confirmed' => 'La confirmation du mot de passe ne correspond pas.',
        ];
    }
}
