<?php

namespace App\Http\Controllers;

use App\Models\Survey;
use App\Models\SurveyItem;
use App\Models\SurveyPhoto;
use App\Models\SurveyTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use App\Http\Requests\StoreSurveyRequest;
use App\Http\Requests\UpdateSurveyRequest;
use App\Support\Aktivitas;
use App\Support\Peran;

class SurveyController extends Controller
{
    private $defaultCategories = [
        'KELISTRIKAN' => [
            ['1.1', 'Sumber Listrik PLN', 'select', ['1 Phase', '3 Phase']],
            ['1.2', 'MCB Utama', 'text', ''],
            ['1.3', 'Kabel Power', 'text', ''],
            ['1.4', 'Grounding Pusat', 'select', ['Tersedia', 'Tidak']],
        ],
        'GENSET & ATS' => [
            ['2.1', 'ATS (Automatic Transfer Switch)', 'select', ['AMF (dengan module)', 'Manual', 'Timer']],
            ['2.2', 'Genset', 'select', ['Sudah ada', 'Belum ada']],
        ],
        'INFRASTRUKTUR FISIK' => [
            ['3.1', 'Pondasi / Landasan', 'select', ['3m x 2m', '2m x 3m', 'Lainnya']],
            ['3.2', 'Pintu Kerangkeng (Cage Door)', 'select', ['2 pintu', '1 pintu']],
            ['3.3', 'Dinding & Lantai', 'select', ['Baik', 'Retak', 'Lembab', 'Perlu perbaikan']],
            ['3.4', 'Kabel Tray / Duct', 'select', ['Baik', 'Penuh', 'Rusak', 'Perlu tambahan']],
        ],
        'RACK & DISTRIBUSI' => [
            ['4.1', 'ACPDB Rack ODC', 'select', ['Full (penuh)', 'Masih ada space']],
            ['4.2', 'Space Grounding Busbar', 'text', ''],
            ['4.3', 'Sisa PDU (Power Distribution Unit)', 'text', ''],
            ['4.4', 'Rack 1', 'select', ['Ada', 'Tidak']],
            ['4.5', 'Space Rack 1 - Front', 'select', ['Tersedia', 'Penuh']],
            ['4.6', 'Space Rack 1 - Back', 'select', ['Tersedia', 'Penuh']],
            ['4.7', 'Rack 2', 'select', ['Ada', 'Tidak']],
            ['4.8', 'Space Rack 2 - Front', 'select', ['Tersedia', 'Penuh']],
            ['4.9', 'Space Rack 2 - Back', 'select', ['Tersedia', 'Penuh']],
        ],
        'LINGKUNGAN & KEAMANAN' => [
            ['5.1', 'Pendinginan (Cooling)', 'multi', ['Unit 1', 'Unit 2']],
            ['5.2', 'Kondisi Atap', 'select', ['Baik', 'Bocor', 'Perlu perbaikan']],
            ['5.3', 'Suhu Ambient / Sekitar', 'text', ''],
            ['5.4', 'Kebersihan Ruangan', 'select', ['Bersih', 'Cukup', 'Kotor']],
        ],
    ];



    /**
     * Susun kategori_json (baris berurutan) menjadi struktur 3 tingkat untuk form:
     * kategori -> sub-kategori -> item. Baris bertipe "sub" membuka kelompok baru;
     * item sesudahnya masuk ke kelompok itu, item sebelum sub tetap di tingkat kategori.
     * Template lama tanpa baris "sub" otomatis terbaca sebagai 2 tingkat.
     */
    private function susunKategori(array $kategoriJson): array
    {
        $daftar = [];

        foreach ($kategoriJson as $namaKategori => $baris) {
            $langsung = [];
            $subs = [];

            foreach ((array) $baris as $index => $row) {
                if (!is_array($row)) {
                    continue;
                }

                $nama = (string) ($row[1] ?? '');

                if (($row[2] ?? '') === 'sub') {
                    $subs[] = ['nama' => $nama, 'items' => []];
                    continue;
                }

                $item = [
                    // Kunci stabil: dipakai form sebagai kunci state item sekaligus kunci foto.
                    'kunci' => $namaKategori . '_' . $index,
                    'nomor' => (string) ($row[0] ?? ''),
                    'nama' => $nama,
                    'type' => (string) ($row[2] ?? 'text'),
                    'options' => is_array($row[3] ?? null) ? array_values($row[3]) : [],
                    'sub_kategori' => empty($subs) ? null : $subs[count($subs) - 1]['nama'],
                ];

                if (empty($subs)) {
                    $langsung[] = $item;
                } else {
                    $subs[count($subs) - 1]['items'][] = $item;
                }
            }

            $daftar[] = [
                'nama' => (string) $namaKategori,
                'items' => $langsung,
                'subs' => $subs,
                'jumlah' => count($langsung) + array_sum(array_map(fn ($sub) => count($sub['items']), $subs)),
            ];
        }

        return $daftar;
    }

