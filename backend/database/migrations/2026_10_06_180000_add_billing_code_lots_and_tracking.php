<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('networks', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('name');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('network_tariffs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('network_id')->constrained()->cascadeOnDelete();
            $table->string('label');
            $table->string('unit', 32)->default('per_pair');
            $table->unsignedInteger('amount_cents');
            $table->string('currency', 3)->default('EUR');
            $table->date('valid_from')->nullable();
            $table->date('valid_to')->nullable();
            $table->timestamps();
        });

        Schema::table('opticians', function (Blueprint $table) {
            $table->foreignId('network_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->string('billing_email')->nullable()->after('email');
            $table->string('billing_iban', 34)->nullable()->after('billing_email');
            $table->string('qonto_id')->nullable()->after('billing_iban');
        });

        Schema::table('shipments', function (Blueprint $table) {
            $table->string('tracking_ref')->nullable()->after('label_ref');
        });

        Schema::create('code_lots', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('name');
            $table->unsignedInteger('quantity');
            $table->string('status', 16)->default('generated');
            $table->timestamp('exported_at')->nullable();
            $table->timestamps();
        });

        Schema::create('code_lot_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('code_lot_id')->constrained()->cascadeOnDelete();
            $table->string('code', 8)->unique();
            $table->string('status', 16)->default('available');
            $table->foreignId('pair_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('qonto_sync_logs', function (Blueprint $table) {
            $table->id();
            $table->string('status', 16);
            $table->string('message')->nullable();
            $table->timestamp('ran_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qonto_sync_logs');
        Schema::dropIfExists('code_lot_items');
        Schema::dropIfExists('code_lots');
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropColumn('tracking_ref');
        });
        Schema::table('opticians', function (Blueprint $table) {
            $table->dropConstrainedForeignId('network_id');
            $table->dropColumn(['billing_email', 'billing_iban', 'qonto_id']);
        });
        Schema::dropIfExists('network_tariffs');
        Schema::dropIfExists('networks');
    }
};
