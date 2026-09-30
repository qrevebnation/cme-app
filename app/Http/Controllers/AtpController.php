<?php

namespace App\Http\Controllers;

use App\Models\AtpPhoto;
use App\Models\AtpRecord;
use App\Models\AtpTemplate;
use App\Models\BalData;
use App\Models\BastpData;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use App\Http\Requests\StoreAtpRequest;
use App\Http\Requests\UpdateAtpRequest;
use App\Support\Aktivitas;
use App\Support\Peran;

class AtpController extends Controller
{
    /**
     * Batas tulis per baris: admin & project_manager bebas, peran lain hanya baris
     * ATP miliknya sendiri (created_by = pengguna login).
     */
    private function pastikanPemilik(AtpRecord $record): void
    {
        if (!Peran::bolehUbah($record)) {
            abort(403, 'Anda hanya dapat mengubah data ATP milik Anda sendiri.');
        }
    }

    private $defaultTemplate = [
        ['ty' => 'sec', 'tx' => 'I. PONDASI BETON'],
        ['ty' => 'sub', 'tx' => 'A. Dimensi & Geometri'],
        ['ty' => 'it', 'd' => ['Panjang total pondasi', 'Sesuai gambar ±3m', 'Roll meter', '', 0, 0, 0, ''], '_id' => 'def_0'],
        ['ty' => 'it', 'd' => ['Lebar pondasi', 'Sesuai gambar, ±2m', 'Meteran', '', 0, 0, 0, ''], '_id' => 'def_1'],
        ['ty' => 'it', 'd' => ['Tinggi pondasi', '50-60cm', 'Roll meter', '', 0, 0, 0, ''], '_id' => 'def_2'],
        ['ty' => 'it', 'd' => ['Kerataan permukaan (waterpass)', '±3mm', 'Waterpass', '', 0, 0, 0, ''], '_id' => 'def_3'],
        ['ty' => 'sec', 'tx' => 'II. KERANGKENG (Atap & Las)'],
        ['ty' => 'it', 'd' => ['Profil kolom (hollow)', '40×40×5mm', 'Jangka sorong', '', 0, 0, 0, ''], '_id' => 'def_14'],
        ['ty' => 'it', 'd' => ['Pintu dapat dibuka', 'Buka tutup sempurna', 'Uji 5x', '', 0, 0, 0, ''], '_id' => 'def_23'],
        ['ty' => 'sec', 'tx' => 'III. GROUNDING'],
        ['ty' => 'it', 'd' => ['Tahanan grounding (earth tester)', '≤5Ω', 'Earth Tester', '', 0, 0, 0, ''], '_id' => 'def_38'],
        ['ty' => 'sec', 'tx' => 'IV. PANEL ATS / AMF'],
        ['ty' => 'it', 'd' => ['ATS 4P 100A (transfer)', 'Lancar', 'Lever manual', '', 0, 0, 0, ''], '_id' => 'def_42'],
        ['ty' => 'sec', 'tx' => 'V. GENSET'],
        ['ty' => 'it', 'd' => ['Start manual (starter OK)', 'Engine running', 'Start', '', 0, 0, 0, ''], '_id' => 'def_68']
    ];

    /**
     * Papan status ATP: baris dikelompokkan per putusan agar tindak lanjut
     * terbaca sekali lihat. Hanya baca — putusan dihitung dari checklist
     * (hasil_json.items) saat simpan, bukan dipindah manual.
     */
    public function board(Request $request): Response
    {
        $query = AtpRecord::query();
        // admin & project_manager melihat semua; peran lain (termasuk technician) hanya baris miliknya.
        if (!Peran::pengelola()) {
            $query->where('created_by', $request->session()->get('user_id'));
        }

        $records = $query
            ->orderBy('tanggal', 'desc')
            ->orderBy('id', 'desc')
            ->get(['id', 'nama_site', 'tanggal', 'region', 'no_po', 'verdict', 'hasil_json']);

        // Empat kolom tetap, urut dari yang paling butuh tindakan.
        $kolom = [
            'MENUNGGU' => [],
            'ACCEPT' => [],
            'CONDITIONAL' => [],
            'REJECT' => [],
        ];

        foreach ($records as $record) {
            $hasil = is_array($record->hasil_json) ? $record->hasil_json : [];
            $items = is_array($hasil['items'] ?? null) ? $hasil['items'] : [];
            $namaItem = is_array($hasil['itemNames'] ?? null) ? $hasil['itemNames'] : [];

            $kolom[$this->kelompokPutusan($record->verdict)][] = [
                'id' => $record->id,
                'nama_site' => $record->nama_site,
                'tanggal' => $record->tanggal,
                'region' => $record->region,
                'no_po' => $record->no_po,
                'verdict' => $record->verdict,
                // Jumlah item dinilai dihitung dari hasil_json, tanpa query tambahan.
                'dinilai' => count(array_filter($items, fn ($status) => $status !== null && $status !== '')),
                'total' => max(count($items), count($namaItem)),
            ];
        }

        return Inertia::render('Atp/Board', [
            'kolom' => array_map(
                fn ($kunci, $kartu) => ['kunci' => $kunci, 'jumlah' => count($kartu), 'kartu' => $kartu],
                array_keys($kolom),
                array_values($kolom),
            ),
        ]);
    }

