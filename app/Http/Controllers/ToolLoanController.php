<?php

namespace App\Http\Controllers;

use App\Models\GudangBarang;
use App\Models\ToolLoan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use App\Support\Aktivitas;
use App\Support\Peran;

class ToolLoanController extends Controller
{
    /**
     * Daftar kondisi barang saat dikembalikan (sama dengan tool_kondisi_list()).
     */
    private $kondisiList = ['Baik', 'Rusak Ringan', 'Rusak Berat', 'Hilang'];

    /**
     * Peta barang_id => jumlah yang sedang dipinjam (status 'dipinjam').
     * Perilaku sama dengan tool_dipinjam_map(): stok gudang_barang tidak dikurangi,
     * ketersediaan dihitung dari stok dikurangi total yang sedang dipinjam.
     */
    private function dipinjamMap(): array
    {
        static $map = null;
        if ($map !== null) {
            return $map;
        }

        $map = [];
        $rows = DB::table('tool_loan')
            ->selectRaw('barang_id, SUM(jumlah) AS n')
            ->where('status', 'dipinjam')
            ->groupBy('barang_id')
            ->get();

        foreach ($rows as $row) {
            $map[(int) $row->barang_id] = (int) $row->n;
        }

        return $map;
    }

    private function dipinjam(int $barangId): int
    {
        return $this->dipinjamMap()[$barangId] ?? 0;
    }

    /**
     * Peta barang_id => merek dari gudang_barang.
     * Baris tool_loan hanya menyimpan kategori dan tipe, sedangkan merek tetap
     * tinggal di gudang_barang, jadi merek diambil lewat barang_id.
     */
    private function merekMap(): array
    {
        static $map = null;
        if ($map !== null) {
            return $map;
        }

        $map = [];
        foreach (GudangBarang::query()->pluck('merek', 'id') as $id => $merek) {
            $map[(int) $id] = $merek === null || $merek === '' ? null : (string) $merek;
        }

        return $map;
    }

    /**
     * Penomoran form PJ-YYYYMMDD-<microtime><acak>, sama persis dengan tool_no_form().
     */
    private function noForm(): string
    {
        for ($i = 0; $i < 6; $i++) {
            $no = 'PJ-' . date('Ymd') . '-' . preg_replace('/\D/', '', sprintf('%.4f', microtime(true))) . random_int(10, 99);
            if (!ToolLoan::where('no_form', $no)->exists()) {
                return $no;
            }
        }

        return 'PJ-' . date('Ymd') . '-' . random_int(100000, 999999);
    }

    /**
     * Status tampilan satu baris peminjaman (tool_status_row()).
     */
    private function statusRow(ToolLoan $row): array
    {
        if ($row->status === 'kembali') {
            return ['kode' => 'kembali', 'label' => 'Sudah kembali'];
        }

        $rencana = (string) ($row->rencana_kembali ?? '');
        if ($rencana !== '' && $rencana < date('Y-m-d')) {
            return ['kode' => 'terlambat', 'label' => 'Terlambat'];
        }

        return ['kode' => 'dipinjam', 'label' => 'Dipinjam'];
    }

    /**
     * Daftar tool dari gudang_barang lengkap dengan sisa yang bisa dipinjam.
     */
    private function toolOptions(): array
    {
        $map = $this->dipinjamMap();

        return GudangBarang::where('jenis', 'tool')
            ->where('tipe', '<>', '')
            ->orderBy('tipe')
            ->get()
            ->map(function ($item) use ($map) {
                $terpinjam = $map[(int) $item->id] ?? 0;

                return [
                    'id' => (int) $item->id,
                    'kategori' => $item->kategori,
                    'tipe' => $item->tipe,
                    'merek' => $item->merek,
                    'stok' => (int) $item->stok,
                    'dipinjam' => $terpinjam,
                    'tersedia' => (int) $item->stok - $terpinjam,
                ];
            })
            ->values()
            ->all();
    }

