<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->string('carrier_shipment_number')->nullable()->after('tracking_ref');
            $table->string('label_url', 2048)->nullable()->after('carrier_shipment_number');
            $table->mediumText('label_pdf')->nullable()->after('label_url');
        });
    }

    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropColumn(['carrier_shipment_number', 'label_url', 'label_pdf']);
        });
    }
};
