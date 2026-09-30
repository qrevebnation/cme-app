<?php

namespace App\Http\Controllers;

use App\Models\LoginLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

use App\Http\Requests\LoginRequest;
use App\Support\Aktivitas;
use App\Support\Peran;

class LoginController extends Controller
{
    /** Percobaan gagal yang diizinkan per kombinasi username + IP dalam satu menit. */
    private const MAKS_PERCOBAAN_LOGIN = 5;

    private const JEDA_PEMBATAS_LOGIN = 60;

    public function showLoginForm(Request $request)
    {
        $userId = $request->session()->get('user_id');

        // Sesi hanya boleh mengalihkan bila penggunanya masih ada di basis data;
        // kalau akunnya sudah dihapus, sesi dibersihkan dan form login ditampilkan.
        if ($userId && \App\Models\User::find($userId)) {
            return redirect($this->tujuanSetelahLogin(Peran::sekarang()));
        }

        if ($userId) {
            $request->session()->forget(['user_id', 'username', 'role', 'last_activity']);
        }

        return Inertia::render('Login', [
            'status' => session('success') ? 'success': 'error',
            'message' => session('success') ?: session('warning') ?: session('error'),
        ]);
    }

    public function login(LoginRequest $request)
    {
        $username = $request->input('username');
        $password = $request->input('password');

        $user = User::where('username', $username)->first();

        $ip = $request->ip() ?? '';
        $ua = substr($request->header('User-Agent') ?? '', 0, 500);
        $uaParts = $this->parseUa($ua);

        // Pembatas per kombinasi username + IP: satu IP tidak bisa menebak banyak akun
        // sekaligus, dan satu akun tidak bisa dibanjiri percobaan dari IP yang sama.
        $kunciPembatas = 'login:' . Str::lower(trim((string) $username)) . '|' . $ip;

        if (RateLimiter::tooManyAttempts($kunciPembatas, self::MAKS_PERCOBAAN_LOGIN)) {
            $this->catatLogin($username, 'failed', $ip, $ua, $uaParts);

            return redirect('/')->with('error', 'Terlalu banyak percobaan masuk. Coba lagi dalam satu menit.');
        }

        if ($user && Hash::check($password, $user->password)) {
            // Kredensial benar: hitungan gagal dibersihkan supaya blokir lama tidak terbawa.
            RateLimiter::clear($kunciPembatas);

            $request->session()->put('user_id', $user->id);
            $request->session()->put('username', $user->username);
            $request->session()->put('role', $user->role);
            $request->session()->put('last_activity', time());

            $this->catatLogin($username, 'success', $ip, $ua, $uaParts);

            return redirect($this->tujuanSetelahLogin($user->role))
                ->with('success', 'Selamat datang kembali, ' . $username . '!');
        }

        RateLimiter::hit($kunciPembatas, self::JEDA_PEMBATAS_LOGIN);
        $this->catatLogin($username, 'failed', $ip, $ua, $uaParts);

        return redirect('/')->with('error', 'Username atau password yang Anda masukkan salah!');
    }

    /** Halaman pendaratan per peran setelah login berhasil. */
    private function tujuanSetelahLogin(?string $role): string
    {
        if (in_array($role, Peran::PENGELOLA, true) || $role === 'viewer') {
            return '/dashboard';
        }
        return '/survey';
    }

    /** Jejak audit login: satu baris per percobaan, berhasil maupun gagal. */
    private function catatLogin(string $username, string $status, string $ip, string $ua, array $uaParts): void
    {
        [$browser, $os, $device] = $uaParts;

        LoginLog::create([
            'username' => $username,
            'status' => $status,
            'ip_address' => $ip,
            'user_agent' => $ua,
            'browser' => $browser,
            'os' => $os,
            'device' => $device,
        ]);
    }

    public function logout(Request $request)
    {
        // Jejak audit dicatat sebelum sesi dibersihkan agar username/role terbaca.
        Aktivitas::catat('keluar', 'Masuk', (string) $request->session()->get('user_id'), 'Logout');

        $request->session()->forget(['user_id', 'username', 'role', 'last_activity']);
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/')->with('success', 'Anda berhasil logout.');
    }

    private function parseUa($ua): array
    {
        $browser = 'Unknown';
        $os = 'Unknown';
        $device = 'Desktop';

        if (preg_match('/MSIE|Trident/', $ua)) $browser = 'Internet Explorer';
        elseif (preg_match('/Edg\//', $ua)) $browser = 'Edge';
        elseif (preg_match('/Firefox/', $ua)) $browser = 'Firefox';
        elseif (preg_match('/Chrome\//', $ua)) $browser = 'Chrome';
        elseif (preg_match('/Safari\//', $ua)) $browser = 'Safari';
        elseif (preg_match('/OPR|Opera/', $ua)) $browser = 'Opera';

        if (preg_match('/Windows NT 10/', $ua)) $os = 'Windows 10';
        elseif (preg_match('/Windows NT 11/', $ua)) $os = 'Windows 11';
        elseif (preg_match('/Windows NT 6\.3/', $ua)) $os = 'Windows 8.1';
        elseif (preg_match('/Windows NT 6\./', $ua)) $os = 'Windows';
        elseif (preg_match('/Mac OS X/', $ua)) $os = 'macOS';
        elseif (preg_match('/Linux/', $ua) && !preg_match('/Android/', $ua)) $os = 'Linux';
        elseif (preg_match('/Android/', $ua)) {
            $os = 'Android';
            $device = 'Mobile';
        } elseif (preg_match('/iPhone|iPad/', $ua)) {
            $os = 'iOS';
            $device = 'Mobile';
        }

        return [$browser, $os, $device];
    }
}
