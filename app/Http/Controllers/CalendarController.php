<?php

namespace App\Http\Controllers;

use App\Models\AtpRecord;
use App\Models\Survey;
use App\Models\ToolLoan;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class CalendarController extends Controller
{
    /**
     * Kalender agenda bulanan: jadwal survey ODC, tenggat pengembalian alat
     * yang masih dipinjam, dan periode ATP. Bulan dipilih lewat ?bulan=YYYY-MM.
     */
    public function index(Request $request): Response
    {
        $bulan = $request->input('bulan');
        if (!is_string($bulan) || !preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $bulan)) {
            $bulan = date('Y-m');
        }

        $awal = Carbon::createFromFormat('Y-m-d', $bulan . '-01')->startOfMonth();
        $akhir = (clone $awal)->endOfMonth();
        $dari = $awal->toDateString();
        $sampai = $akhir->toDateString();

        $agenda = [];

        $surveys = Survey::whereBetween('tanggal_survey', [$dari, $sampai])
            ->orderBy('tanggal_survey')
            ->get();
        foreach ($surveys as $survey) {
            $agenda[] = [
                'tanggal' => Carbon::parse($survey->tanggal_survey)->toDateString(),
                'jenis' => 'survey',
                'judul' => $survey->nama_site,
                'keterangan' => $survey->nama_surveyor,
                'href' => '/survey/' . $survey->id,
            ];
        }

        // Tenggat pengembalian hanya bermakna untuk peminjaman yang belum kembali.
        $loans = ToolLoan::where('status', 'dipinjam')
            ->whereNotNull('rencana_kembali')
            ->whereBetween('rencana_kembali', [$dari, $sampai])
            ->orderBy('rencana_kembali')
            ->get();
        foreach ($loans as $loan) {
            $agenda[] = [
                'tanggal' => Carbon::parse($loan->rencana_kembali)->toDateString(),
                'jenis' => 'alat',
                'judul' => $loan->peminjam ?: $loan->no_form,
                'keterangan' => trim(($loan->tipe ?: $loan->kategori) . '/' . ($loan->kategori ?: $loan->tipe), '/')
                    . ' · ' . (int) $loan->jumlah . ' unit',
                'href' => '/tools/' . $loan->id,
            ];
        }

        $atpRecords = AtpRecord::whereBetween('tanggal', [$dari, $sampai])
            ->orderBy('tanggal')
            ->get();
        foreach ($atpRecords as $record) {
            $agenda[] = [
                'tanggal' => Carbon::parse($record->tanggal)->toDateString(),
                'jenis' => 'atp',
                'judul' => $record->nama_site,
                'keterangan' => $record->verdict ?: 'belum ada verdict',
                'href' => '/atp/' . $record->id,
            ];
        }

        usort($agenda, function (array $a, array $b) {
            return [$a['tanggal'], $a['jenis']] <=> [$b['tanggal'], $b['jenis']];
        });

        return Inertia::render('Calendar/Index', [
            'bulan' => $bulan,
            'agenda' => $agenda,
            'navigasi' => [
                'sebelumnya' => (clone $awal)->subMonthNoOverflow()->format('Y-m'),
                'berikutnya' => (clone $awal)->addMonthNoOverflow()->format('Y-m'),
            ],
        ]);
    }
}