    /**
     * Batas tulis per baris: admin & project_manager bebas, peran lain hanya baris
     * miliknya sendiri (created_by = pengguna login).
     */
    private function pastikanPemilik(Survey $survey): void
    {
        if (!Peran::bolehUbah($survey)) {
            abort(403, 'Anda hanya dapat mengubah data survey milik Anda sendiri.');
        }
    }

    public function create(Request $request): Response
    {
        // Template checklist dipilih lewat URL (?template=ID) supaya daftar item
        // dibangun di server; tanpa pilihan, memakai template bawaan aplikasi.
        $templateId = (int) $request->query('template', 0);
        $terpilih = $templateId > 0 ? SurveyTemplate::find($templateId) : null;

        $kategori = $this->defaultCategories;
        if ($terpilih) {
            $raw = $terpilih->kategori_json;
            $kategori = is_array($raw) ? $raw : (json_decode((string) $raw, true) ?: $this->defaultCategories);
        }

        return Inertia::render('Survey/New', [
            'defaultTemplate' => $this->susunKategori($kategori),
            'selectedTemplateId' => $terpilih?->id,
            'templates' => SurveyTemplate::orderBy('created_at', 'desc')
                ->get(['id', 'title'])
                ->map(fn ($tpl) => [
                    'id' => $tpl->id,
                    'title' => $tpl->title,
                ]),
        ]);
    }

    public function store(StoreSurveyRequest $request)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $userId = $request->session()->get('user_id');

