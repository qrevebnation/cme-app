<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Petakan peran lama ke 4 peran baru, lalu sempitkan kolom enum users.role.
     *
     * Pemetaan (tanpa data hilang):
     * - admin        -> admin (tetap)
     * - staff_cme    -> project_manager (pengelola modul)
     * - surveyor     -> technician (lapangan)
     * - vendor       -> technician (lapangan, modul ATP)
     * - visitor      -> viewer (read-only)
     * - atp          -> technician (lapangan, modul ATP)
     * - nilai lain / NULL -> viewer (aman: read-only, bukan akses tulis liar)
     */
    public function up(): void
    {
        if (!Schema::hasTable('users')) {
            return;
        }

        $baru = ['admin', 'project_manager', 'technician', 'viewer'];

        // ENUM menolak nilai di luar daftar: lebarkan dulu ke gabungan lama+baru,
        // petakan data, baru sempitkan ke 4 peran baru.
        DB::statement("ALTER TABLE `users` MODIFY COLUMN `role` ENUM('admin','surveyor','visitor','atp','staff_cme','vendor','project_manager','technician','viewer') NOT NULL DEFAULT 'surveyor'");
        DB::table('users')->where('role', 'staff_cme')->update(['role' => 'project_manager']);
        DB::table('users')->where('role', 'surveyor')->update(['role' => 'technician']);
        DB::table('users')->where('role', 'vendor')->update(['role' => 'technician']);
        DB::table('users')->where('role', 'visitor')->update(['role' => 'viewer']);
        DB::table('users')->where('role', 'atp')->update(['role' => 'technician']);
        DB::table('users')->whereNotIn('role', $baru)->orWhereNull('role')->update(['role' => 'viewer']);
        DB::statement("ALTER TABLE `users` MODIFY COLUMN `role` ENUM('admin','project_manager','technician','viewer') NOT NULL DEFAULT 'viewer'");
    }

    /**
     * Kembalikan enum lama; peran baru dipetakan balik ke padanan lama terdekat.
     */
    public function down(): void
    {
        if (!Schema::hasTable('users')) {
            return;
        }

        DB::statement("ALTER TABLE `users` MODIFY COLUMN `role` ENUM('admin','surveyor','visitor','atp','staff_cme','vendor','project_manager','technician','viewer') NOT NULL DEFAULT 'surveyor'");
        DB::table('users')->where('role', 'project_manager')->update(['role' => 'staff_cme']);
        DB::table('users')->where('role', 'technician')->update(['role' => 'surveyor']);
        DB::table('users')->where('role', 'viewer')->update(['role' => 'visitor']);
        DB::statement("ALTER TABLE `users` MODIFY COLUMN `role` ENUM('admin','surveyor','visitor','atp','staff_cme','vendor') NOT NULL DEFAULT 'surveyor'");
    }
};
