<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipments', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('pair_id')->constrained()->cascadeOnDelete();
            $table->string('status', 32);
            $table->string('mode', 16);
            $table->string('carrier')->nullable();
            $table->unsignedInteger('price_cents');
            $table->string('recipient_first_name');
            $table->string('recipient_last_name');
            $table->string('address_line');
            $table->string('postal_code', 16);
            $table->string('city');
            $table->string('relay_id')->nullable();
            $table->string('relay_name')->nullable();
            $table->timestamp('consent_address_at');
            $table->string('payment_ref')->nullable();
            $table->string('label_ref')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('shipped_at')->nullable();
            $table->timestamps();
            $table->index(['pair_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipments');
    }
};
