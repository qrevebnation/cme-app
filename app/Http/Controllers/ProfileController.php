<?php

namespace App\Http\Controllers;

use App\Models\LoginLog;
use App\Models\User;
use App\Http\Requests\UpdateProfilePasswordRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;
use App\Support\Aktivitas;

class ProfileController extends Controller
{
    public function show(Request $request): Response
    {
        $userId = $request->session()->get('user_id');
        $user = User::findOrFail($userId);

        $logs = LoginLog::where('username', $user->username)
            ->orderBy('created_at', 'desc')
            ->take(10)
            ->get();

        // Map roles to descriptions of access levels
        $permissions = match ($user->role) {
            'admin' => [
                'Dashboard & Monitoring CME (Full Access)',
                'Survey ODC (Buat, Edit, Hapus, Templat, Cetak)',
                'ATP Check (Buat, Edit, Templat, Cetak, BAL, BASTP)',
                'Gudang (Stok Ledger, Kategori, Tipe, Transaksi Masuk/Keluar)',
                'Panduan Teknis (SOW Spec Guides)',
                'Manajemen Akun Pengguna & Audit Log Keamanan'
            ],
            'project_manager' => [
                'Dashboard & Monitoring CME (Full Access)',
                'Survey ODC (Buat, Edit, Cetak)',
                'ATP Check (Buat, Edit, Cetak, BAL, BASTP)',
                'Gudang (Stok Ledger, Transaksi Masuk/Keluar)',
                'Panduan Teknis (SOW Spec Guides)'
            ],
            'technician' => [
                'Survey ODC (Buat, Edit Form)',
                'ATP Check (Buat Checklist, Edit, Upload Foto)',
                'Panduan Teknis (SOW Spec Guides)'
            ],
            'viewer' => [
                'Dashboard & Monitoring CME (Lihat Saja)',
                'Survey ODC (Lihat Saja)',
                'ATP Check (Lihat Saja)',
            ],
            default => [
                'Akses dasar.'
            ]
        };

        return Inertia::render('Profile/Show', [
            'user' => $user,
            'logs' => $logs,
            'permissions' => $permissions,
        ]);
    }

    public function changePassword(UpdateProfilePasswordRequest $request)
    {
        $userId = $request->session()->get('user_id');
        $user = User::findOrFail($userId);

        if (!Hash::check($request->input('current_password'), $user->password)) {
            return back()->withErrors([
                'current_password' => 'Password saat ini yang Anda masukkan salah.'
            ])->with('error', 'Gagal memperbarui password! Password saat ini salah.');
        }

        $user->password = Hash::make($request->input('new_password'));
        $user->save();

        // Jejak audit: perubahan password sendiri, modul Profil.
        Aktivitas::catat('ubah', 'Profil', (string) $user->id, 'Ganti password');

        return back()->with('success', 'Password Anda berhasil diperbarui!');
    }
}
