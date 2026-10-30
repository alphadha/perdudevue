<?php

namespace Database\Factories;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected static ?string $password;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => '0600000000',
            'role' => Role::Client,
            'email_verified_at' => now(),
            'password' => 'Password1',
            'password_set_at' => now(),
            'cgu_accepted_at' => now(),
            'remember_token' => Str::random(10),
        ];
    }

    public function pendingInvitation(): static
    {
        return $this->state(fn (array $attributes) => [
            'password' => null,
            'password_set_at' => null,
            'cgu_accepted_at' => null,
            'email_verified_at' => null,
        ]);
    }

    public function opticienAdmin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => Role::OpticienAdmin,
        ]);
    }

    public function opticienUser(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => Role::OpticienUser,
        ]);
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => Role::AdminPdv,
        ]);
    }
}
