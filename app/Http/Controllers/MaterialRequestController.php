<?php

namespace App\Http\Controllers;

use App\Models\GudangBarang;
use App\Models\MaterialRequest;
use App\Models\MaterialRequestDetail;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use App\Support\Aktivitas;
use App\Support\Peran;

class MaterialRequestController extends Controller
{
    /** Bulan Romawi untuk nomor pengajuan, misal 001/MR/CME/IX/2026. */
    private const ROMAWI = [
        1 => 'I', 2 => 'II', 3 => 'III', 4 => 'IV', 5 => 'V', 6 => 'VI',
        7 => 'VII', 8 => 'VIII', 9 => 'IX', 10 => 'X', 11 => 'XI', 12 => 'XII',
    ];

    /** Satuan yang biasa dipakai, dipakai sebagai datalist di form. */
    private const UOM = ['Pcs', 'Unit', 'Meter', 'Set', 'Batang', 'Roll', 'Box', 'Lot', 'Buah', 'Paket'];

    /** Penandatangan default, sama dengan aplikasi lama. */
    private const TTD_DEFAULT = [
        'review_nama' => 'Mubonnur Rochman',
        'review_jabatan' => 'CME Engineer',
        'approve_nama' => 'Haposan S Pakpahan',
        'approve_jabatan' => 'Lead',
    ];

    /** Kolom teks header yang selalu disimpan sebagai string (kosong = '', bukan NULL). */
    private const KOLOM_TEKS = [
        'no_referensi', 'kontrak_mitra', 'stasiun_site', 'alamat', 'desa_kel', 'kecamatan',
        'kab_kota', 'provinsi', 'pic', 'no_telp', 'reason', 'homepass', 'remarks',
        'requestor', 'requestor_jabatan', 'review_nama', 'review_jabatan',
        'approve_nama', 'approve_jabatan',
    ];

    /** Field tanda tangan: nama input => prefix nama berkas. */
    private const KOLOM_TTD = [
        'ttd_requestor' => 'ttdreq',
        'ttd_review' => 'ttdrev',
        'ttd_approve' => 'ttdapp',
    ];

    public function index(Request $request): Response
    {
        $dari = $this->tanggalValid($request->input('dari'));
        $sampai = $this->tanggalValid($request->input('sampai'));

        $records = MaterialRequest::query()
            ->when($dari, fn ($q) => $q->where('tanggal', '>=', $dari))
            ->when($sampai, fn ($q) => $q->where('tanggal', '<=', $sampai))
            ->withCount('details')
            ->orderByDesc('tanggal')
            ->orderByDesc('id')
            ->get()
            ->map(fn (MaterialRequest $row) => [
                'id' => $row->id,
                'no_form' => $row->no_form,
                'no_pengajuan' => $row->no_pengajuan,
                'tanggal' => $row->tanggal,
                'stasiun_site' => $row->stasiun_site,
                'reason' => $row->reason,
                'requestor' => $row->requestor,
                'jml_item' => $row->details_count,
            ]);

        return Inertia::render('MaterialRequest/Index', [
            'records' => $records,
            'filters' => ['dari' => $dari, 'sampai' => $sampai],
        ]);
    }

