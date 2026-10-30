<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pairs', function (Blueprint $table) {
            $table->string('restitution_ref', 32)->nullable()->unique()->after('pickup_code');
            $table->timestamp('found_at')->nullable()->after('restitution_ref');
        });
    }

    public function down(): void
    {
        Schema::table('pairs', function (Blueprint $table) {
            $table->dropColumn(['restitution_ref', 'found_at']);
        });
    }
};
