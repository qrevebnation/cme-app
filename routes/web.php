<?php

use App\Http\Controllers\AtpController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EksporBridgeController;
use App\Http\Controllers\GudangController;
use App\Http\Controllers\InstructionController;
use App\Http\Controllers\LoginController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\SurveyController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PrintBridgeController;
use App\Http\Controllers\SurveyTemplateController;
use App\Http\Controllers\MaterialRequestController;
use App\Http\Controllers\ToolLoanController;
use App\Http\Controllers\TemplateController;
use App\Http\Controllers\CalendarController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\MigrasiController;
use Illuminate\Support\Facades\Route;

// Guest Authentication Routes
Route::get('/', [LoginController::class, 'showLoginForm'])->name('login');
Route::post('/login', [LoginController::class, 'login']);
Route::post('/logout', [LoginController::class, 'logout'])->name('logout');

// Authenticated Routes (Session-protected via CustomAuthMiddleware, role-gated per module)
Route::middleware('custom_auth')->group(function () {
    // Dokumen cetak: dilayani aplikasi lama apa adanya supaya hasil cetak/PDF
    // identik dengan dokumen resmi (lihat PrintBridgeController).
    Route::get('/print/{dokumen}', [PrintBridgeController::class, 'show']);
    Route::get('/berkas-ttd/{nama}', [PrintBridgeController::class, 'tandaTangan'])
        ->where('nama', '[A-Za-z0-9._-]+');

    // Dashboard CME: Admin, Project Manager, Viewer (baca). Technician mendarat di /survey.
    Route::middleware('role:admin,project_manager,viewer')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'cmeDashboard']);
    });

    // Modul pengelolaan: Admin penuh, Project Manager kelola operasional.
    Route::middleware('role:admin,project_manager')->group(function () {

        // Warehouse Inventory Module
        Route::get('/gudang', [GudangController::class, 'index']);
        Route::post('/gudang/kategori', [GudangController::class, 'storeKategori']);
        Route::post('/gudang/tipe', [GudangController::class, 'storeTipe']);
        Route::post('/gudang/masuk', [GudangController::class, 'storeMasuk']);
        Route::post('/gudang/keluar', [GudangController::class, 'storeKeluar']);
        Route::get('/gudang/history', [GudangController::class, 'history']);
        Route::get('/gudang/masuk-history/{id}', [GudangController::class, 'masukDetail']);
        Route::get('/gudang/keluar-history/{id}', [GudangController::class, 'keluarDetail']);

        // Perbaikan transaksi gudang: Admin & Project Manager.
        Route::get('/gudang/masuk/{id}/edit', [GudangController::class, 'editMasuk']);
        Route::post('/gudang/masuk/{id}/edit', [GudangController::class, 'updateMasuk']);
        Route::delete('/gudang/masuk/{id}', [GudangController::class, 'deleteMasuk']);
        Route::get('/gudang/keluar/{id}/edit', [GudangController::class, 'editKeluar']);
        Route::post('/gudang/keluar/{id}/edit', [GudangController::class, 'updateKeluar']);
        Route::delete('/gudang/keluar/{id}', [GudangController::class, 'deleteKeluar']);

        // Ekspor rekap dari halaman lama: isi diteruskan apa adanya (lihat EksporBridgeController).
        Route::get('/ekspor/gudang-masuk', [EksporBridgeController::class, 'gudangMasuk']);
        Route::get('/ekspor/gudang-keluar', [EksporBridgeController::class, 'gudangKeluar']);
        Route::get('/ekspor/material-request', [EksporBridgeController::class, 'materialRequest']);

        // Template Builder Domain Module
        Route::get('/template', [TemplateController::class, 'index']);
        Route::get('/template/baru', [TemplateController::class, 'create']);
        Route::post('/template/baru', [TemplateController::class, 'store']);
        Route::get('/template/{id}/edit', [TemplateController::class, 'edit']);
        Route::post('/template/{id}/edit', [TemplateController::class, 'update']);
        Route::delete('/template/{id}', [TemplateController::class, 'delete']);

        // Survey Checklist Template Module
        Route::get('/survey-template', [SurveyTemplateController::class, 'index']);
        Route::get('/survey-template/baru', [SurveyTemplateController::class, 'create']);
        Route::post('/survey-template/baru', [SurveyTemplateController::class, 'store']);
        Route::get('/survey-template/{id}/edit', [SurveyTemplateController::class, 'edit']);
        Route::post('/survey-template/{id}/edit', [SurveyTemplateController::class, 'update']);
        Route::delete('/survey-template/{id}', [SurveyTemplateController::class, 'delete']);

        // Material Request Module
        Route::get('/material-request', [MaterialRequestController::class, 'index']);
        Route::get('/material-request/baru', [MaterialRequestController::class, 'create']);
        Route::post('/material-request/baru', [MaterialRequestController::class, 'store']);
        Route::get('/material-request/{id}', [MaterialRequestController::class, 'show']);
        Route::get('/material-request/{id}/edit', [MaterialRequestController::class, 'edit']);
        Route::post('/material-request/{id}/edit', [MaterialRequestController::class, 'update']);
        Route::delete('/material-request/{id}', [MaterialRequestController::class, 'delete']);

        // Tool Loan Module
        Route::get('/tools', [ToolLoanController::class, 'index']);
        Route::get('/tools/baru', [ToolLoanController::class, 'create']);
        Route::post('/tools/baru', [ToolLoanController::class, 'store']);
        Route::get('/tools/{id}', [ToolLoanController::class, 'show']);
        Route::post('/tools/{id}/kembali', [ToolLoanController::class, 'kembalikan']);
        Route::delete('/tools/{id}', [ToolLoanController::class, 'delete']);

        // Kalender jadwal: survey ODC, tenggat peminjaman alat, dan periode ATP
        Route::get('/kalender', [CalendarController::class, 'index']);

        // Panduan Teknis (SOW): aksi tulis. Halaman baca dibuka untuk semua yang login.
        Route::get('/instruction/baru', [InstructionController::class, 'create']);
        Route::post('/instruction/baru', [InstructionController::class, 'store']);
        Route::get('/instruction/{id}/edit', [InstructionController::class, 'edit']);
        Route::post('/instruction/{id}/edit', [InstructionController::class, 'update']);
        Route::delete('/instruction/{id}', [InstructionController::class, 'delete']);

        // Kelola Pengguna: hanya admin.
        Route::middleware('role:admin')->group(function () {
            Route::get('/users', [UserController::class, 'index']);
            Route::post('/users', [UserController::class, 'store']);
            Route::post('/users/{id}', [UserController::class, 'update']);
            Route::delete('/users/{id}', [UserController::class, 'delete']);
        });

        // Log Aktivitas: Admin & Project Manager.
        Route::get('/users-logs', [UserController::class, 'logs']);

        // Impor CSV barang: Admin & Project Manager (baca template bebas, tulis di sini).
        Route::post('/gudang/impor', [GudangController::class, 'impor']);

        // Modul Proyek: daftar + CRUD + tugas + berkas + anggota.
        Route::get('/proyek', [ProjectController::class, 'index']);
        Route::get('/proyek/baru', [ProjectController::class, 'create']);
        Route::post('/proyek/baru', [ProjectController::class, 'store']);
        Route::get('/proyek/{id}', [ProjectController::class, 'show'])->whereNumber('id');
        Route::get('/proyek/{id}/edit', [ProjectController::class, 'edit'])->whereNumber('id');
        Route::post('/proyek/{id}/edit', [ProjectController::class, 'update'])->whereNumber('id');
        Route::delete('/proyek/{id}', [ProjectController::class, 'destroy'])->whereNumber('id');
        Route::post('/proyek/{id}/brief', [ProjectController::class, 'updateBrief'])->whereNumber('id');
        Route::post('/proyek/{id}/anggota', [ProjectController::class, 'syncMembers'])->whereNumber('id');
        Route::post('/proyek/{id}/tugas', [ProjectController::class, 'storeTask'])->whereNumber('id');
        Route::patch('/proyek/{id}/tugas/{taskId}', [ProjectController::class, 'updateTask']);
        Route::delete('/proyek/{id}/tugas/{taskId}', [ProjectController::class, 'destroyTask']);
        Route::post('/proyek/{id}/berkas', [ProjectController::class, 'storeFile'])->whereNumber('id');
        Route::delete('/proyek/{id}/berkas/{fileId}', [ProjectController::class, 'destroyFile']);

        // Pendataan kebutuhan migrasi site.
        Route::get('/migrasi', [MigrasiController::class, 'index']);
        Route::get('/migrasi/baru', [MigrasiController::class, 'create']);
        Route::post('/migrasi/baru', [MigrasiController::class, 'store']);
        Route::get('/migrasi/{id}/edit', [MigrasiController::class, 'edit'])->whereNumber('id');
        Route::post('/migrasi/{id}/edit', [MigrasiController::class, 'update'])->whereNumber('id');
        Route::delete('/migrasi/{id}', [MigrasiController::class, 'delete'])->whereNumber('id');
    });

    // ATP Dashboard: Admin, Project Manager, Technician.
    Route::middleware('role:admin,project_manager,technician')->group(function () {
        Route::get('/atp', [DashboardController::class, 'atpDashboard']);
    });

    // Unggah sementara & jejak ekspor: seluruh peran sah (Viewer baca saja dijaga controller).
    Route::middleware('role:admin,project_manager,technician,viewer')->group(function () {
        Route::post('/api/upload-temp', [App\Http\Controllers\MediaController::class, 'uploadTemp']);
        Route::post('/api/upload-temp-doc', [App\Http\Controllers\MediaController::class, 'uploadTempDoc']);

        // Kesehatan jembatan cetak: dipakai penanda di footer (baca saja).
        Route::get('/cetak/status', [PrintBridgeController::class, 'status']);

        // Ekspor CSV dibuat di peramban; jejaknya dicatat lewat rute ini.
        Route::post('/aktivitas/ekspor', [UserController::class, 'catatEkspor']);

        // Ekspor dokumen survey & ATP (semua peran sah, batas kepemilikan dicek di controller).
        Route::get('/ekspor/survey', [EksporBridgeController::class, 'survey']);
        Route::get('/ekspor/atp', [EksporBridgeController::class, 'atp']);

        // Hapus foto tersimpan (survey, ATP, transaksi gudang).
        Route::post('/foto/hapus', [App\Http\Controllers\MediaController::class, 'hapusFoto']);
    });

    // ODC Survey Module. Batas tulis per baris (kepemilikan) dijaga controller.
    Route::get('/survey', [DashboardController::class, 'surveyDashboard']);
    Route::get('/survey/baru', [SurveyController::class, 'create']);
    Route::post('/survey/baru', [SurveyController::class, 'store']);
    Route::get('/survey/{id}', [SurveyController::class, 'detail'])->whereNumber('id');
    Route::get('/survey/{id}/edit', [SurveyController::class, 'edit']);
    Route::post('/survey/{id}/edit', [SurveyController::class, 'update']);
    Route::delete('/survey/{id}', [SurveyController::class, 'delete']);
    Route::get('/survey/{id}/print', [SurveyController::class, 'print']);

    // ATP Module. Batas tulis per baris (kepemilikan) dijaga controller.
    Route::get('/atp/baru', [AtpController::class, 'create']);
    Route::post('/atp/baru', [AtpController::class, 'store']);

    // Papan status ATP (kanban). Didaftarkan sebelum /atp/{id} agar "papan" tidak dibaca sebagai id.
    Route::get('/atp/papan', [AtpController::class, 'board']);

    Route::get('/atp/{id}', [AtpController::class, 'detail'])->whereNumber('id');
    Route::get('/atp/{id}/edit', [AtpController::class, 'edit']);
    Route::post('/atp/{id}/edit', [AtpController::class, 'update']);
    Route::delete('/atp/{id}', [AtpController::class, 'delete']);
    Route::get('/atp/{id}/print', [AtpController::class, 'print']);

    // BAL and BASTP print pages
    Route::get('/atp/{id}/bal', [AtpController::class, 'printBal']);
    Route::post('/atp/{id}/bal', [AtpController::class, 'saveBal']);
    Route::delete('/atp/{id}/bal', [AtpController::class, 'deleteBal']);
    Route::get('/atp/{id}/bastp', [AtpController::class, 'printBastp']);
    Route::post('/atp/{id}/bastp', [AtpController::class, 'saveBastp']);
    Route::delete('/atp/{id}/bastp', [AtpController::class, 'deleteBastp']);

    // Scope of Work Spec Guides Reference Module (baca)
    Route::get('/instruction', [InstructionController::class, 'index']);
    Route::get('/instruction/{id}', [InstructionController::class, 'showItem']);

    // User Profile Module
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::post('/profile/change-password', [ProfileController::class, 'changePassword']);
});
