<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tabel baru: jejak aksi tulis pengguna (login_logs tetap tidak diubah).
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->string('username', 50);
            $table->string('role', 20)->nullable();
            $table->string('aksi', 20);        // tambah|ubah|hapus|cetak|masuk|keluar
            $table->string('modul', 40);       // ATP|Survey|Inventory|Tools|Permintaan Barang|Template ATP|Template Survey|Instruksi|Pengguna|Profil
            $table->string('ref_id', 40)->nullable();
            $table->string('keterangan', 255)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
