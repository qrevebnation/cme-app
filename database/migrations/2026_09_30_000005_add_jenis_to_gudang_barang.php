<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('gudang_barang', function (Blueprint $table) {
            if (!Schema::hasColumn('gudang_barang', 'jenis')) {
                $table->string('jenis', 20)->nullable()->after('satuan');
            }
        });

        // Isi otomatis baris lama: NULL dianggap consumable.
        // Alasan: index GudangController menampilkan NULL di tab Consumables
        // (orWhereNull), jadi backfill ini menyamakan data lama dengan perilaku
        // baca tersebut dan menjaga filter tab tetap konsisten.
        DB::table('gudang_barang')->whereNull('jenis')->update(['jenis' => 'consumable']);
    }

    public function down(): void
    {
        Schema::table('gudang_barang', function (Blueprint $table) {
            if (Schema::hasColumn('gudang_barang', 'jenis')) {
                $table->dropColumn('jenis');
            }
        });
    }
};
