<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pair_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pair_id')->constrained()->cascadeOnDelete();
            $table->string('type', 64);
            $table->json('payload')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pair_events');
    }
};
