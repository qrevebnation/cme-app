<?php

namespace App\Http\Controllers;

use App\Models\MigrationNeed;
use App\Support\Aktivitas;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MigrasiController extends Controller
{
    private const JENIS = ['busbar', 'geser_rack', 'tambah_perangkat', 'tambah_daya'];

    private const STATUS = ['diajukan', 'disetujui', 'selesai'];

    private const SATUAN = ['Unit', 'Pcs', 'Set', 'Meter', 'Batang', 'Lot', 'Paket'];

    /** Peran pengelola baru: akses penuh. technician: milik sendiri. viewer: baca saja. */
    private const PENGELOLA = ['admin', 'project_manager'];

    private function peran(Request $request): string
    {
        $user = \App\Models\User::find($request->session()->get('user_id'));

        return (string) ($user?->role ?? $request->session()->get('role', ''));
    }

    private function pengelola(Request $request): bool
    {
        return in_array($this->peran($request), ['admin', 'project_manager'], true);
    }

    private function bolehTulis(Request $request, ?MigrationNeed $row = null): bool
    {
        $peran = $this->peran($request);

        if (in_array($peran, ['admin', 'project_manager'], true)) {
            return true;
        }

        if ($peran === 'technician') {
            if ($row === null) {
                return true; // boleh ajukan baru; baris orang lain dijaga di bawah
            }

            return (int) ($row->created_by ?? 0) === (int) $request->session()->get('user_id');
        }

        return false; // viewer read-only
    }

    public function index(Request $request): Response
    {
        $fjenis = $request->input('jenis', 'semua');
        if ($fjenis !== 'semua' && !in_array($fjenis, self::JENIS, true)) {
            $fjenis = 'semua';
        }

        $fstatus = $request->input('status', 'semua');
        if ($fstatus !== 'semua' && !in_array($fstatus, self::STATUS, true)) {
            $fstatus = 'semua';
        }

        $peran = $this->peran($request);
        $bisaTulis = in_array($peran, ['admin', 'project_manager', 'technician'], true);

        $rows = MigrationNeed::query()
            ->when($fjenis !== 'semua', fn ($q) => $q->where('jenis', $fjenis))
            ->when($fstatus !== 'semua', fn ($q) => $q->where('status', $fstatus))
            ->orderByDesc('id')
            ->get()
            ->map(fn (MigrationNeed $row) => $this->serialize($row))
            ->all();

        return Inertia::render('Migrasi/Index', [
            'rows' => $rows,
            'filters' => ['jenis' => $fjenis, 'status' => $fstatus],
            'jenisList' => self::JENIS,
            'statusList' => self::STATUS,
            'canWrite' => $bisaTulis,
            'canDelete' => $this->pengelola($request),
        ]);
    }

    public function create(Request $request): Response
    {
        if (!$this->bolehTulis($request)) {
            abort(403, 'Anda tidak memiliki otorisasi untuk menambah kebutuhan migrasi.');
        }

        return Inertia::render('Migrasi/Create', [
            'jenisList' => self::JENIS,
            'statusList' => self::STATUS,
            'satuanList' => self::SATUAN,
        ]);
    }

    public function store(Request $request)
    {
        if (!$this->bolehTulis($request)) {
            abort(403, 'Anda tidak memiliki otorisasi untuk menambah kebutuhan migrasi.');
        }

        $data = $request->validate([
            'site' => 'required|string|max:200',
            'jenis' => 'required|in:' . implode(',', self::JENIS),
            'detail' => 'nullable|string',
            'qty' => 'required|integer|min:1',
            'satuan' => 'nullable|string|max:20',
            'status' => 'nullable|in:' . implode(',', self::STATUS),
        ], [], [
            'site' => 'site',
            'jenis' => 'jenis',
            'detail' => 'detail',
            'qty' => 'qty',
            'satuan' => 'satuan',
            'status' => 'status',
        ]);

        // technician hanya boleh ajukan; status paksa diajukan.
        if (!$this->pengelola($request)) {
            $data['status'] = 'diajukan';
        }

        $row = MigrationNeed::create([
            'site' => trim((string) $data['site']),
            'jenis' => $data['jenis'],
            'detail' => trim((string) ($request->input('detail') ?? '')),
            'qty' => (int) $data['qty'],
            'satuan' => trim((string) ($request->input('satuan') ?? '')) ?: 'Unit',
            'status' => $data['status'] ?? 'diajukan',
            'created_by' => (int) $request->session()->get('user_id'),
        ]);

        Aktivitas::catat('tambah', 'Migrasi', (string) $row->id, 'Migrasi ' . $row->site);

        return redirect('/migrasi')->with('success', 'Kebutuhan migrasi dicatat!');
    }

    public function edit(Request $request, $id): Response
    {
        $row = MigrationNeed::findOrFail($id);

        if (!$this->bolehTulis($request, $row)) {
            abort(403, 'Anda tidak memiliki otorisasi untuk mengubah data ini.');
        }

        return Inertia::render('Migrasi/Edit', [
            'row' => $this->serialize($row),
            'jenisList' => self::JENIS,
            'statusList' => self::STATUS,
            'satuanList' => self::SATUAN,
            'canSetStatus' => $this->pengelola($request),
        ]);
    }

    public function update(Request $request, $id)
    {
        $row = MigrationNeed::findOrFail($id);

        if (!$this->bolehTulis($request, $row)) {
            abort(403, 'Anda tidak memiliki otorisasi untuk mengubah data ini.');
        }

        $data = $request->validate([
            'site' => 'required|string|max:200',
            'jenis' => 'required|in:' . implode(',', self::JENIS),
            'detail' => 'nullable|string',
            'qty' => 'required|integer|min:1',
            'satuan' => 'nullable|string|max:20',
            'status' => 'nullable|in:' . implode(',', self::STATUS),
        ], [], [
            'site' => 'site',
            'jenis' => 'jenis',
            'detail' => 'detail',
            'qty' => 'qty',
            'satuan' => 'satuan',
            'status' => 'status',
        ]);

        $perubahan = [
            'site' => trim((string) $data['site']),
            'jenis' => $data['jenis'],
            'detail' => trim((string) ($request->input('detail') ?? '')),
            'qty' => (int) $data['qty'],
            'satuan' => trim((string) ($request->input('satuan') ?? '')) ?: 'Unit',
        ];

        // Perubahan status hanya pengelola; technician tetap milik-sendiri tanpa ubah status.
        if ($this->pengelola($request) && isset($data['status'])) {
            $perubahan['status'] = $data['status'];
        }

        $row->update($perubahan);

        Aktivitas::catat('ubah', 'Migrasi', (string) $row->id, 'Migrasi ' . $row->site);

        return redirect('/migrasi')->with('success', 'Kebutuhan migrasi diperbarui!');
    }

    public function delete(Request $request, $id)
    {
        if (!$this->pengelola($request)) {
            abort(403, 'Hanya admin / project manager yang dapat menghapus kebutuhan migrasi.');
        }

        $row = MigrationNeed::findOrFail($id);
        $site = $row->site;
        $row->delete();

        Aktivitas::catat('hapus', 'Migrasi', (string) $id, 'Migrasi ' . $site);

        return redirect('/migrasi')->with('success', 'Data dihapus.');
    }

    private function serialize(MigrationNeed $row): array
    {
        return [
            'id' => (int) $row->id,
            'site' => $row->site,
            'jenis' => $row->jenis,
            'detail' => $row->detail,
            'qty' => (int) $row->qty,
            'satuan' => $row->satuan,
            'status' => $row->status,
            'created_by' => (int) $row->created_by,
            'created_at' => $row->created_at,
        ];
    }
}
