<?php

namespace App\Models;

use App\Services\AuditService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    protected $fillable = [
        'user_id',
        'actor_label',
        'optician_id',
        'action',
        'summary',
        'ip_address',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function optician(): BelongsTo
    {
        return $this->belongsTo(Optician::class);
    }

    public function scopeActivities(Builder $query): Builder
    {
        return $query->whereNotIn('action', AuditService::AUTH_ACTIONS);
    }

    public function scopeAuthEvents(Builder $query): Builder
    {
        return $query->whereIn('action', AuditService::AUTH_ACTIONS);
    }

    public function isAuthEvent(): bool
    {
        return in_array($this->action, AuditService::AUTH_ACTIONS, true);
    }

    public function readableSummary(): string
    {
        return $this->summary ?: ($this->actor_label ?: '—').' — '.$this->action;
    }
}
