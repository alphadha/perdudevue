<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('opticians', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('name');
            $table->string('siret', 14)->nullable();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('postal_code', 16)->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->timestamps();
        });

        Schema::create('optician_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('optician_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['optician_id', 'user_id']);
        });

        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->boolean('consent_email')->default(false);
            $table->boolean('consent_sms')->default(false);
            $table->timestamps();
        });

        Schema::create('optician_client', function (Blueprint $table) {
            $table->id();
            $table->foreignId('optician_id')->constrained()->cascadeOnDelete();
            $table->foreignId('client_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['optician_id', 'client_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('optician_client');
        Schema::dropIfExists('clients');
        Schema::dropIfExists('optician_user');
        Schema::dropIfExists('opticians');
    }
};