    /** Putusan baris dipetakan ke satu dari empat kolom papan; "NOT ACCEPT" ikut REJECT. */
    private function kelompokPutusan(?string $verdict): string
    {
        return match (strtoupper(trim((string) $verdict))) {
            'ACCEPT' => 'ACCEPT',
            'CONDITIONAL' => 'CONDITIONAL',
            'REJECT', 'NOT ACCEPT' => 'REJECT',
            default => 'MENUNGGU',
        };
    }

    public function create(Request $request): Response
    {
        $templates = AtpTemplate::orderBy('title', 'asc')->get()->map(function ($t) {
            $formattedFields = [];
            if (is_array($t->data_json)) {
                foreach ($t->data_json as $idx => $row) {
                    if (isset($row['label'])) {
                        $formattedFields[] = [
                            'id' => $row['id'] ?? ('field_' . $idx),
                            'label' => $row['label'],
                            'type' => $row['type'] ?? 'text',
                            'standard' => $row['standard'] ?? '',
                            'tool' => $row['tool'] ?? '',
                            'required' => (bool) ($row['required'] ?? true),
                            'options' => $row['options'] ?? [],
                        ];
                    } elseif (isset($row['ty']) && in_array($row['ty'], ['sec', 'sub'], true)) {
                        // Baris kategori (sec) dan sub-kategori (sub) dari template lama
                        // ikut diteruskan supaya form ATP tetap mengelompokkan parameter.
                        $formattedFields[] = [
                            'id' => 'judul_' . $idx,
                            'jenis' => $row['ty'] === 'sec' ? 'seksi' : 'sub',
                            'label' => $row['tx'] ?? '',
                            'type' => 'judul',
                            'standard' => '',
                            'tool' => '',
                            'required' => false,
                            'options' => [],
                        ];
                    } elseif (isset($row['ty']) && $row['ty'] === 'it') {
                        $formattedFields[] = [
                            'id' => $row['_id'] ?? "item_{$idx}",
                            'label' => $row['d'][0] ?? '',
                            'standard' => $row['d'][1] ?? '',
                            'tool' => $row['d'][2] ?? '',
                            'type' => 'text',
                            'required' => true,
                            'options' => [],
                        ];
                    }
                }
            }
            return [
                'id' => $t->id,
                'title' => $t->title,
                'fields' => $formattedFields,
            ];
        });

        return Inertia::render('Atp/New', [
            'defaultTemplate' => $this->defaultTemplate,
            'templates' => $templates,
        ]);
    }

    public function store(StoreAtpRequest $request)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $userId = $request->session()->get('user_id');

