<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSurveyTemplateRequest;
use App\Http\Requests\UpdateSurveyTemplateRequest;
use App\Models\SurveyTemplate;
use App\Support\Aktivitas;
use App\Support\Peran;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SurveyTemplateController extends Controller
{
    public function index(Request $request): Response
    {
        $userId = $request->session()->get('user_id');

        $templates = SurveyTemplate::with(['creator'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function (SurveyTemplate $tpl) {
                return [
                    'id' => $tpl->id,
                    'title' => $tpl->title,
                    'categories_count' => $tpl->categories_count,
                    'items_count' => $tpl->items_count,
                    'categories' => is_array($tpl->kategori_json) ? array_keys($tpl->kategori_json) : [],
                    'created_by' => $tpl->created_by,
                    'creator_name' => $tpl->creator ? $tpl->creator->username : 'System',
                    'created_at' => $tpl->created_at ? $tpl->created_at->format('Y-m-d H:i') : '-',
                    'updated_at' => $tpl->updated_at ? $tpl->updated_at->format('Y-m-d H:i') : '-',
                ];
            });

        $stats = [
            'total' => $templates->count(),
            'mine' => $templates->where('created_by', $userId)->count(),
            'total_categories' => $templates->sum('categories_count'),
            'total_items' => $templates->sum('items_count'),
        ];

        return Inertia::render('SurveyTemplate/Index', [
            'templates' => $templates,
            'stats' => $stats,
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('SurveyTemplate/Create', [
            'initialCategories' => [
                [
                    'name' => 'KELISTRIKAN',
                    'items' => [
                        ['nomor' => '1.1', 'nama' => 'Sumber Listrik PLN', 'tipe' => 'select', 'opsi' => ['1 Phase', '3 Phase']],
                        ['nomor' => '1.2', 'nama' => 'MCB Utama', 'tipe' => 'text', 'opsi' => []],
                    ],
                ],
            ],
        ]);
    }

    public function store(StoreSurveyTemplateRequest $request)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $userId = $request->session()->get('user_id');

        DB::beginTransaction();
        try {
            SurveyTemplate::create([
                'title' => trim($request->input('title')),
                'kategori_json' => $this->buildKategori($request->input('categories', [])),
                'created_by' => $userId,
            ]);

            DB::commit();

            // Jejak audit: satu baris per aksi tulis.
            Aktivitas::catat('tambah', 'Template Survey', null, 'Template ' . trim($request->input('title')));

            return redirect('/survey-template')->with('success', 'Template survey berhasil dibuat dan siap digunakan.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Gagal menyimpan template: ' . $e->getMessage())->withInput();
        }
    }

    public function edit(Request $request, $id): Response
    {
        $template = SurveyTemplate::findOrFail($id);

        $categories = [];
        if (is_array($template->kategori_json)) {
            foreach ($template->kategori_json as $name => $items) {
                $mapped = [];
                foreach ((array) $items as $item) {
                    // Baris "sub" tetap dibawa apa adanya supaya editor bisa
                    // merendernya sebagai sub-kategori; tipe lain yang dikenal
                    // (multi/photo) juga tidak diubah agar data lama utuh.
                    $tipe = (string) ($item[2] ?? 'text');

                    $mapped[] = [
                        'nomor' => (string) ($item[0] ?? ''),
                        'nama' => (string) ($item[1] ?? ''),
                        'tipe' => in_array($tipe, ['select', 'multi', 'photo', 'sub'], true) ? $tipe : 'text',
                        'opsi' => is_array($item[3] ?? null) ? array_values($item[3]) : [],
                    ];
                }

                $categories[] = [
                    'name' => (string) $name,
                    'items' => $mapped,
                ];
            }
        }

        return Inertia::render('SurveyTemplate/Edit', [
            'template' => [
                'id' => $template->id,
                'title' => $template->title,
                'categories' => $categories,
            ],
        ]);
    }

    public function update(UpdateSurveyTemplateRequest $request, $id)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $template = SurveyTemplate::findOrFail($id);

        DB::beginTransaction();
        try {
            $template->update([
                'title' => trim($request->input('title')),
                'kategori_json' => $this->buildKategori($request->input('categories', [])),
            ]);

            DB::commit();

            // Jejak audit: satu baris per aksi tulis.
            Aktivitas::catat('ubah', 'Template Survey', (string) $template->id, 'Template ' . trim($request->input('title')));

            return redirect('/survey-template')->with('success', 'Template survey berhasil diperbarui.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Gagal memperbarui template: ' . $e->getMessage())->withInput();
        }
    }

    public function delete(Request $request, $id)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $template = SurveyTemplate::findOrFail($id);

        try {
            $judul = $template->title;
            $template->delete();

            // Jejak audit: satu baris per aksi tulis.
            Aktivitas::catat('hapus', 'Template Survey', (string) $id, 'Template ' . $judul);

            return redirect('/survey-template')->with('success', 'Template survey berhasil dihapus.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal menghapus template: ' . $e->getMessage());
        }
    }

    /**
     * Ubah payload editor menjadi bentuk kategori_json aplikasi lama:
     * {"NAMA KATEGORI": [["1.1", "Nama Item", "select", ["opsi A"]], ...]}
     *
     * Baris sub-kategori ditulis sebagai ["", "Nama Sub", "sub"]; item sesudahnya
     * dianggap berada di bawah sub itu (mengikuti urutan, tanpa tambahan kunci).
     */
    private function buildKategori(array $categories): array
    {
        $kategori = [];

        foreach ($categories as $kategori_index => $category) {
            $name = trim((string) ($category['name'] ?? ''));
            if ($name === '') {
                continue;
            }

            $rows = [];
            $nomor_item = 0;

            foreach ((array) ($category['items'] ?? []) as $item) {
                $nama = trim((string) ($item['nama'] ?? ''));
                if ($nama === '') {
                    continue;
                }

                $tipe = (string) ($item['tipe'] ?? 'text');

                if ($tipe === 'sub') {
                    // Baris sub-kategori: nomor dan opsi tidak dipakai.
                    $rows[] = ['', $nama, 'sub'];
                    continue;
                }

                if (!in_array($tipe, ['text', 'select', 'multi', 'photo'], true)) {
                    $tipe = 'text';
                }

                // Nomor cadangan hanya menghitung item sungguhan, bukan baris sub.
                $nomor_item++;

                $nomor = trim((string) ($item['nomor'] ?? ''));
                if ($nomor === '') {
                    $nomor = ($kategori_index + 1) . '.' . $nomor_item;
                }

                $opsi = array_values(array_filter(array_map(
                    'trim',
                    array_map('strval', (array) ($item['opsi'] ?? []))
                ), fn ($opt) => $opt !== ''));

                $rows[] = [$nomor, $nama, $tipe, $opsi === [] ? '' : $opsi];
            }

            if (empty($rows)) {
                continue;
            }

            $kategori[$name] = $rows;
        }

        return $kategori;
    }
}
