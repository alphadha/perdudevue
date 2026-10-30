<?php

namespace App\Models;

use App\Enums\Role;
use Database\Factories\UserFactory;
use Filament\Models\Contracts\FilamentUser;
use Filament\Models\Contracts\HasName;
use Filament\Panel;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable implements FilamentUser, HasName
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected static function booted(): void
    {
        static::creating(function (User $user): void {
            $user->uuid ??= (string) Str::uuid();
        });
    }

    protected function casts(): array
    {
        return [
            'role' => Role::class,
            'email_verified_at' => 'datetime',
            'cgu_accepted_at' => 'datetime',
            'password_set_at' => 'datetime',
            'blocked_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function hasPassword(): bool
    {
        return filled($this->password) && $this->password_set_at !== null;
    }

    public function opticians(): BelongsToMany
    {
        return $this->belongsToMany(Optician::class)->withTimestamps();
    }

    public function clientProfile(): HasOne
    {
        return $this->hasOne(Client::class);
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(Invitation::class);
    }

    public function primaryOptician(): ?Optician
    {
        return $this->opticians()->first();
    }

    public function isBlocked(): bool
    {
        return $this->blocked_at !== null;
    }

    public function block(): void
    {
        $this->forceFill(['blocked_at' => now()])->save();
        $this->tokens()->delete();
    }

    public function unblock(): void
    {
        $this->forceFill(['blocked_at' => null])->save();
    }

    public function canAccessPanel(Panel $panel): bool
    {
        return $this->role === Role::AdminPdv && $this->hasPassword() && ! $this->isBlocked();
    }

    public function getFilamentName(): string
    {
        return trim($this->first_name.' '.$this->last_name);
    }
}
