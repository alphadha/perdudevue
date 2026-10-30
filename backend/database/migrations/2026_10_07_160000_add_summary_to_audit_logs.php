<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->string('summary', 500)->nullable()->after('action');
            $table->string('actor_label', 255)->nullable()->after('user_id');
            $table->foreignId('optician_id')->nullable()->after('actor_label')->constrained()->nullOnDelete();
            $table->index(['action', 'created_at']);
            $table->index('ip_address');
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex(['action', 'created_at']);
            $table->dropIndex(['ip_address']);
            $table->dropConstrainedForeignId('optician_id');
            $table->dropColumn(['summary', 'actor_label']);
        });
    }
};
