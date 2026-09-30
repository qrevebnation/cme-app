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
        Schema::table('gudang_barang', function (Blueprint $table) {
            if (!Schema::hasColumn('gudang_barang', 'merek')) {
                $table->string('merek', 100)->nullable()->after('tipe');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('gudang_barang', function (Blueprint $table) {
            if (Schema::hasColumn('gudang_barang', 'merek')) {
                $table->dropColumn('merek');
            }
        });
    }
};
