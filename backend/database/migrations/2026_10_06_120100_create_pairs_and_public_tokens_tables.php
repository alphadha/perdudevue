<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pairs', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->foreignId('origin_optician_id')->constrained('opticians');
            $table->foreignId('depositary_optician_id')->nullable()->constrained('opticians');
            $table->string('assigned_code', 16)->unique();
            $table->string('pickup_code', 16)->nullable();
            $table->string('status', 32);
            $table->string('type', 32)->nullable();
            $table->string('brand')->nullable();
            $table->json('colors')->nullable();
            $table->string('description')->nullable();
            $table->timestamp('registered_at')->nullable();
            $table->timestamps();
        });

        Schema::create('public_restitution_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pair_id')->constrained()->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('public_restitution_tokens');
        Schema::dropIfExists('pairs');
    }
};