    /**
     * Saran material dari stok gudang untuk datalist pada form, supaya penulisan
     * nama barang konsisten dengan inventaris (aplikasi lama hanya teks bebas).
     */
    private function daftarBarang(): \Illuminate\Support\Collection
    {
        return GudangBarang::query()
            ->orderBy('nama')
            ->get(['nama', 'kategori', 'tipe', 'satuan', 'merek'])
            ->map(fn ($b) => [
                'nama' => $b->nama,
                'satuan' => $b->satuan,
                'merek' => $b->merek,
                'kategori' => $b->kategori,
                'tipe' => $b->tipe,
            ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('MaterialRequest/Create', [
            'uomList' => self::UOM,
            'barangList' => $this->daftarBarang(),
            'defaultTtd' => self::TTD_DEFAULT,
            'defaultRequestor' => $request->session()->get('username') ?? '',
            'tanggalHariIni' => date('Y-m-d'),
        ]);
    }

    public function store(Request $request)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $data = $request->validate($this->aturan());

        $items = $this->ambilItems($request);
        if (!$items) {
            return redirect()->back()->with('error', 'Gagal disimpan: minimal 1 baris material (Description) harus diisi.');
        }

        $userId = $request->session()->get('user_id');
        $ttd = [];
        foreach (self::KOLOM_TTD as $field => $prefix) {
            $ttd[$field] = $this->simpanTtd($request, $field, $prefix);
        }

        try {
            $id = $this->simpanHeader($this->headerDari($data), $ttd, $items, $userId);
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal menyimpan data: ' . $e->getMessage());
        }

        // Jejak audit: satu baris per aksi tulis.
        Aktivitas::catat('tambah', 'Permintaan Barang', (string) $id, 'Site ' . ($data['stasiun_site'] ?? ''));

        return redirect('/material-request')->with('success', 'Request material berhasil disimpan!');
    }

    public function show(Request $request, $id): Response
    {
        $record = MaterialRequest::with('details')->findOrFail($id);

        return Inertia::render('MaterialRequest/Show', [
            'record' => $this->recordUntukTampilan($record),
        ]);
    }

    public function edit(Request $request, $id): Response
    {
        $record = MaterialRequest::with('details')->findOrFail($id);

        return Inertia::render('MaterialRequest/Edit', [
            'record' => $this->recordUntukTampilan($record),
            'uomList' => self::UOM,
            'barangList' => $this->daftarBarang(),
            'defaultTtd' => self::TTD_DEFAULT,
            'defaultRequestor' => $record->requestor ?? '',
            'tanggalHariIni' => date('Y-m-d'),
        ]);
    }

    public function update(Request $request, $id)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $record = MaterialRequest::findOrFail($id);
        $data = $request->validate($this->aturan());

        $items = $this->ambilItems($request);
        if (!$items) {
            return redirect()->back()->with('error', 'Gagal disimpan: minimal 1 baris material (Description) harus diisi.');
        }

        $perubahan = $this->headerDari($data);
        // Periode ikut tanggal baru supaya penomoran bulan berikutnya tetap benar.
        $perubahan['periode'] = date('Y-m', strtotime($perubahan['tanggal']));

        // Gambar baru menggantikan yang lama; centang hapus tanpa gambar baru → dikosongkan.
        foreach (self::KOLOM_TTD as $field => $prefix) {
            $baru = $this->simpanTtd($request, $field, $prefix);
            if ($baru !== null) {
                $perubahan[$field] = $baru;
            } elseif ($request->boolean('hapus_' . $field)) {
                $perubahan[$field] = null;
            }
        }

        try {
            DB::transaction(function () use ($record, $perubahan, $items) {
                $record->update($perubahan);
                MaterialRequestDetail::where('request_id', $record->id)->delete();
                $this->simpanItems($record->id, $items);
            });
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal memperbarui data: ' . $e->getMessage());
        }

        // Jejak audit: satu baris per aksi tulis.
        Aktivitas::catat('ubah', 'Permintaan Barang', (string) $record->id, 'No. ' . $record->no_pengajuan);

        return redirect('/material-request')->with('success', 'Request material berhasil diperbarui!');
    }

    public function delete(Request $request, $id)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $record = MaterialRequest::findOrFail($id);
        $noPengajuan = $record->no_pengajuan;

        DB::transaction(function () use ($record) {
            MaterialRequestDetail::where('request_id', $record->id)->delete();
            $record->delete();
        });

        // Jejak audit: satu baris per aksi tulis.
        Aktivitas::catat('hapus', 'Permintaan Barang', (string) $id, 'No. ' . $noPengajuan);

