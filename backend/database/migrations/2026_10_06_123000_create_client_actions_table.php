<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_actions', function (Blueprint $table) {
            $table->id();
            $table->string('token_hash', 64)->unique();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->foreignId('optician_id')->constrained()->cascadeOnDelete();
            $table->string('type', 32);
            $table->json('payload')->nullable();
            $table->string('otp_hash')->nullable();
            $table->string('otp_channel', 16)->nullable();
            $table->unsignedTinyInteger('otp_attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('consumed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_actions');
    }
};
