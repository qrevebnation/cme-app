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
        Schema::table('survey_items', function (Blueprint $table) {
            if (!Schema::hasColumn('survey_items', 'sub_kategori')) {
                $table->string('sub_kategori', 150)->nullable()->after('kategori');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('survey_items', function (Blueprint $table) {
            if (Schema::hasColumn('survey_items', 'sub_kategori')) {
                $table->dropColumn('sub_kategori');
            }
        });
    }
};