        DB::beginTransaction();
        try {
            $record = AtpRecord::create([
                // Template yang dipilih dikaitkan ke record; kosong berarti template bawaan.
                'template_id' => $request->filled('template_id') ? (int) $request->input('template_id') : null,
                'nama_site' => $request->input('nama_site'),
                'tanggal' => $request->input('tanggal'),
                'region' => $request->input('region') ?? '',
                'latitude' => $request->input('latitude') ?? '',
                'longitude' => $request->input('longitude') ?? '',
                'no_po' => $request->input('no_po'),
                'hasil_json' => $request->input('hasil_json', []),
                'verdict' => $request->input('verdict') ?? '',
                'verdict_notes' => $request->input('verdict_notes'),
                'approval_json' => $request->input('approval_json', []),
                'bastp_json' => $request->input('bastp_json'),
                'created_by' => $userId,
            ]);

            // Handle uploads
            if ($request->has('fotos_item')) {
                foreach ($request->input('fotos_item') as $itemId => $fileList) {
                    foreach ($fileList as $idx => $fileData) {
                        $tempPath = $fileData['path'] ?? null;
                        if (!$tempPath) continue;

                        $fullTempPath = storage_path('app/public/' . $tempPath);
                        if (file_exists($fullTempPath)) {
                            $atpPhoto = AtpPhoto::create([
                                'atp_id' => $record->id,
                                'item_id' => $itemId,
                                'file_path' => basename($fullTempPath),
                            ]);

                            $atpPhoto->addMedia($fullTempPath)
                                     ->toMediaCollection('photo');
                        }
                    }
                }
            }

            DB::commit();
            // Jejak audit: satu baris per aksi tulis.
            Aktivitas::catat('tambah', 'ATP', (string) $record->id, 'Site ' . $record->nama_site);
            return redirect('/atp')->with('success', 'Data ATP berhasil disimpan!');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Gagal menyimpan ATP: ' . $e->getMessage());
        }
    }

    public function detail(Request $request, $id): Response
    {
        $record = AtpRecord::with(['photos', 'bal', 'bastp'])->findOrFail($id);
        return Inertia::render('Atp/Detail', [
            'record' => $record,
        ]);
    }

    public function edit(Request $request, $id): Response
    {
        $record = AtpRecord::with('photos')->findOrFail($id);
        $this->pastikanPemilik($record);

        // Foto tersimpan dikelompokkan per item checklist supaya bisa dihapus
        // langsung dari halaman edit (lihat MediaController::hapusFoto).
        $fotosItem = [];
        foreach ($record->photos as $photo) {
            $fotosItem[$photo->item_id][] = [
                'id' => $photo->id,
                'path' => $photo->file_path,
                'url' => $photo->file_url,
                'name' => $photo->file_path,
                'isExisting' => true,
            ];
        }

        return Inertia::render('Atp/Edit', [
            'record' => $record,
            'fotos_item' => $fotosItem,
        ]);
    }

    public function update(UpdateAtpRequest $request, $id)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $record = AtpRecord::findOrFail($id);
        $this->pastikanPemilik($record);

        DB::beginTransaction();
        try {
            $record->update([
                'nama_site' => $request->input('nama_site'),
                'tanggal' => $request->input('tanggal'),
                'region' => $request->input('region') ?? '',
                'latitude' => $request->input('latitude') ?? '',
                'longitude' => $request->input('longitude') ?? '',
                'no_po' => $request->input('no_po'),
                'hasil_json' => $request->input('hasil_json', []),
                'verdict' => $request->input('verdict') ?? '',
                'verdict_notes' => $request->input('verdict_notes'),
                'approval_json' => $request->input('approval_json', []),
                // Halaman edit tidak mengirim template; nilai lama dipertahankan
                // agar template_id tidak di-NULL-kan saat menyimpan perubahan.
                'template_id' => $request->filled('template_id') ? $request->input('template_id') : $record->template_id,
            ]);

            // Handle uploads
            if ($request->has('fotos_item')) {
                foreach ($request->input('fotos_item') as $itemId => $fileList) {
                    foreach ($fileList as $idx => $fileData) {
                        $tempPath = $fileData['path'] ?? null;
                        if (!$tempPath) continue;

                        $fullTempPath = storage_path('app/public/' . $tempPath);
                        if (file_exists($fullTempPath)) {
                            $atpPhoto = AtpPhoto::create([
                                'atp_id' => $record->id,
                                'item_id' => $itemId,
                                'file_path' => basename($fullTempPath),
                            ]);

                            $atpPhoto->addMedia($fullTempPath)
                                     ->toMediaCollection('photo');
                        }
                    }
                }
            }

            DB::commit();
            // Jejak audit: satu baris per aksi tulis.
            Aktivitas::catat('ubah', 'ATP', (string) $record->id, 'Site ' . $record->nama_site);
            return redirect('/atp/' . $record->id)->with('success', 'Data ATP berhasil diupdate!');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Gagal update ATP: ' . $e->getMessage());
        }
    }

    public function delete(Request $request, $id)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $record = AtpRecord::findOrFail($id);
        $this->pastikanPemilik($record);
        $namaSite = $record->nama_site;
        $record->delete();

        // Jejak audit: satu baris per aksi tulis.
        Aktivitas::catat('hapus', 'ATP', (string) $id, 'Site ' . $namaSite);

        return redirect('/atp')->with('success', 'ATP berhasil dihapus!');
    }

    public function print(Request $request, $id)
    {
        $record = AtpRecord::findOrFail($id);

        // Kontrak popup cetak: detail membuka modal dari ?cetak= (lihat Detail.jsx),
        // bukan pindah ke halaman /print penuh.
        return redirect('/atp/'.$record->id.'?cetak=atp_print');
    }

    // BAL report handlers
    public function printBal(Request $request, $id)
    {
        $record = AtpRecord::findOrFail($id);

        return redirect('/atp/'.$record->id.'?cetak=atp_bal');
    }

    public function saveBal(Request $request, $id)
    {
        $record = AtpRecord::findOrFail($id);
        $this->pastikanPemilik($record);

        $request->validate([
            'project' => 'required|string|max:255',
            'no_po' => 'required|string|max:255',
            'tanggal_mulai' => 'required|date',
            'tanggal' => 'required|date',
            'pelaksana' => 'required|string|max:255',
            'lokasi' => 'required|string|max:255',
            'hasil' => 'required|string|max:255',
            'pihak1' => 'required|string|max:255',
            'pihak2' => 'required|string|max:255',
            'nama1' => 'required|string|max:255',
            'jabatan1' => 'required|string|max:255',
            'nama2' => 'required|string|max:255',
            'jabatan2' => 'required|string|max:255',
        ]);

        $bal = BalData::updateOrCreate(
            ['atp_id' => $record->id],
            $request->only([
                'project', 'no_po', 'tanggal_mulai', 'tanggal',
                'pelaksana', 'lokasi', 'hasil', 'pihak1', 'pihak2',
                'nama1', 'jabatan1', 'nama2', 'jabatan2'
            ])
        );

        // Jejak audit: satu baris per aksi tulis.
        Aktivitas::catat('ubah', 'ATP', (string) $record->id, 'BAL site ' . $record->nama_site);

        return redirect('/atp/'.$record->id.'?cetak=atp_bal')->with('success', 'Data Berita Acara Lapangan (BAL) berhasil disimpan!');
    }

    public function deleteBal($id)
    {
        $record = AtpRecord::findOrFail($id);
        $this->pastikanPemilik($record);
        if ($record->bal) {
            $record->bal->delete();
        }

        // Jejak audit: satu baris per aksi tulis.
        Aktivitas::catat('hapus', 'ATP', (string) $record->id, 'BAL site ' . $record->nama_site);

        return redirect('/atp/' . $record->id)->with('success', 'Data Berita Acara Lapangan (BAL) berhasil dihapus!');
    }

    // BASTP report handlers
    public function printBastp(Request $request, $id)
    {
        $record = AtpRecord::findOrFail($id);

        return redirect('/atp/'.$record->id.'?cetak=atp_bastp');
    }

    public function saveBastp(Request $request, $id)
    {
        $record = AtpRecord::findOrFail($id);
        $this->pastikanPemilik($record);

        $request->validate([
            'p1_nama' => 'required|string|max:255',
            'p1_alamat' => 'required|string',
            'p2_nama' => 'required|string|max:255',
            'p2_jabatan' => 'required|string|max:255',
            'p2_alamat' => 'required|string',
            'pekerjaan' => 'required|string|max:255',
            'mengetahui1' => 'required|string|max:255',
            'mengetahui2' => 'required|string|max:255',
        ]);

        $bastp = BastpData::updateOrCreate(
            ['atp_id' => $record->id],
            $request->only([
                'p1_nama', 'p1_alamat', 'p2_nama', 'p2_jabatan', 'p2_alamat',
                'pekerjaan', 'mengetahui1', 'mengetahui2', 'photos'
            ])
        );

        // Jejak audit: satu baris per aksi tulis.
        Aktivitas::catat('ubah', 'ATP', (string) $record->id, 'BASTP site ' . $record->nama_site);

        return redirect('/atp/'.$record->id.'?cetak=atp_bastp')->with('success', 'Data BASTP berhasil disimpan!');
    }

    public function deleteBastp($id)
    {
        $record = AtpRecord::findOrFail($id);
        $this->pastikanPemilik($record);
        if ($record->bastp) {
            $record->bastp->delete();
        }

        // Jejak audit: satu baris per aksi tulis.
        Aktivitas::catat('hapus', 'ATP', (string) $record->id, 'BASTP site ' . $record->nama_site);

        return redirect('/atp/' . $record->id)->with('success', 'Data BASTP berhasil dihapus!');
    }

}
