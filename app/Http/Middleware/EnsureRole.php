<?php

namespace App\Http\Middleware;

use App\Support\Peran;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Gerbang peran per modul. Peran dibaca dari tabel users lewat sesi user_id lalu
 * disimpan ulang ke sesi, supaya nilai sesi yang basi selalu tertimpa.
 */
class EnsureRole
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$peran): Response
    {
        $user = Peran::user();

        if (!$user) {
            return redirect('/')->with('warning', 'Silakan login terlebih dahulu.');
        }

        $request->session()->put('role', $user->role);

        if (!in_array($user->role, $peran, true)) {
            abort(403, 'Anda tidak memiliki otorisasi untuk mengakses modul ini.');
        }

        return $next($request);
    }
}
