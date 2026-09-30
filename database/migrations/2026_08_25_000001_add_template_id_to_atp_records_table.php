<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('atp_records', function (Blueprint $table) {
            if (!Schema::hasColumn('atp_records', 'template_id')) {
                $table->foreignId('template_id')->nullable()->after('id')->constrained('atp_templates')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('atp_records', function (Blueprint $table) {
            if (Schema::hasColumn('atp_records', 'template_id')) {
                $table->dropForeign(['template_id']);
                $table->dropColumn('template_id');
            }
        });
    }
};
