<?php

namespace App\Support;

use App\Models\User;

/**
 * Sumber tunggal aturan peran: daftar peran sah, peran lama yang dinonaktifkan,
 * pembacaan peran terkini dari tabel users (bukan sesi yang bisa basi), dan
 * pemeriksaan kepemilikan baris.
 */
class Peran
{
    /** Peran sah: boleh login, muncul di dropdown pengguna, dan lolos validasi. */
    public const SAH = ['admin', 'project_manager', 'technician', 'viewer'];
    /** Peran lama yang dinonaktifkan: tidak ada lagi — semua akun lama dipetakan ke peran baru. */
    public const NONAKTIF = [];
    /** Peran pengelola modul (Inventory, Tools, Permintaan Barang, Template, Pengguna, dst.). */
    public const PENGELOLA = ['admin', 'project_manager'];
    /** Peran lapangan (membuat/mengubah data operasional miliknya sendiri). */
    public const LAPANGAN = ['admin', 'project_manager', 'technician'];
    /** Peran yang boleh membuka modul ATP. */
    public const ATP = ['admin', 'project_manager', 'technician'];

    /** Pengguna yang sedang login, dibaca dari tabel users lewat sesi user_id. */
    public static function user(): ?User
    {
        $id = session('user_id');

        return $id ? User::find($id) : null;
    }

    /** Peran terkini pengguna yang login; null bila belum login. */
    public static function sekarang(): ?string
    {
        return self::user()?->role;
    }

    public static function diizinkan(array $peran): bool
    {
        $role = self::sekarang();

        return $role !== null && in_array($role, $peran, true);
    }

    /** admin & project_manager: pemegang seluruh modul pengelolaan. */
    public static function pengelola(): bool
    {
        return self::diizinkan(self::PENGELOLA);
    }

    public static function admin(): bool
    {
        return self::diizinkan(['admin']);
    }

    /**
     * Boleh menulis (membuat/mengubah/menghapus)? Semua peran sah kecuali viewer
     * yang read-only. Dipanggil di awal setiap aksi tulis sebelum cek kepemilikan baris.
     */
    public static function bolehTulis(): bool
    {
        $role = self::sekarang();
        return $role !== null && $role !== 'viewer' && in_array($role, self::SAH, true);
    }
    /**
     * Boleh mengubah/menghapus baris? admin & project_manager bebas; peran lain hanya
     * bila kolom created_by baris itu sama dengan pengguna yang login.
     */
    public static function bolehUbah($record, ?int $userId = null): bool
    {
        if (self::pengelola()) {
            return true;
        }

        $userId ??= (int) session('user_id');

        return $userId > 0
            && $record !== null
            && (int) ($record->created_by ?? 0) === $userId;
    }
}
