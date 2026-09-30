<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTemplateRequest;
use App\Http\Requests\UpdateTemplateRequest;
use App\Models\AtpTemplate;
use App\Support\Aktivitas;
use App\Support\Peran;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class TemplateController extends Controller
{
    /**
     * Ubah baris repeater builder menjadi baris data_json template.
     *
     * Baris judul (kategori/sub-kategori) memakai format lama `ty: sec|sub`.
     * Baris parameter mempertahankan kunci format baru (label/type/options)
     * sekaligus format lama (ty/it, d, _id) supaya form ATP di
     * AtpController::create tetap mendapat tipe input asli, sementara
     * pembaca format lama tetap mengenali barisnya.
     */
    private function rowsFromFields(array $fields): array
    {
        return collect($fields)->map(function ($field, $index) {
            $label = trim((string) ($field['label'] ?? ''));
            $type = $field['type'] ?? 'text';

            if ($type === 'judul') {
                return [
                    'ty' => ($field['jenis'] ?? 'seksi') === 'sub' ? 'sub' : 'sec',
                    'tx' => $label,
                ];
            }

            $id = $field['id'] ?? ('field_' . time() . '_' . $index);
            $standard = (string) ($field['standard'] ?? '');
            $tool = (string) ($field['tool'] ?? '');
            $options = is_array($field['options'] ?? null)
                ? array_values(array_filter(array_map('trim', $field['options'])))
                : [];

            return [
                'ty' => 'it',
                '_id' => $id,
                'id' => $id,
                'd' => [$label, $standard, $tool, '', 0, 0, 0, ''],
                'label' => $label,
                'type' => $type,
                'standard' => $standard,
                'tool' => $tool,
                'required' => (bool) ($field['required'] ?? true),
                'options' => $options,
            ];
        })->values()->all();
    }

    /**
     * Ubah data_json template menjadi baris repeater builder.
     * Mendukung format baru (label), format lama (ty: it) dan baris
     * kategori/sub-kategori (ty: sec|sub) yang tampil sebagai baris judul.
     */
    private function fieldsFromRows($rows): array
    {
        if (!is_array($rows)) {
            return [];
        }

        $fields = [];
        foreach ($rows as $idx => $row) {
            if (!is_array($row)) {
                continue;
            }

            if (isset($row['label'])) {
                $fields[] = [
                    'id' => $row['id'] ?? ($row['_id'] ?? ('field_' . $idx)),
                    'label' => $row['label'],
                    'type' => $row['type'] ?? 'text',
                    'standard' => $row['standard'] ?? '',
                    'tool' => $row['tool'] ?? '',
                    'required' => (bool) ($row['required'] ?? true),
                    'options' => $row['options'] ?? [],
                ];
            } elseif (isset($row['ty']) && in_array($row['ty'], ['sec', 'sub'], true)) {
                $fields[] = [
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
                $fields[] = [
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

        return $fields;
    }

    public function index(Request $request): Response
    {
        $userId = $request->session()->get('user_id');
        $templates = AtpTemplate::with(['creator'])
            ->withCount('records')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($tpl) {
                $rows = $this->fieldsFromRows($tpl->data_json);

                return [
                    'id' => $tpl->id,
                    'title' => $tpl->title,
                    'fields_count' => count(array_filter(
                        $rows,
                        fn ($row) => ($row['type'] ?? '') !== 'judul'
                    )),
                    'records_count' => $tpl->records_count,
                    'created_by' => $tpl->created_by,
                    'creator_name' => $tpl->creator ? ($tpl->creator->nama ?? $tpl->creator->username) : 'System',
                    'created_at' => $tpl->created_at ? $tpl->created_at->format('Y-m-d H:i') : '-',
                    'updated_at' => $tpl->updated_at ? $tpl->updated_at->format('Y-m-d H:i') : '-',
                ];
            });

        $stats = [
            'total' => $templates->count(),
            'mine' => $templates->where('created_by', $userId)->count(),
            'total_used' => $templates->sum('records_count'),
        ];

        return Inertia::render('TemplateBuilder/Index', [
            'templates' => $templates,
            'stats' => $stats,
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('TemplateBuilder/Create', [
            'initialRows' => [
                [
                    'id' => 'field_' . time() . '_1',
                    'label' => 'Panjang total pondasi',
                    'type' => 'text',
                    'standard' => 'Sesuai gambar ±3m',
                    'tool' => 'Roll meter',
                    'required' => true,
                    'options' => [],
                ],
                [
                    'id' => 'field_' . time() . '_2',
                    'label' => 'Tahanan grounding',
                    'type' => 'number',
                    'standard' => '≤5Ω',
                    'tool' => 'Earth Tester',
                    'required' => true,
                    'options' => [],
                ],
            ]
        ]);
    }

    public function store(StoreTemplateRequest $request)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $userId = $request->session()->get('user_id');

        DB::beginTransaction();
        try {
            AtpTemplate::create([
                'title' => $request->input('title'),
                'data_json' => $this->rowsFromFields($request->input('fields', [])),
                'created_by' => $userId,
            ]);

            DB::commit();

            // Jejak audit: satu baris per aksi tulis.
            Aktivitas::catat('tambah', 'Template ATP', null, 'Template ' . $request->input('title'));

            return redirect('/template')->with('success', 'Template form ATP berhasil dibuat dan siap digunakan.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Gagal menyimpan template: ' . $e->getMessage())->withInput();
        }
    }

    public function edit(Request $request, $id): Response
    {
        $template = AtpTemplate::findOrFail($id);

        return Inertia::render('TemplateBuilder/Edit', [
            'template' => [
                'id' => $template->id,
                'title' => $template->title,
                'fields' => $this->fieldsFromRows($template->data_json),
            ]
        ]);
    }

    public function update(UpdateTemplateRequest $request, $id)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $template = AtpTemplate::findOrFail($id);

        DB::beginTransaction();
        try {
            $template->update([
                'title' => $request->input('title'),
                'data_json' => $this->rowsFromFields($request->input('fields', [])),
            ]);

            DB::commit();

            // Jejak audit: satu baris per aksi tulis.
            Aktivitas::catat('ubah', 'Template ATP', (string) $template->id, 'Template ' . $request->input('title'));

            return redirect('/template')->with('success', 'Template form ATP berhasil diperbarui.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Gagal memperbarui template: ' . $e->getMessage())->withInput();
        }
    }

    public function delete(Request $request, $id)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $template = AtpTemplate::findOrFail($id);

        try {
            $judul = $template->title;
            $template->delete();

            // Jejak audit: satu baris per aksi tulis.
            Aktivitas::catat('hapus', 'Template ATP', (string) $id, 'Template ' . $judul);

            return redirect('/template')->with('success', 'Template form ATP berhasil dihapus.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal menghapus template: ' . $e->getMessage());
        }
    }
}
