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
        // 1. login_logs
        Schema::create('login_logs', function (Blueprint $table) {
            $table->id();
            $table->string('username', 50);
            $table->enum('status', ['success', 'failed', 'visit'])->default('visit');
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->string('browser', 100)->nullable();
            $table->string('os', 100)->nullable();
            $table->string('device', 50)->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        // 2. surveys
        Schema::create('surveys', function (Blueprint $table) {
            $table->id();
            $table->string('nama_site', 100);
            $table->date('tanggal_survey');
            $table->string('nama_surveyor', 100);
            $table->string('lokasi', 255)->nullable();
            $table->string('latitude', 20)->nullable();
            $table->string('longitude', 20)->nullable();
            $table->text('catatan_tambahan')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamp('created_at')->useCurrent();
        });

        // 3. survey_items
        Schema::create('survey_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('survey_id')->constrained('surveys')->onDelete('cascade');
            $table->string('kategori', 50);
            $table->string('nomor_item', 10);
            $table->string('nama_item', 200);
            $table->enum('status_check', ['checked', 'cross', ''])->nullable();
            $table->string('kondisi_nilai', 500)->nullable();
            $table->text('catatan')->nullable();
        });

        // 4. survey_photos
        Schema::create('survey_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('survey_id')->constrained('surveys')->onDelete('cascade');
            $table->integer('item_id')->nullable();
            $table->string('file_path', 255);
            $table->timestamp('created_at')->useCurrent();
        });

        // 5. survey_templates
        Schema::create('survey_templates', function (Blueprint $table) {
            $table->id();
            $table->string('title', 200);
            $table->longText('kategori_json');
            $table->integer('created_by');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
        });

        // 6. atp_records
        Schema::create('atp_records', function (Blueprint $table) {
            $table->id();
            $table->string('nama_site', 100);
            $table->date('tanggal');
            $table->string('region', 100)->nullable();
            $table->string('latitude', 20)->nullable();
            $table->string('longitude', 20)->nullable();
            $table->string('no_po', 100)->nullable();
            $table->longText('hasil_json')->nullable();
            $table->string('verdict', 30)->nullable();
            $table->text('verdict_notes')->nullable();
            $table->text('approval_json')->nullable();
            $table->text('bastp_json')->nullable();
            $table->integer('created_by');
            $table->timestamp('created_at')->useCurrent();
        });

        // 7. atp_photos
        Schema::create('atp_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('atp_id')->constrained('atp_records')->onDelete('cascade');
            $table->string('item_id', 20)->nullable();
            $table->string('file_path', 255);
            $table->timestamp('created_at')->useCurrent();
        });

        // 8. atp_templates
        Schema::create('atp_templates', function (Blueprint $table) {
            $table->id();
            $table->string('title', 200);
            $table->longText('data_json');
            $table->integer('created_by');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
        });

        // 9. bal_data
        Schema::create('bal_data', function (Blueprint $table) {
            $table->id();
            $table->foreignId('atp_id')->unique()->constrained('atp_records')->onDelete('cascade');
            $table->string('project', 200)->nullable();
            $table->string('no_po', 200)->nullable();
            $table->date('tanggal_mulai')->nullable();
            $table->date('tanggal')->nullable();
            $table->string('pelaksana', 200)->nullable();
            $table->string('lokasi', 255)->nullable();
            $table->string('hasil', 50)->default('DITERIMA');
            $table->string('pihak1', 200)->default('PT. Integrasi Jaringan Ekosistem');
            $table->string('pihak2', 200)->nullable();
            $table->string('nama1', 200)->nullable();
            $table->string('jabatan1', 200)->nullable();
            $table->string('nama2', 200)->nullable();
            $table->string('jabatan2', 200)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
        });

        // 10. bastp_data
        Schema::create('bastp_data', function (Blueprint $table) {
            $table->id();
            $table->foreignId('atp_id')->unique()->constrained('atp_records')->onDelete('cascade');
            $table->string('p1_nama', 200)->nullable();
            $table->string('p1_alamat', 200)->nullable();
            $table->string('p2_nama', 200)->nullable();
            $table->string('p2_jabatan', 200)->nullable();
            $table->string('p2_alamat', 200)->nullable();
            $table->text('pekerjaan')->nullable();
            $table->string('mengetahui1', 200)->nullable();
            $table->string('mengetahui2', 200)->nullable();
            $table->text('photos')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
        });

        // 11. gudang_barang
        Schema::create('gudang_barang', function (Blueprint $table) {
            $table->id();
            $table->string('nama', 100);
            $table->string('kategori', 50);
            $table->string('tipe', 100)->nullable();
            $table->integer('stok')->default(0);
            $table->string('satuan', 20)->default('Unit');
            $table->integer('min_stok')->default(0);
            $table->timestamp('created_at')->useCurrent();
        });

        // 12. gudang_masuk
        Schema::create('gudang_masuk', function (Blueprint $table) {
            $table->id();
            $table->string('no_form', 30)->unique();
            $table->string('judul', 200)->nullable();
            $table->string('kategori', 50)->nullable();
            $table->date('tanggal');
            $table->string('supplier', 200)->nullable();
            $table->string('penerima', 100)->nullable();
            $table->string('lokasi', 200)->nullable();
            $table->text('keterangan')->nullable();
            $table->string('foto', 500)->nullable();
            $table->string('diserahkan', 100)->nullable();
            $table->string('diterima', 100)->nullable();
            $table->integer('created_by')->default(0);
            $table->timestamp('created_at')->useCurrent();
        });

        // 13. gudang_masuk_detail
        Schema::create('gudang_masuk_detail', function (Blueprint $table) {
            $table->id();
            $table->integer('masuk_id')->index();
            $table->integer('barang_id')->index();
            $table->string('nama_barang', 100);
            $table->string('tipe_barang', 100)->nullable();
            $table->integer('jumlah');
            $table->string('satuan', 20)->default('Unit');
        });

        // 14. gudang_keluar
        Schema::create('gudang_keluar', function (Blueprint $table) {
            $table->id();
            $table->string('no_form', 30)->unique();
            $table->string('judul', 200)->nullable();
            $table->string('kategori', 50)->nullable();
            $table->date('tanggal');
            $table->string('pengambil', 100)->nullable();
            $table->string('jabatan', 100)->nullable();
            $table->string('lokasi_tujuan', 200)->nullable();
            $table->text('keperluan')->nullable();
            $table->string('proyek', 200)->nullable();
            $table->text('tujuan')->nullable();
            $table->text('keterangan')->nullable();
            $table->string('foto', 500)->nullable();
            $table->string('disetujui', 100)->nullable();
            $table->string('pengambil_ttd', 100)->nullable();
            $table->integer('created_by')->default(0);
            $table->timestamp('created_at')->useCurrent();
        });

        // 15. gudang_keluar_detail
        Schema::create('gudang_keluar_detail', function (Blueprint $table) {
            $table->id();
            $table->integer('keluar_id')->index();
            $table->integer('barang_id')->index();
            $table->string('nama_barang', 100);
            $table->string('tipe_barang', 100)->nullable();
            $table->integer('jumlah');
            $table->string('satuan', 20)->default('Unit');
        });

        // 16. instruction_images
        Schema::create('instruction_images', function (Blueprint $table) {
            $table->id();
            $table->string('kategori', 100);
            $table->string('file_path', 255);
            $table->timestamp('created_at')->useCurrent();
            $table->integer('created_by')->nullable();
        });

        // 17. instruction_tables
        Schema::create('instruction_tables', function (Blueprint $table) {
            $table->id();
            $table->string('kategori', 100);
            $table->enum('tipe', ['spesifikasi', 'sow']);
            $table->longText('data_json');
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->integer('updated_by')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('instruction_tables');
        Schema::dropIfExists('instruction_images');
        Schema::dropIfExists('gudang_keluar_detail');
        Schema::dropIfExists('gudang_keluar');
        Schema::dropIfExists('gudang_masuk_detail');
        Schema::dropIfExists('gudang_masuk');
        Schema::dropIfExists('gudang_barang');
        Schema::dropIfExists('bastp_data');
        Schema::dropIfExists('bal_data');
        Schema::dropIfExists('atp_templates');
        Schema::dropIfExists('atp_photos');
        Schema::dropIfExists('atp_records');
        Schema::dropIfExists('survey_templates');
        Schema::dropIfExists('survey_photos');
        Schema::dropIfExists('survey_items');
        Schema::dropIfExists('surveys');
        Schema::dropIfExists('login_logs');
    }
};