        DB::beginTransaction();
        try {
            $survey = Survey::create([
                'nama_site' => $request->input('nama_site'),
                'tanggal_survey' => $request->input('tanggal_survey'),
                'nama_surveyor' => $request->input('nama_surveyor'),
                'lokasi' => $request->input('lokasi') ?? '',
                'latitude' => $request->input('latitude') ?? '',
                'longitude' => $request->input('longitude') ?? '',
                'catatan_tambahan' => $request->input('catatan_tambahan'),
                'created_by' => $userId,
            ]);

            $items = $request->input('items', []);
            $itemIdMap = [];

            foreach ($items as $key => $item) {
                $status = $item['status'] ?? '';
                $kondisi = $item['kondisi'] ?? '';
                if (isset($item['kondisi_1_jenis']) || isset($item['kondisi_1_kondisi'])) {
                    $parts = [];
                    if (!empty($item['kondisi_1_jenis']) || !empty($item['kondisi_1_kondisi'])) {
                        $parts[] = '1. ' . ($item['kondisi_1_jenis'] ?? '-') . ($item['kondisi_1_kondisi'] ? ' [' . $item['kondisi_1_kondisi'] . ']' : '');
                    }
                    if (!empty($item['kondisi_2_jenis']) || !empty($item['kondisi_2_kondisi'])) {
                        $parts[] = '2. ' . ($item['kondisi_2_jenis'] ?? '-') . ($item['kondisi_2_kondisi'] ? ' [' . $item['kondisi_2_kondisi'] . ']' : '');
                    }
                    $kondisi = implode("\n", $parts);
                }

                $subKategori = trim((string) ($item['sub_kategori'] ?? ''));

                $surveyItem = SurveyItem::create([
                    'survey_id' => $survey->id,
                    'kategori' => $item['kategori'],
                    'sub_kategori' => $subKategori !== '' ? $subKategori : null,
                    'nomor_item' => $item['nomor'],
                    'nama_item' => $item['nama'],
                    'status_check' => $status,
                    'kondisi_nilai' => $kondisi,
                    'catatan' => $item['catatan'] ?? '',
                ]);
                $itemIdMap[$key] = $surveyItem->id;
            }

            // Handle files
            if ($request->has('photos')) {
                foreach ($request->input('photos') as $key => $fileList) {
                    $itemId = $itemIdMap[$key] ?? null;
                    if (!$itemId) continue;

                    foreach ($fileList as $idx => $fileData) {
                        $tempPath = $fileData['path'] ?? null;
                        if (!$tempPath) continue;

                        $fullTempPath = storage_path('app/public/' . $tempPath);
                        if (file_exists($fullTempPath)) {
                            $surveyPhoto = SurveyPhoto::create([
                                'survey_id' => $survey->id,
                                'item_id' => $itemId,
                                'file_path' => basename($fullTempPath),
                            ]);

                            $surveyPhoto->addMedia($fullTempPath)
                                        ->toMediaCollection('photo');
                        }
                    }
                }
            }

            DB::commit();
            // Jejak audit: satu baris per aksi tulis, memakai nama site sebagai keterangan.
            Aktivitas::catat('tambah', 'Survey', (string) $survey->id, 'Site ' . $survey->nama_site);
            return redirect('/survey')->with('success', 'Data survey ODC berhasil disimpan!');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Gagal menyimpan data: ' . $e->getMessage());
        }
    }

    public function detail(Request $request, $id): Response
    {
        $survey = Survey::with(['items', 'photos'])->findOrFail($id);
        return Inertia::render('Survey/Detail', [
            'survey' => $survey,
        ]);
    }

    public function edit(Request $request, $id)
    {
        $survey = Survey::with(['items', 'photos'])->findOrFail($id);
        $this->pastikanPemilik($survey);

        return Inertia::render('Survey/Edit', [
            'survey' => $survey,
            'defaultTemplate' => $this->susunKategori($this->defaultCategories),
        ]);
    }

    public function update(UpdateSurveyRequest $request, $id)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $survey = Survey::findOrFail($id);
        $this->pastikanPemilik($survey);

        DB::beginTransaction();
        try {
            // Only update fields that are present in the request
            $updateData = [];
            if ($request->has('nama_site')) $updateData['nama_site'] = $request->input('nama_site');
            if ($request->has('tanggal_survey')) $updateData['tanggal_survey'] = $request->input('tanggal_survey');
            if ($request->has('nama_surveyor')) $updateData['nama_surveyor'] = $request->input('nama_surveyor');
            if ($request->has('lokasi')) $updateData['lokasi'] = $request->input('lokasi') ?? '';
            if ($request->has('latitude')) $updateData['latitude'] = $request->input('latitude') ?? '';
            if ($request->has('longitude')) $updateData['longitude'] = $request->input('longitude') ?? '';
            if ($request->has('catatan_tambahan')) $updateData['catatan_tambahan'] = $request->input('catatan_tambahan');

            if (!empty($updateData)) {
                $survey->update($updateData);
            }

            // Only update submitted checklist items
            $items = $request->input('items', []);
            foreach ($items as $nomorItem => $item) {
                $ri = SurveyItem::where('survey_id', $survey->id)->where('nomor_item', $nomorItem)->first();
                if (!$ri) continue;

                $itemUpdate = [];
                if (isset($item['status'])) $itemUpdate['status_check'] = $item['status'];
                if (isset($item['kondisi'])) $itemUpdate['kondisi_nilai'] = $item['kondisi'];
                if (isset($item['catatan'])) $itemUpdate['catatan'] = $item['catatan'];

                // Sub-kategori ikut diperbarui bila form mengirimkannya; item tanpa sub disimpan sebagai NULL.
                if (array_key_exists('sub_kategori', $item)) {
                    $subKategori = trim((string) ($item['sub_kategori'] ?? ''));
                    $itemUpdate['sub_kategori'] = $subKategori !== '' ? $subKategori : null;
                }

                if (!empty($itemUpdate)) {
                    $ri->update($itemUpdate);
                }
            }

            // Handle deleted photos
            $deletedPhotoIds = $request->input('deleted_photo_ids', []);
            if (!empty($deletedPhotoIds)) {
                foreach ($deletedPhotoIds as $photoId) {
                    $photo = SurveyPhoto::where('survey_id', $survey->id)->find($photoId);
                    if ($photo) {
                        $photo->delete(); // Spatie MediaLibrary handles local file removal automatically
                    }
                }
            }

            // Handle new photo uploads
            if ($request->has('photos')) {
                foreach ($request->input('photos') as $nomorItem => $fileList) {
                    $ri = SurveyItem::where('survey_id', $survey->id)->where('nomor_item', $nomorItem)->first();
                    if (!$ri) continue;

                    foreach ($fileList as $idx => $fileData) {
                        // Skip existing images
                        if (!empty($fileData['isExisting'])) {
                            continue;
                        }

                        $tempPath = $fileData['path'] ?? null;
                        if (!$tempPath) continue;

                        $fullTempPath = storage_path('app/public/' . $tempPath);
                        if (file_exists($fullTempPath)) {
                            $surveyPhoto = SurveyPhoto::create([
                                'survey_id' => $survey->id,
                                'item_id' => $ri->id,
                                'file_path' => basename($fullTempPath),
                            ]);

                            $surveyPhoto->addMedia($fullTempPath)
                                        ->toMediaCollection('photo');
                        }
                    }
                }
            }

            DB::commit();
            // Jejak audit: satu baris per aksi tulis, memakai nama site sebagai keterangan.
            Aktivitas::catat('ubah', 'Survey', (string) $survey->id, 'Site ' . $survey->nama_site);
            return redirect('/survey/' . $survey->id)->with('success', 'Survey ODC berhasil diupdate!');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Gagal update survey: ' . $e->getMessage());
        }
    }

    public function delete(Request $request, $id)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $survey = Survey::findOrFail($id);
        $this->pastikanPemilik($survey);
        $namaSite = $survey->nama_site;
        $survey->delete(); // Cascades deletes survey_items & survey_photos via DB foreign keys

        // Jejak audit: satu baris per aksi tulis, memakai nama site sebagai keterangan.
        Aktivitas::catat('hapus', 'Survey', (string) $id, 'Site ' . $namaSite);

        return redirect('/survey')->with('success', 'Data survey ODC berhasil dihapus!');
    }

    public function print(Request $request, $id)
    {
        $survey = Survey::findOrFail($id);

        // Kontrak popup cetak: detail membuka modal dari ?cetak= (lihat Detail.jsx),
        // bukan pindah ke halaman /print penuh.
        return redirect('/survey/'.$survey->id.'?cetak=print_survey');
    }

}