        return redirect('/material-request')->with('success', 'Data request material berhasil dihapus!');
    }

    /** @return array<string, string> Aturan validasi header, item, dan berkas tanda tangan. */
    private function aturan(): array
    {
        $aturan = [
            'tanggal' => 'required|date',
            'stasiun_site' => 'required|string|max:200',
            'reason' => 'required|string',
            'no_referensi' => 'nullable|string|max:100',
            'kontrak_mitra' => 'nullable|string|max:200',
            'alamat' => 'nullable|string|max:200',
            'desa_kel' => 'nullable|string|max:100',
            'kecamatan' => 'nullable|string|max:100',
            'kab_kota' => 'nullable|string|max:100',
            'provinsi' => 'nullable|string|max:100',
            'pic' => 'nullable|string|max:100',
            'no_telp' => 'nullable|string|max:30',
            'homepass' => 'nullable|string|max:50',
            'remarks' => 'nullable|string',
            'requestor' => 'nullable|string|max:100',
            'requestor_jabatan' => 'nullable|string|max:100',
            'review_nama' => 'nullable|string|max:100',
            'review_jabatan' => 'nullable|string|max:100',
            'approve_nama' => 'nullable|string|max:100',
            'approve_jabatan' => 'nullable|string|max:100',
            'items' => 'required|array|min:1',
            'items.*.nama_material' => 'nullable|string|max:200',
            'items.*.uom' => 'nullable|string|max:20',
            // qty di bawah 1 dibulatkan ke 1 saat disimpan, sama seperti aplikasi lama.
            'items.*.qty' => 'nullable|integer',
        ];

        foreach (array_keys(self::KOLOM_TTD) as $field) {
            $aturan[$field] = 'nullable|image|mimes:png,jpg,jpeg,gif,webp|max:4096';
            $aturan['hapus_' . $field] = 'nullable|boolean';
        }

        return $aturan;
    }

    /** @return array<string, mixed> Header siap simpan; kolom teks kosong ditulis ''. */
    private function headerDari(array $data): array
    {
        $header = ['tanggal' => $data['tanggal']];

        foreach (self::KOLOM_TEKS as $kolom) {
            $header[$kolom] = trim((string) ($data[$kolom] ?? ''));
        }

        return $header;
    }

    /**
     * Simpan header + detail. Nomor form/pengajuan dibuat ulang kalau bentrok
     * (dua permintaan di detik yang sama), sama seperti aplikasi lama.
     */
    private function simpanHeader(array $header, array $ttd, array $items, $userId): int
    {
        for ($try = 0; $try < 5; $try++) {
            try {
                return DB::transaction(function () use ($header, $ttd, $items, $userId, $try) {
                    $record = MaterialRequest::create($header + $ttd + [
                        'no_form' => $this->buatNoForm(),
                        'no_pengajuan' => $this->buatNoPengajuan($header['tanggal'], $try),
                        'periode' => date('Y-m', strtotime($header['tanggal'])),
                        'created_by' => $userId,
                    ]);

                    $this->simpanItems($record->id, $items);

                    return $record->id;
                });
            } catch (QueryException $e) {
                if (($e->errorInfo[1] ?? 0) !== 1062) {
                    throw $e;
                }
            }
        }

        throw new RuntimeException('Nomor form tidak dapat dibuat: semua percobaan nomor bentrok.');
    }

    private function buatNoForm(): string
    {
        return 'MR-' . date('Ymd') . '-' . preg_replace('/\D/', '', sprintf('%.4f', microtime(true))) . random_int(10, 99);
    }

    /** No. pengajuan urut per bulan: 001/MR/CME/IX/2026. */
    private function buatNoPengajuan(string $tanggal, int $offset = 0): string
    {
        $ts = strtotime($tanggal) ?: time();
        $periode = date('Y-m', $ts);

        $tertinggi = DB::table('material_request')
            ->where('periode', $periode)
            ->selectRaw("MAX(CAST(SUBSTRING_INDEX(no_pengajuan,'/',1) AS UNSIGNED)) AS n")
            ->value('n');

        return sprintf('%03d', intval($tertinggi) + 1 + $offset)
            . '/MR/CME/' . self::ROMAWI[(int) date('n', $ts)] . '/' . date('Y', $ts);
    }

    /** @return array<int, array{nama_material: string, uom: string, qty: int}> Baris terisi saja. */
    private function ambilItems(Request $request): array
    {
        $items = [];

        foreach ($request->input('items', []) as $baris) {
            $nama = trim((string) ($baris['nama_material'] ?? ''));
            if ($nama === '') {
                continue;
            }

            $uom = trim((string) ($baris['uom'] ?? ''));

            $items[] = [
                'nama_material' => $nama,
                'uom' => $uom !== '' ? $uom : 'Pcs',
                'qty' => max(1, (int) ($baris['qty'] ?? 1)),
            ];
        }

        return $items;
    }

    private function simpanItems(int $requestId, array $items): void
    {
        $rows = [];
        $no = 0;

        foreach ($items as $item) {
            $no++;
            $rows[] = [
                'request_id' => $requestId,
                'no_urut' => $no,
                'nama_material' => $item['nama_material'],
                'uom' => $item['uom'],
                'qty' => $item['qty'],
            ];
        }

        MaterialRequestDetail::insert($rows);
    }

    /** Pindahkan gambar tanda tangan ke public/uploads/ttd; null kalau tidak ada berkas baru. */
    private function simpanTtd(Request $request, string $field, string $prefix): ?string
    {
        $file = $request->file($field);
        if (!$file || !$file->isValid()) {
            return null;
        }

        $ext = strtolower($file->getClientOriginalExtension());
        if (!in_array($ext, ['png', 'jpg', 'jpeg', 'gif', 'webp'], true)) {
            return null;
        }

        $dir = public_path('uploads/ttd');
        if (!is_dir($dir)) {
            mkdir($dir, 0777, true);
        }

        $nama = $prefix . '_' . date('Ymd') . '_'
            . preg_replace('/\D/', '', sprintf('%.4f', microtime(true))) . random_int(10, 99) . '.' . $ext;

        return $file->move($dir, $nama) ? $nama : null;
    }

    /** @return array<string, mixed> Header + detail + URL tanda tangan untuk halaman React. */
    private function recordUntukTampilan(MaterialRequest $record): array
    {
        $record->load(['details' => fn ($q) => $q->orderBy('no_urut')->orderBy('id')]);

        $data = $record->only(array_merge(
            ['id', 'no_form', 'no_pengajuan', 'periode', 'tanggal', 'created_by'],
            self::KOLOM_TEKS,
            array_keys(self::KOLOM_TTD)
        ));

        foreach (array_keys(self::KOLOM_TTD) as $field) {
            $data[$field . '_url'] = $this->urlTtd($record->{$field});
        }

        $data['details'] = $record->details->map(fn (MaterialRequestDetail $item) => [
            'id' => $item->id,
            'no_urut' => $item->no_urut,
            'nama_material' => $item->nama_material,
            'uom' => $item->uom,
            'qty' => $item->qty,
        ])->values();

        return $data;
    }

    /** Nama berkas saja yang disimpan; kalau nilainya sudah berupa path, pakai apa adanya. */
    private function urlTtd(?string $nama): ?string
    {
        if (!$nama) {
            return null;
        }

        return str_starts_with($nama, 'uploads/') ? '/' . $nama : '/uploads/ttd/' . $nama;
    }

    private function tanggalValid($nilai): string
    {
        return is_string($nilai) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $nilai) ? $nilai : '';
    }
}