    public function index(Request $request): Response
    {
        $fstatus = $request->input('status', 'aktif');
        if (!in_array($fstatus, ['aktif', 'terlambat', 'kembali', 'semua'], true)) {
            $fstatus = 'aktif';
        }

        $today = date('Y-m-d');

        $query = ToolLoan::query();
        if ($fstatus === 'aktif') {
            $query->where('status', 'dipinjam');
        } elseif ($fstatus === 'terlambat') {
            $query->where('status', 'dipinjam')
                ->whereNotNull('rencana_kembali')
                ->where('rencana_kembali', '<', $today);
        } elseif ($fstatus === 'kembali') {
            $query->where('status', 'kembali');
        }

        $loans = $query->orderByRaw("(status='dipinjam') DESC")
            ->orderBy('tgl_pinjam', 'desc')
            ->orderBy('id', 'desc')
            ->get()
            ->map(fn ($row) => $this->serialize($row))
            ->all();

        $counts = DB::table('tool_loan')
            ->selectRaw(
                "COALESCE(SUM(status='dipinjam'), 0) AS aktif,"
                . " COALESCE(SUM(status='dipinjam' AND rencana_kembali IS NOT NULL AND rencana_kembali < ?), 0) AS telat,"
                . " COALESCE(SUM(status='kembali'), 0) AS kembali,"
                . ' COUNT(*) AS semua',
                [$today]
            )
            ->first();

        return Inertia::render('ToolLoan/Index', [
            'loans' => $loans,
            'counts' => [
                'aktif' => (int) $counts->aktif,
                'telat' => (int) $counts->telat,
                'kembali' => (int) $counts->kembali,
                'semua' => (int) $counts->semua,
            ],
            'filters' => ['status' => $fstatus],
            'canDelete' => Peran::admin(),
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('ToolLoan/Create', [
            'tools' => $this->toolOptions(),
            'kondisiList' => $this->kondisiList,
            'defaults' => [
                'tgl_pinjam' => date('Y-m-d'),
            ],
        ]);
    }

    public function store(Request $request)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $data = $request->validate([
            'barang_id' => 'required|integer',
            'jumlah' => 'required|integer|min:1',
            'peminjam' => 'required|string|max:100',
            'mengetahui' => 'nullable|string|max:100',
            'keperluan' => 'nullable|string|max:200',
            'lokasi' => 'nullable|string|max:200',
            'tgl_pinjam' => 'nullable|date_format:Y-m-d',
            'rencana_kembali' => 'nullable|date_format:Y-m-d',
        ], [], [
            'barang_id' => 'tool',
            'jumlah' => 'jumlah',
            'peminjam' => 'peminjam',
        ]);

        $barangId = (int) $data['barang_id'];
        $barang = GudangBarang::where('id', $barangId)->where('jenis', 'tool')->first();
        if (!$barang) {
            return redirect('/tools/baru')->with('error', 'Gagal: tool tidak ditemukan.');
        }

        $jumlah = (int) $data['jumlah'];
        $tersedia = (int) $barang->stok - $this->dipinjam($barangId);
        if ($jumlah > $tersedia) {
            return redirect('/tools/baru')->with('error', 'Gagal: jumlah pinjam melebihi yang tersedia (' . $tersedia . ' unit).');
        }

        $loan = ToolLoan::create([
            'no_form' => $this->noForm(),
            'barang_id' => $barangId,
            'kategori' => $barang->kategori,
            'tipe' => $barang->tipe,
            'jumlah' => $jumlah,
            'peminjam' => trim((string) ($data['peminjam'] ?? '')),
            'mengetahui' => trim((string) ($request->input('mengetahui') ?? '')),
            'tgl_pinjam' => $data['tgl_pinjam'] ?? date('Y-m-d'),
            'rencana_kembali' => $request->filled('rencana_kembali') ? $data['rencana_kembali'] : null,
            'keperluan' => trim((string) ($request->input('keperluan') ?? '')),
            'lokasi' => trim((string) ($request->input('lokasi') ?? '')),
            'status' => 'dipinjam',
            'created_by' => (int) $request->session()->get('user_id'),
        ]);

        // Jejak audit: satu baris per aksi tulis.
        Aktivitas::catat('tambah', 'Tools', (string) $loan->id, 'Pinjam ' . $loan->no_form);

        return redirect('/tools/' . $loan->id)->with('success', 'Peminjaman dicatat!');
    }

    public function show(Request $request, $id): Response
    {
        $loan = ToolLoan::findOrFail($id);

        $barang = GudangBarang::find($loan->barang_id);
        $terpinjam = $this->dipinjam((int) $loan->barang_id);

        return Inertia::render('ToolLoan/Show', [
            'loan' => $this->serialize($loan),
            'tool' => $barang ? [
                'id' => (int) $barang->id,
                'nama' => $barang->nama,
                'kategori' => $barang->kategori,
                'tipe' => $barang->tipe,
                'stok' => (int) $barang->stok,
                'dipinjam' => $terpinjam,
                'tersedia' => (int) $barang->stok - $terpinjam,
            ] : null,
            'kondisiList' => $this->kondisiList,
            'defaults' => ['tgl_kembali' => date('Y-m-d')],
            'canDelete' => Peran::admin(),
        ]);
    }

    public function kembalikan(Request $request, $id)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $loan = ToolLoan::findOrFail($id);

        $data = $request->validate([
            'tgl_kembali' => 'nullable|date_format:Y-m-d',
            'kondisi_kembali' => 'nullable|string|max:30',
            'catatan' => 'nullable|string',
        ], [], [
            'tgl_kembali' => 'tanggal kembali',
            'kondisi_kembali' => 'kondisi',
        ]);

        $tgl = $data['tgl_kembali'] ?? date('Y-m-d');
        $kondisi = trim((string) ($data['kondisi_kembali'] ?? '')) ?: 'Baik';
        $catatan = trim((string) ($request->input('catatan') ?? ''));

        // Stok gudang_barang tidak diubah: aplikasi lama hanya menandai status kembali.
        ToolLoan::where('id', $loan->id)->where('status', 'dipinjam')->update([
            'status' => 'kembali',
            'tgl_kembali' => $tgl,
            'kondisi_kembali' => $kondisi,
            'catatan' => $catatan,
        ]);

        // Jejak audit: satu baris per aksi tulis.
        Aktivitas::catat('kembali', 'Tools', (string) $loan->id, 'Kembali ' . $loan->no_form);

        return redirect('/tools/' . $loan->id)->with('success', 'Tool sudah dikembalikan!');
    }

