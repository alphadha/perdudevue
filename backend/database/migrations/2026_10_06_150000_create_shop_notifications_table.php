<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shop_notifications', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('optician_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pair_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 64);
            $table->string('title');
            $table->text('body');
            $table->string('href')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['optician_id', 'read_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shop_notifications');
    }
};
