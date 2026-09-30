<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Tabel baru: kebutuhan migrasi site (busbar / geser rack / tambah perangkat / tambah daya).
        Schema::create('kebutuhan_migrasi', function (Blueprint $table) {
            $table->id();
            $table->string('site', 200);
            $table->string('jenis', 30); // busbar|geser_rack|tambah_perangkat|tambah_daya
            $table->text('detail')->nullable();
            $table->integer('qty')->default(1);
            $table->string('satuan', 20)->default('Unit');
            $table->string('status', 20)->default('diajukan'); // diajukan|disetujui|selesai
            $table->integer('created_by')->default(0)->index();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kebutuhan_migrasi');
    }
};