    public function delete(Request $request, $id)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        if (!Peran::admin()) {
            abort(403, 'Hanya admin yang dapat menghapus transaksi peminjaman.');
        }

        $loan = ToolLoan::findOrFail($id);
        $noForm = $loan->no_form;
        $loan->delete();

        // Jejak audit: satu baris per aksi tulis.
        Aktivitas::catat('hapus', 'Tools', (string) $id, 'Pinjam ' . $noForm);

        return redirect('/tools')->with('success', 'Data dihapus.');
    }

    private function serialize(ToolLoan $row): array
    {
        return [
            'id' => (int) $row->id,
            'no_form' => $row->no_form,
            'barang_id' => (int) $row->barang_id,
            'kategori' => $row->kategori,
            'tipe' => $row->tipe,
            'merek' => $this->merekMap()[(int) $row->barang_id] ?? null,
            'jumlah' => (int) $row->jumlah,
            'peminjam' => $row->peminjam,
            'mengetahui' => $row->mengetahui,
            'tgl_pinjam' => $row->tgl_pinjam,
            'rencana_kembali' => $row->rencana_kembali,
            'keperluan' => $row->keperluan,
            'lokasi' => $row->lokasi,
            'status' => $row->status,
            'tgl_kembali' => $row->tgl_kembali,
            'kondisi_kembali' => $row->kondisi_kembali,
            'catatan' => $row->catatan,
            'created_by' => (int) $row->created_by,
            'created_at' => $row->created_at,
            'status_kode' => $this->statusRow($row)['kode'],
            'status_label' => $this->statusRow($row)['label'],
        ];
    }
}
