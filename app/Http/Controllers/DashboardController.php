<?php

namespace App\Http\Controllers;

use App\Models\AtpRecord;
use App\Models\GudangKeluar;
use App\Models\GudangMasuk;
use App\Models\MaterialRequest;
use App\Models\Survey;
use App\Models\ToolLoan;
use App\Models\User;
use App\Support\Peran;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function cmeDashboard(Request $request): Response
    {
        // Kartu ringkasan tidak lagi ditampilkan di dashboard (permintaan pemilik),
        // jadi perhitungannya dihapus agar tidak ada query yang sia-sia.

        $recentAtp = AtpRecord::orderBy('created_at', 'desc')
            ->limit(100)
            ->get(['id', 'nama_site', 'tanggal', 'region', 'no_po', 'verdict', 'created_at']);

        // Tren enam bulan terakhir untuk grafik: jumlah ATP dan survey per bulan.
        $awal = now()->subMonths(5)->startOfMonth();
        $bulan = [];
        for ($i = 5; $i >= 0; $i--) {
            $kunci = now()->subMonths($i)->format('Y-m');
            $bulan[$kunci] = ['bulan' => $kunci, 'atp' => 0, 'survey' => 0];
        }

        foreach (AtpRecord::where('created_at', '>=', $awal)->pluck('created_at') as $waktu) {
            $kunci = substr((string) $waktu, 0, 7);
            if (isset($bulan[$kunci])) {
                $bulan[$kunci]['atp']++;
            }
        }

        foreach (Survey::where('created_at', '>=', $awal)->pluck('created_at') as $waktu) {
            $kunci = substr((string) $waktu, 0, 7);
            if (isset($bulan[$kunci])) {
                $bulan[$kunci]['survey']++;
            }
        }

        return Inertia::render('Dashboard/CmeDashboard', [
            'gudangTerbaru' => [
                'masuk' => GudangMasuk::orderByDesc('created_at')->limit(5)
                    ->get(['id', 'judul', 'tanggal', 'supplier', 'penerima']),
                'keluar' => GudangKeluar::orderByDesc('created_at')->limit(5)
                    ->get(['id', 'judul', 'tanggal', 'pengambil', 'lokasi_tujuan']),
            ],
            'toolsTerbaru' => ToolLoan::orderByDesc('created_at')->limit(5)
                ->get(['id', 'no_form', 'peminjam', 'tgl_pinjam', 'status', 'jumlah', 'kategori', 'tipe']),
            'requestTerbaru' => MaterialRequest::orderByDesc('created_at')->limit(5)
                ->get(['id', 'no_form', 'stasiun_site', 'tanggal', 'periode']),
            'recentAtp' => $recentAtp,
            'trend' => array_values($bulan),
        ]);
    }

    public function surveyDashboard(Request $request): Response
    {
        $role = Peran::sekarang();
        $userId = $request->session()->get('user_id');

        $query = Survey::query();
        if ($role === 'technician') {
            $query->where('created_by', $userId);
        }

        $total = (clone $query)->count();
        $mine = Survey::where('created_by', $userId)->count();
        $totalUsers = User::count();

        $recent = $query->orderBy('created_at', 'desc')
            ->limit(200)
            ->get();

        return Inertia::render('Dashboard/SurveyDashboard', [
            'stats' => [
                'total' => $total,
                'mine' => $mine,
                'users' => $totalUsers,
            ],
            'recent' => $recent,
        ]);
    }

    public function atpDashboard(Request $request): Response
    {
        $role = Peran::sekarang();
        $userId = $request->session()->get('user_id');

        $query = AtpRecord::query();
        if ($role === 'technician') {
            $query->where('created_by', $userId);
        }

        $total = (clone $query)->count();
        $accept = (clone $query)->where('verdict', 'ACCEPT')->count();
        $cond = (clone $query)->where('verdict', 'CONDITIONAL')->count();
        $reject = (clone $query)->where('verdict', 'REJECT')->count();
        $pending = (clone $query)->where(function ($q) {
            $q->where('verdict', '')->orWhereNull('verdict');
        })->count();

        $recent = $query->orderBy('created_at', 'desc')
            ->limit(200)
            ->get();

        return Inertia::render('Dashboard/AtpDashboard', [
            'stats' => [
                'total' => $total,
                'accept' => $accept,
                'conditional' => $cond,
                'reject' => $reject,
                'pending' => $pending,
            ],
            'recent' => $recent,
        ]);
    }
}
