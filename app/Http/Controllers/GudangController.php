<?php

namespace App\Http\Controllers;

use App\Models\GudangBarang;
use App\Models\GudangKeluar;
use App\Models\GudangKeluarDetail;
use App\Models\GudangMasuk;
use App\Models\GudangMasukDetail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use App\Http\Requests\StoreGudangKategoriRequest;
use App\Http\Requests\StoreGudangTipeRequest;
use App\Http\Requests\StoreGudangMasukRequest;
use App\Http\Requests\StoreGudangKeluarRequest;
use App\Support\Aktivitas;
use App\Support\Peran;

class GudangController extends Controller
{
    private $defaultCategories = [
        'MCB', 'PDU', 'Recti', 'Inverter', 'Baterai', 'UPS', 'Kabel', 'Konektor', 'Busbar', 'Panel', 'Grounding'
    ];

    public function index(Request $request): Response
    {
        $search = $request->input('cari');
        $catFilter = $request->input('kategori');
        // Hanya dua tab: Consumables (default) dan Tools.
        $jenisFilter = $request->input('jenis') === 'tool' ? 'tool' : 'consumable';

        // Retrieve predefined options and dynamically query custom entries from DB
        $customCats = GudangBarang::distinct()->pluck('kategori')->toArray();
        $categories = array_unique(array_merge($this->defaultCategories, $customCats));

        // Filter out deleted categories/types tracked in session
        $deletedCats = $request->session()->get('deleted_gudang_kat', []);
        $deletedTipes = $request->session()->get('deleted_gudang_tipe', []);

        $categories = array_values(array_diff($categories, $deletedCats));

        $query = GudangBarang::query()->where(function ($q) use ($jenisFilter) {
            $q->where('jenis', $jenisFilter);
            // Barang yang dibuat lewat form (kategori/tipe/barang masuk) belum
            // mengisi kolom jenis; tampilkan di tab Consumables, bukan hilang.
            if ($jenisFilter === 'consumable') {
                $q->orWhereNull('jenis');
            }
        });
        if ($catFilter) {
            $query->where('kategori', $catFilter);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('nama', 'like', "%{$search}%")
                  ->orWhere('kategori', 'like', "%{$search}%")
                  ->orWhere('tipe', 'like', "%{$search}%");
            });
        }

        $items = $query->orderBy('kategori')->orderBy('tipe')->get();

        // Filter items based on deleted types session tracking
        $items = $items->filter(function ($item) use ($deletedTipes) {
            $key = $item->kategori . '|' . $item->tipe;
            return !in_array($key, $deletedTipes);
        })->values();

        // Calculate totals per category
        $categoryTotals = [];
        foreach ($categories as $cat) {
            $categoryTotals[$cat] = GudangBarang::where('kategori', $cat)->sum('stok') ?? 0;
        }

        return Inertia::render('Gudang/Stock', [
            'items' => $items,
            'categories' => $categories,
            'totals' => $categoryTotals,
            'filters' => array_merge($request->only(['cari', 'kategori']), [
                'jenis' => $jenisFilter,
                'aksi' => $request->input('aksi'),
            ]),
            'totalMasukCount' => GudangMasuk::count(),
            'totalKeluarCount' => GudangKeluar::count(),
            'totalPeminjamanAktif' => \App\Models\ToolLoan::where('status', 'dipinjam')->count(),
        ]);
    }

    public function storeKategori(StoreGudangKategoriRequest $request)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $kat = $request->input('kategori');
        $sat = $request->input('satuan');
        // Tab aktif menentukan jenis; default consumable bila tak dikirim.
        $jenis = $request->input('jenis') === 'tool' ? 'tool' : 'consumable';

        $barang = GudangBarang::create([
            'nama' => $kat . ' Default',
            'kategori' => $kat,
            'tipe' => '',
            'jenis' => $jenis,
            'stok' => 0,
            'satuan' => $sat,
            'min_stok' => 0
        ]);

        // Jejak audit: satu baris per aksi tulis inventory.
        Aktivitas::catat('tambah', 'Inventory', (string) $barang->id, 'Kategori ' . $kat);

        return redirect('/gudang?jenis=' . $jenis)->with('success', 'Kategori baru berhasil ditambahkan!');
    }

    public function storeTipe(StoreGudangTipeRequest $request)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $kat = $request->input('kategori');
        $tipe = $request->input('tipe');
        // Merek bebas diisi apa adanya; kosong disimpan NULL dan dipotong
        // sepanjang lebar kolom (VARCHAR(100)).
        $merek = $request->input('merek');
        $merek = is_string($merek) ? mb_substr(trim($merek), 0, 100) : '';
        $merek = $merek === '' ? null : $merek;
        // Tab aktif menentukan jenis; default consumable bila tak dikirim.
        $jenis = $request->input('jenis') === 'tool' ? 'tool' : 'consumable';

        $barang = GudangBarang::create([
            'nama' => $kat . ' ' . $tipe,
            'kategori' => $kat,
            'tipe' => $tipe,
            'merek' => $merek,
            'jenis' => $jenis,
            'stok' => 0,
            'satuan' => 'Unit',
            'min_stok' => 1
        ]);

        // Jejak audit: satu baris per aksi tulis inventory.
        Aktivitas::catat('tambah', 'Inventory', (string) $barang->id, 'Tipe ' . $kat . ' ' . $tipe);

        return redirect('/gudang?jenis=' . $jenis)->with('success', 'Tipe baru berhasil ditambahkan!');
    }

    public function storeMasuk(StoreGudangMasukRequest $request)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $userId = $request->session()->get('user_id');
        $noForm = 'BM-' . date('Ymd') . '-' . time();

        DB::beginTransaction();
        try {
            $gudangMasuk = GudangMasuk::create([
                'no_form' => $noForm,
                'judul' => $request->input('judul') ?? '',
                'kategori' => $request->input('kategori_batch') ?? '',
                'tanggal' => $request->input('tanggal'),
                'supplier' => $request->input('supplier'),
                'penerima' => $request->input('penerima'),
                'lokasi' => $request->input('lokasi') ?? '',
                'keterangan' => $request->input('keterangan'),
                'diserahkan' => $request->input('diserahkan') ?? '',
                'diterima' => $request->input('penerima'),
                'created_by' => $userId,
            ]);

            // Handle file attachments from temporary uploads
            if ($request->has('foto')) {
                $fotoNames = [];
                foreach ($request->input('foto') as $fileData) {
                    $tempPath = $fileData['path'] ?? null;
                    if (!$tempPath) continue;

                    $fullTempPath = storage_path('app/public/' . $tempPath);
                    if (file_exists($fullTempPath)) {
                        $gudangMasuk->addMedia($fullTempPath)
                                    ->toMediaCollection('attachments');
                        $fotoNames[] = basename($fullTempPath);
                    }
                }
                if (!empty($fotoNames)) {
                    $gudangMasuk->update(['foto' => implode(',', $fotoNames)]);
                }
            }

            foreach ($request->input('items') as $item) {
                $kat = $item['kategori'];
                $tipe = $item['tipe'];
                $jml = intval($item['jumlah']);

                if (empty($tipe) || $jml <= 0) continue;

                $nama = $kat . ' ' . $tipe;

                // Tab aktif menentukan jenis; default consumable bila tak dikirim.
                $jenis = $request->input('jenis') === 'tool' ? 'tool' : 'consumable';

                // Check if item exists in ledger
                $barang = GudangBarang::where('kategori', $kat)->where('tipe', $tipe)->first();
                if ($barang) {
                    $barang->stok += $jml;
                    if (empty($barang->jenis)) $barang->jenis = $jenis;
                    $barang->save();
                    $barangId = $barang->id;
                    $satuan = $barang->satuan;
                } else {
                    $newBarang = GudangBarang::create([
                        'nama' => $nama,
                        'kategori' => $kat,
                        'tipe' => $tipe,
                        'jenis' => $jenis,
                        'stok' => $jml,
                        'satuan' => 'Unit',
                        'min_stok' => 1
                    ]);
                    $barangId = $newBarang->id;
                    $satuan = 'Unit';
                }

                GudangMasukDetail::create([
                    'masuk_id' => $gudangMasuk->id,
                    'barang_id' => $barangId,
                    'nama_barang' => $nama,
                    'tipe_barang' => $tipe,
                    'jumlah' => $jml,
                    'satuan' => $satuan,
                ]);
            }

            DB::commit();
            // Jejak audit: satu baris per aksi tulis inventory.
            Aktivitas::catat('masuk', 'Inventory', (string) $gudangMasuk->id, 'Barang masuk ' . $noForm);
            return redirect('/gudang')->with('success', 'Transaksi barang masuk dicatat!');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Gagal mencatat transaksi: ' . $e->getMessage());
        }
    }

    public function storeKeluar(StoreGudangKeluarRequest $request)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $userId = $request->session()->get('user_id');
        $noForm = 'BK-' . date('Ymd') . '-' . time();

        DB::beginTransaction();
        try {
            $gudangKeluar = GudangKeluar::create([
                'no_form' => $noForm,
                'judul' => $request->input('judul') ?? '',
                'kategori' => $request->input('kategori_batch') ?? '',
                'tanggal' => $request->input('tanggal'),
                'pengambil' => $request->input('pengambil'),
                'jabatan' => $request->input('jabatan') ?? '',
                'lokasi_tujuan' => $request->input('lokasi_tujuan'),
                'keperluan' => $request->input('keperluan') ?? '',
                'proyek' => $request->input('proyek') ?? '',
                'tujuan' => $request->input('tujuan') ?? '',
                'keterangan' => $request->input('keterangan') ?? '',
                'disetujui' => $request->input('disetujui') ?? '',
                'pengambil_ttd' => $request->input('pengambil'),
                'created_by' => $userId,
            ]);

            // Handle file attachments from temporary uploads
            if ($request->has('foto')) {
                $fotoNames = [];
                foreach ($request->input('foto') as $fileData) {
                    $tempPath = $fileData['path'] ?? null;
                    if (!$tempPath) continue;

                    $fullTempPath = storage_path('app/public/' . $tempPath);
                    if (file_exists($fullTempPath)) {
                        $gudangKeluar->addMedia($fullTempPath)
                                     ->toMediaCollection('attachments');
                        $fotoNames[] = basename($fullTempPath);
                    }
                }
                if (!empty($fotoNames)) {
                    $gudangKeluar->update(['foto' => implode(',', $fotoNames)]);
                }
            }

            foreach ($request->input('items') as $item) {
                $kat = $item['kategori'];
                $tipe = $item['tipe'];
                $jml = intval($item['jumlah']);

                if (empty($tipe) || $jml <= 0) continue;

                $nama = $kat . ' ' . $tipe;

                $barang = GudangBarang::where('kategori', $kat)->where('tipe', $tipe)->first();
                if ($barang) {
                    $barang->stok = max(0, $barang->stok - $jml);
                    if (empty($barang->jenis)) $barang->jenis = $request->input('jenis') === 'tool' ? 'tool' : 'consumable';
                    $barang->save();
                    $barangId = $barang->id;
                    $satuan = $barang->satuan;
                } else {
                    $barangId = 0;
                    $satuan = 'Unit';
                }

                GudangKeluarDetail::create([
                    'keluar_id' => $gudangKeluar->id,
                    'barang_id' => $barangId,
                    'nama_barang' => $nama,
                    'tipe_barang' => $tipe,
                    'jumlah' => $jml,
                    'satuan' => $satuan,
                ]);
            }

            DB::commit();
            // Jejak audit: satu baris per aksi tulis inventory.
            Aktivitas::catat('keluar', 'Inventory', (string) $gudangKeluar->id, 'Barang keluar ' . $noForm);
            return redirect('/gudang')->with('success', 'Transaksi barang keluar dicatat!');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Gagal mencatat transaksi keluar: ' . $e->getMessage());
        }
    }

    /**
     * Impor CSV stok: terima JSON hasil parse client-side (tanpa lib baru di
     * depan), upsert per baris ke ledger. Jumlah <= 0 ditolak validasi.
     */
    public function impor(Request $request)
    {
        $data = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.kategori' => 'required|string|max:255',
            'items.*.tipe' => 'required|string|max:255',
            'items.*.jumlah' => 'required|integer|min:1',
            'items.*.satuan' => 'nullable|string|max:50',
            'items.*.merek' => 'nullable|string|max:100',
            'items.*.jenis' => 'nullable|in:consumable,tool',
            'jenis' => 'nullable|in:consumable,tool',
        ]);

        // Jenis default dari tab aktif pengimpor; baris boleh menimpa per item.
        $jenisDefault = $data['jenis'] ?? 'consumable';

        DB::beginTransaction();
        try {
            $masuk = 0;
            foreach ($data['items'] as $item) {
                $kat = trim($item['kategori']);
                $tipe = trim($item['tipe']);
                $jml = (int) $item['jumlah'];
                $jenis = $item['jenis'] ?? $jenisDefault;

                $barang = GudangBarang::where('kategori', $kat)->where('tipe', $tipe)->first();
                if ($barang) {
                    $barang->stok += $jml;
                    if (empty($barang->jenis)) $barang->jenis = $jenis;
                    $barang->save();
                } else {
                    GudangBarang::create([
                        'nama' => $kat . ' ' . $tipe,
                        'kategori' => $kat,
                        'tipe' => $tipe,
                        'merek' => isset($item['merek']) && trim((string) $item['merek']) !== ''
                            ? mb_substr(trim((string) $item['merek']), 0, 100) : null,
                        'jenis' => $jenis,
                        'stok' => $jml,
                        'satuan' => isset($item['satuan']) && trim((string) $item['satuan']) !== ''
                            ? mb_substr(trim((string) $item['satuan']), 0, 50) : 'Unit',
                        'min_stok' => 1,
                    ]);
                }
                $masuk++;
            }

            DB::commit();
            // Jejak audit: satu baris per aksi tulis inventory.
            Aktivitas::catat('impor', 'Inventory', null, 'Impor CSV ' . $masuk . ' baris');
            return redirect('/gudang?jenis=' . $jenisDefault)->with('success', 'Impor CSV berhasil: ' . $masuk . ' baris masuk!');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Gagal mengimpor CSV: ' . $e->getMessage());
        }
    }

    public function history(Request $request): Response
    {
        $search = $request->input('cari');
        $typeFilter = $request->input('type');

        $masukList = [];
        $keluarList = [];

        if (!$typeFilter || $typeFilter === 'masuk') {
            $masukQuery = GudangMasuk::query();
            if ($search) {
                $masukQuery->where(function($q) use ($search) {
                    $q->where('no_form', 'like', "%{$search}%")
                      ->orWhere('judul', 'like', "%{$search}%")
                      ->orWhere('supplier', 'like', "%{$search}%")
                      ->orWhere('penerima', 'like', "%{$search}%")
                      ->orWhere('lokasi', 'like', "%{$search}%");
                });
            }
            $masukList = $masukQuery->orderBy('tanggal', 'desc')->get()->map(function($item) {
                return [
                    'id' => $item->id,
                    'no_form' => $item->no_form,
                    'type' => 'masuk',
                    'tanggal' => $item->tanggal,
                    'judul' => $item->judul,
                    'pihak' => $item->supplier,
                    'penerima_pengambil' => $item->penerima,
                    'lokasi' => $item->lokasi ?: '-',
                ];
            })->toArray();
        }

        if (!$typeFilter || $typeFilter === 'keluar') {
            $keluarQuery = GudangKeluar::query();
            if ($search) {
                $keluarQuery->where(function($q) use ($search) {
                    $q->where('no_form', 'like', "%{$search}%")
                      ->orWhere('judul', 'like', "%{$search}%")
                      ->orWhere('pengambil', 'like', "%{$search}%")
                      ->orWhere('lokasi_tujuan', 'like', "%{$search}%");
                });
            }
            $keluarList = $keluarQuery->orderBy('tanggal', 'desc')->get()->map(function($item) {
                return [
                    'id' => $item->id,
                    'no_form' => $item->no_form,
                    'type' => 'keluar',
                    'tanggal' => $item->tanggal,
                    'judul' => $item->judul,
                    'pihak' => $item->pengambil,
                    'penerima_pengambil' => $item->pengambil,
                    'lokasi' => $item->lokasi_tujuan ?: '-',
                ];
            })->toArray();
        }

        $combined = array_merge($masukList, $keluarList);

        usort($combined, function($a, $b) {
            return strcmp($b['tanggal'], $a['tanggal']) ?: strcmp($b['no_form'], $a['no_form']);
        });

        return Inertia::render('Gudang/History', [
            'transactions' => $combined,
            'filters' => $request->only(['cari', 'type']),
        ]);
    }

    public function masukDetail($id): Response
    {
        $transaction = GudangMasuk::with('details')->findOrFail($id);
        return Inertia::render('Gudang/MasukDetail', [
            'transaction' => $transaction,
        ]);
    }

    public function keluarDetail($id): Response
    {
        $transaction = GudangKeluar::with('details')->findOrFail($id);
        return Inertia::render('Gudang/KeluarDetail', [
            'transaction' => $transaction,
        ]);
    }

    public function editMasuk($id): Response
    {
        $transaction = GudangMasuk::with('details.barang')->findOrFail($id);

        return Inertia::render('Gudang/MasukEdit', [
            'transaction' => $transaction,
            'items' => $this->daftarBarang(),
            'categories' => $this->daftarKategori(),
        ]);
    }

    public function updateMasuk(Request $request, $id)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $transaction = GudangMasuk::with('details')->findOrFail($id);

        $data = $request->validate($this->aturanUbah([
            'supplier' => 'required|string',
            'penerima' => 'required|string',
            'lokasi' => 'nullable|string',
            'judul' => 'nullable|string',
        ]));

        DB::beginTransaction();
        try {
            $transaction->update([
                'judul' => $data['judul'] ?? '',
                'tanggal' => $data['tanggal'],
                'supplier' => $data['supplier'],
                'penerima' => $data['penerima'],
                'lokasi' => $data['lokasi'] ?? '',
                'keterangan' => $data['keterangan'] ?? '',
            ]);

            $this->gantiDetail($transaction, 'masuk_id', $data['items'], true);
            $this->lampirkanFoto($transaction, $data['foto'] ?? []);

            DB::commit();
            // Jejak audit: satu baris per aksi tulis inventory.
            Aktivitas::catat('ubah', 'Inventory', (string) $transaction->id, 'Barang masuk ' . $transaction->no_form);
            return redirect('/gudang/history')->with('success', 'Transaksi barang masuk diperbarui!');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Gagal memperbarui transaksi: ' . $e->getMessage());
        }
    }

    public function deleteMasuk($id)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $transaction = GudangMasuk::with('details')->findOrFail($id);
        $noForm = $transaction->no_form;

        DB::beginTransaction();
        try {
            // Rincian dikosongkan: stok barang kembali seperti sebelum transaksi.
            $this->gantiDetail($transaction, 'masuk_id', [], true);
            $this->hapusSemuaFoto($transaction);
            $transaction->delete();

            DB::commit();
            // Jejak audit: satu baris per aksi tulis inventory.
            Aktivitas::catat('hapus', 'Inventory', (string) $id, 'Barang masuk ' . $noForm);
            return redirect('/gudang/history')->with('success', 'Transaksi barang masuk dihapus!');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Gagal menghapus transaksi: ' . $e->getMessage());
        }
    }

    public function editKeluar($id): Response
    {
        $transaction = GudangKeluar::with('details.barang')->findOrFail($id);

        return Inertia::render('Gudang/KeluarEdit', [
            'transaction' => $transaction,
            'items' => $this->daftarBarang(),
            'categories' => $this->daftarKategori(),
        ]);
    }

    public function updateKeluar(Request $request, $id)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $transaction = GudangKeluar::with('details')->findOrFail($id);

        $data = $request->validate($this->aturanUbah([
            'pengambil' => 'required|string',
            'lokasi_tujuan' => 'required|string',
            'jabatan' => 'nullable|string',
            'keperluan' => 'nullable|string',
            'proyek' => 'nullable|string',
            'disetujui' => 'nullable|string',
            'judul' => 'nullable|string',
        ]));

        DB::beginTransaction();
        try {
            $transaction->update([
                'judul' => $data['judul'] ?? '',
                'tanggal' => $data['tanggal'],
                'pengambil' => $data['pengambil'],
                'jabatan' => $data['jabatan'] ?? '',
                'lokasi_tujuan' => $data['lokasi_tujuan'],
                'keperluan' => $data['keperluan'] ?? '',
                'proyek' => $data['proyek'] ?? '',
                'disetujui' => $data['disetujui'] ?? '',
                'keterangan' => $data['keterangan'] ?? '',
            ]);

            $this->gantiDetail($transaction, 'keluar_id', $data['items'], false);
            $this->lampirkanFoto($transaction, $data['foto'] ?? []);

            DB::commit();
            // Jejak audit: satu baris per aksi tulis inventory.
            Aktivitas::catat('ubah', 'Inventory', (string) $transaction->id, 'Barang keluar ' . $transaction->no_form);
            return redirect('/gudang/history')->with('success', 'Transaksi barang keluar diperbarui!');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Gagal memperbarui transaksi: ' . $e->getMessage());
        }
    }

    public function deleteKeluar($id)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $transaction = GudangKeluar::with('details')->findOrFail($id);
        $noForm = $transaction->no_form;

        DB::beginTransaction();
        try {
            // Rincian dikosongkan: stok barang kembali seperti sebelum transaksi.
            $this->gantiDetail($transaction, 'keluar_id', [], false);
            $this->hapusSemuaFoto($transaction);
            $transaction->delete();

            DB::commit();
            // Jejak audit: satu baris per aksi tulis inventory.
            Aktivitas::catat('hapus', 'Inventory', (string) $id, 'Barang keluar ' . $noForm);
            return redirect('/gudang/history')->with('success', 'Transaksi barang keluar dihapus!');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Gagal menghapus transaksi: ' . $e->getMessage());
        }
    }

    // ------------------------------------------------------------------
    // Pembantu perbaikan transaksi gudang
    // ------------------------------------------------------------------

    /** Kategori form: bawaan modul + kategori kustom yang sudah ada di ledger. */
    private function daftarKategori(): array
    {
        $kustom = GudangBarang::distinct()->pluck('kategori')->all();

        return array_values(array_unique(array_merge(
            $this->defaultCategories,
            array_filter($kustom, fn ($k) => $k !== null && $k !== '')
        )));
    }

    /** Daftar barang untuk pilihan kategori/tipe pada halaman edit. */
    private function daftarBarang()
    {
        return GudangBarang::orderBy('kategori')->orderBy('tipe')
            ->get(['id', 'nama', 'kategori', 'tipe', 'stok', 'satuan']);
    }

    /** Aturan validasi bersama header + rincian + foto pada form edit. */
    private function aturanUbah(array $header): array
    {
        return array_merge($header, [
            'tanggal' => 'required|date',
            'keterangan' => 'nullable|string',
            'items' => 'present|array',
            'items.*.kategori' => 'nullable|string',
            'items.*.tipe' => 'nullable|string',
            'items.*.jumlah' => 'nullable|integer',
            'foto' => 'nullable|array',
            'foto.*.path' => 'nullable|string',
        ]);
    }

    /** Kunci pencocokan baris rincian dengan baris ledger: kategori + tipe. */
    private function kunciBarang(string $kategori, string $tipe): string
    {
        return trim($kategori) . '|' . trim($tipe);
    }

    /**
     * Kategori baris rincian: kolom ledger bila barang_id menunjuk barang,
     * kalau tidak dipotong dari nama_barang (data lama menyimpan "Kategori Tipe").
     */
    private function kategoriDetail($detail): string
    {
        $kategori = trim((string) ($detail->barang->kategori ?? ''));
        if ($kategori !== '') {
            return $kategori;
        }

        $nama = trim((string) $detail->nama_barang);
        $tipe = trim((string) $detail->tipe_barang);

        if ($tipe !== '' && str_ends_with($nama, $tipe)) {
            return rtrim(substr($nama, 0, -strlen($tipe)));
        }

        return $nama;
    }

    /**
     * Ganti rincian transaksi: sesuaikan stok barang dari selisih rincian lama vs
     * baru, lalu tulis ulang baris rinciannya.
     *
     * @param  bool  $naik  true untuk transaksi masuk (stok bertambah), false untuk keluar.
     */
    private function gantiDetail($header, string $kolomFk, array $items, bool $naik): void
    {
        $lama = [];
        foreach ($header->details as $detail) {
            $kunci = $this->kunciBarang($this->kategoriDetail($detail), (string) $detail->tipe_barang);
            $lama[$kunci] = ($lama[$kunci] ?? 0) + (int) $detail->jumlah;
        }

        $baris = [];
        $baru = [];
        foreach ($items as $item) {
            $kategori = trim((string) ($item['kategori'] ?? ''));
            $tipe = trim((string) ($item['tipe'] ?? ''));
            $jumlah = (int) ($item['jumlah'] ?? 0);

            if ($kategori === '' || $tipe === '' || $jumlah <= 0) {
                continue;
            }

            $kunci = $this->kunciBarang($kategori, $tipe);
            $baru[$kunci] = ($baru[$kunci] ?? 0) + $jumlah;
            $baris[$kunci] = ['kategori' => $kategori, 'tipe' => $tipe, 'jumlah' => $baru[$kunci]];
        }

        $this->sesuaikanStok($lama, $baru, $naik);

        $kelas = $naik ? GudangMasukDetail::class : GudangKeluarDetail::class;
        $kelas::where($kolomFk, $header->id)->delete();

        foreach ($baris as $bagian) {
            $barang = GudangBarang::where('kategori', $bagian['kategori'])
                ->where('tipe', $bagian['tipe'])
                ->first();

            $kelas::create([
                $kolomFk => $header->id,
                'barang_id' => $barang?->id ?? 0,
                'nama_barang' => $bagian['kategori'] . ' ' . $bagian['tipe'],
                'tipe_barang' => $bagian['tipe'],
                'jumlah' => $bagian['jumlah'],
                'satuan' => $barang?->satuan ?? 'Unit',
            ]);
        }
    }

    /**
     * Terapkan selisih rincian ke stok ledger.
     *
     * @param  array  $lama  map "kategori|tipe" => jumlah sebelum perubahan
     * @param  array  $baru  map "kategori|tipe" => jumlah sesudah perubahan
     */
    private function sesuaikanStok(array $lama, array $baru, bool $naik): void
    {
        foreach (array_unique(array_merge(array_keys($lama), array_keys($baru))) as $kunci) {
            $selisih = ($baru[$kunci] ?? 0) - ($lama[$kunci] ?? 0);
            if ($selisih === 0) {
                continue;
            }

            [$kategori, $tipe] = array_pad(explode('|', $kunci, 2), 2, '');

            $barang = GudangBarang::where('kategori', $kategori)->where('tipe', $tipe)->first();

            if (!$barang) {
                if ($selisih <= 0) {
                    continue;
                }

                GudangBarang::create([
                    'nama' => trim($kategori . ' ' . $tipe),
                    'kategori' => $kategori,
                    'tipe' => $tipe,
                    'stok' => $selisih,
                    'satuan' => 'Unit',
                    'min_stok' => 1,
                ]);
                continue;
            }

            $barang->stok = max(0, $barang->stok + ($naik ? $selisih : -$selisih));
            $barang->save();
        }
    }

    /**
     * Lampirkan foto baru dari unggahan sementara ke transaksi (media library +
     * kolom foto), seperti pada form transaksi baru.
     */
    private function lampirkanFoto($header, array $foto): void
    {
        $tersimpan = $header->foto
            ? array_values(array_filter(array_map('trim', explode(',', $header->foto))))
            : [];

        $adaBaru = false;
        foreach ($foto as $berkas) {
            $tempPath = is_array($berkas) ? ($berkas['path'] ?? null) : null;
            if (!$tempPath) {
                continue;
            }

            $penuh = storage_path('app/public/' . $tempPath);
            if (!is_file($penuh)) {
                continue;
            }

            $header->addMedia($penuh)->toMediaCollection('attachments');
            $nama = basename($penuh);
            if (!in_array($nama, $tersimpan, true)) {
                $tersimpan[] = $nama;
            }
            $adaBaru = true;
        }

        if ($adaBaru) {
            $header->update(['foto' => implode(',', $tersimpan)]);
        }
    }

    /** Hapus seluruh berkas foto transaksi: media library + berkas di public/uploads. */
    private function hapusSemuaFoto($header): void
    {
        foreach ($header->getMedia('attachments') as $media) {
            $media->delete();
        }

        if (!empty($header->foto)) {
            foreach (explode(',', $header->foto) as $nama) {
                GudangController::hapusBerkasGudang(trim($nama));
            }
        }

        $header->update(['foto' => null]);
    }

    /** Hapus satu berkas foto transaksi dari disk (dipakai juga oleh MediaController). */
    public static function hapusBerkasGudang(?string $nama): void
    {
        $nama = basename((string) $nama);
        if ($nama === '' || $nama === '.') {
            return;
        }

        $path = public_path('uploads/gudang/' . $nama);
        if (is_file($path)) {
            @unlink($path);
        }
    }
}
