<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CustomAuthMiddleware
{
    /** Menit tanpa aktivitas sebelum sesi dianggap berakhir. */
    private const BATAS_TIDAK_AKTIF_MENIT = 120;

    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $userId = $request->session()->get('user_id');
        $user = $userId ? \App\Models\User::find($userId) : null;

        // Sesi tanpa pengguna (mis. akunnya sudah dihapus) dibersihkan supaya
        // tidak berputar antara halaman login dan pengalihan per peran.
        if (!$user) {
            $request->session()->forget(['user_id', 'username', 'role', 'last_activity']);

            return redirect('/')->with('warning', 'Silakan login terlebih dahulu.');
        }

        // Sesi lama tanpa penanda aktivitas dianggap aktif sekarang, bukan langsung berakhir.
        $aktivitasTerakhir = (int) $request->session()->get('last_activity', 0);

        if ($aktivitasTerakhir > 0 && (time() - $aktivitasTerakhir) > self::BATAS_TIDAK_AKTIF_MENIT * 60) {
            $request->session()->forget(['user_id', 'username', 'role', 'last_activity']);
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect('/')->with('error', 'Sesi berakhir karena tidak ada aktivitas. Silakan masuk lagi.');
        }

        $request->session()->put('last_activity', time());

        return $next($request);
    }
}
