<?php

namespace App\Support;

use App\Models\ActivityLog;
use Throwable;

/**
 * Pencatat jejak aksi tulis pengguna ke tabel activity_logs.
 */
class Aktivitas
{
    /**
     * Catat satu aksi tulis. Pengguna diambil dari auth() bila ada, kalau tidak
     * dari sesi login aplikasi ini (user_id/username/role).
     *
     * Seluruh proses dibungkus try/catch: kegagalan pencatatan tidak boleh
     * mematahkan aksi utama yang sedang dijalankan.
     */
    public static function catat(string $aksi, string $modul, ?string $refId = null, ?string $keterangan = null): void
    {
        try {
            $user = auth()->user();

            $username = trim((string) ($user?->username ?? session('username', '')));
            $role = $user?->role ?? Peran::sekarang();

            ActivityLog::create([
                'username' => $username !== '' ? $username : 'system',
                'role' => $role !== null ? (string) $role : null,
                'aksi' => $aksi,
                'modul' => $modul,
                'ref_id' => $refId !== null ? (string) $refId : null,
                'keterangan' => $keterangan !== null && $keterangan !== ''
                    ? mb_substr($keterangan, 0, 255)
                    : null,
                'ip_address' => request()->ip(),
            ]);
        } catch (Throwable $e) {
            // Diamkan; jejak log bersifat sekunder.
        }
    }
}
