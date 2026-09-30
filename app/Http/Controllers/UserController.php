<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\LoginLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Support\Aktivitas;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $users = User::orderBy('id')->get();
        return Inertia::render('User/List', [
            'users' => $users,
        ]);
    }

    public function store(StoreUserRequest $request)
    {
        $user = User::create([
            'username' => trim($request->input('username')),
            'password' => Hash::make($request->input('password')),
            'role' => $request->input('role'),
        ]);

        // Jejak audit: satu baris per aksi tulis.
        Aktivitas::catat('tambah', 'Pengguna', (string) $user->id, 'Pengguna ' . $user->username);

        return redirect('/users')->with('success', 'User baru berhasil ditambahkan!');
    }

    public function update(UpdateUserRequest $request, $id)
    {
        $user = User::findOrFail($id);

        $user->username = trim($request->input('username'));
        $user->role = $request->input('role');

        if ($request->filled('password')) {
            $user->password = Hash::make($request->input('password'));
        }

        $user->save();

        // Jejak audit: satu baris per aksi tulis.
        Aktivitas::catat('ubah', 'Pengguna', (string) $user->id, 'Pengguna ' . $user->username);

        return redirect('/users')->with('success', 'User berhasil diupdate!');
    }

    public function delete(Request $request, $id)
    {
        $currentUserId = $request->session()->get('user_id');

        if (intval($id) === intval($currentUserId)) {
            return redirect('/users')->with('error', 'Tidak dapat menghapus akun Anda sendiri!');
        }

        if (intval($id) === 1) {
            return redirect('/users')->with('error', 'Akun admin utama tidak dapat dihapus!');
        }

        $user = User::findOrFail($id);
        $namaUser = $user->username;
        $user->delete();

        // Jejak audit: satu baris per aksi tulis.
        Aktivitas::catat('hapus', 'Pengguna', (string) $id, 'Pengguna ' . $namaUser);

        return redirect('/users')->with('success', 'User berhasil dihapus!');
    }

    /** Modul yang tabelnya benar-benar menyediakan ekspor CSV di peramban. */
    private const MODUL_EKSPOR = ['Log Aktivitas', 'Riwayat Gudang', 'ATP'];

    /**
     * Ekspor CSV dibuat di peramban, jadi jejaknya dikirim ke sini agar tercatat
     * pada log aktivitas bersama aksi lain. Modul di luar daftar dikenal ditolak
     * supaya tabel log tidak bisa diisi nama modul sembarangan dari klien.
     */
    public function catatEkspor(Request $request): \Illuminate\Http\JsonResponse
    {
        $modul = (string) $request->input('modul', '');

        if (!in_array($modul, self::MODUL_EKSPOR, true)) {
            return response()->json(['ok' => false, 'pesan' => 'Modul ekspor tidak dikenal.'], 422);
        }

        Aktivitas::catat(
            'ekspor',
            $modul,
            null,
            'Ekspor '.$request->input('nama', 'data'),
        );

        return response()->json(['ok' => true]);
    }

    /** Baris log per halaman pada tabel gabungan login + aktivitas. */
    private const LOG_PER_HALAMAN = 50;

    /**
     * Log gabungan login + aktivitas dengan paginasi dan penyaringan di server.
     *
     * Dua tabel digabung lalu diurut waktu menurun di PHP, jadi tiap sumber
     * cukup diambil sebanyak halaman yang diminta (halaman x perHalaman):
     * baris teratas gabungan pasti berasal dari baris teratas salah satu
     * sumber. Hitungan total tetap dari query COUNT terpisah agar jumlah
     * halaman benar untuk seluruh data, bukan hanya yang terambil.
     */
    public function logs(Request $request): Response
    {
        $jenis = (string) $request->query('jenis', 'semua');
        if (! in_array($jenis, ['semua', 'login', 'aktivitas'], true)) {
            $jenis = 'semua';
        }

        $q = trim(is_string($request->query('q')) ? $request->query('q') : '');
        $dari = $this->tanggalSah($request->query('dari'));
        $sampai = $this->tanggalSah($request->query('sampai'));
        $perHalaman = self::LOG_PER_HALAMAN;
        $halaman = max(1, (int) $request->query('page', 1));
        $batas = $halaman * $perHalaman;

        $total = 0;
        $gabungan = collect();

        if ($jenis !== 'aktivitas') {
            $login = LoginLog::query()
                ->when($q !== '', fn ($query) => $query->where('username', 'like', '%'.$q.'%'))
                ->when($dari !== null, fn ($query) => $query->whereDate('created_at', '>=', $dari))
                ->when($sampai !== null, fn ($query) => $query->whereDate('created_at', '<=', $sampai));

            $total += (clone $login)->count();
            $gabungan = $gabungan->concat($login->orderByDesc('created_at')->take($batas)->get()->map(fn ($log) => [
                'jenis' => 'login',
                'waktu' => (string) $log->created_at,
                'pengguna' => $log->username,
                'aksi' => $log->status === 'failed' ? 'gagal' : 'masuk',
                'modul' => 'Masuk',
                'keterangan' => $log->status === 'failed' ? 'Login gagal' : 'Login berhasil',
                'ip_address' => $log->ip_address,
                'browser' => $log->browser,
                'os' => $log->os,
                'device' => $log->device,
                'status' => $log->status,
            ]));
        }

        if ($jenis !== 'login') {
            $aktivitas = ActivityLog::query()
                ->when($q !== '', fn ($query) => $query->where(function ($sub) use ($q) {
                    $sub->where('username', 'like', '%'.$q.'%')
                        ->orWhere('keterangan', 'like', '%'.$q.'%')
                        ->orWhere('modul', 'like', '%'.$q.'%');
                }))
                ->when($dari !== null, fn ($query) => $query->whereDate('created_at', '>=', $dari))
                ->when($sampai !== null, fn ($query) => $query->whereDate('created_at', '<=', $sampai));

            $total += (clone $aktivitas)->count();
            $gabungan = $gabungan->concat($aktivitas->orderByDesc('created_at')->take($batas)->get()->map(fn ($log) => [
                'jenis' => 'aktivitas',
                'waktu' => (string) $log->created_at,
                'pengguna' => $log->username,
                'aksi' => $log->aksi,
                'modul' => $log->modul,
                'keterangan' => $log->keterangan,
                'ip_address' => $log->ip_address,
                'browser' => null,
                'os' => null,
                'device' => null,
                'status' => null,
            ]));
        }

        $baris = $gabungan
            ->sortByDesc('waktu')
            ->slice(($halaman - 1) * $perHalaman, $perHalaman)
            ->values();

        return Inertia::render('User/Logs', [
            'data' => $baris,
            'total' => $total,
            'halamanSekarang' => $halaman,
            'totalHalaman' => max(1, (int) ceil($total / $perHalaman)),
            'filter' => [
                'jenis' => $jenis,
                'q' => $q,
                'dari' => $dari ?? '',
                'sampai' => $sampai ?? '',
                'perHalaman' => $perHalaman,
            ],
        ]);
    }

    /** Rentang tanggal hanya diterima dalam bentuk YYYY-MM-DD; nilai lain diabaikan. */
    private function tanggalSah(mixed $nilai): ?string
    {
        if (! is_string($nilai) || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $nilai)) {
            return null;
        }

        return $nilai;
    }
}
