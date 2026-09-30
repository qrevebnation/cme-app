<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Project;
use App\Models\ProjectFile;
use App\Models\ProjectTask;
use App\Models\User;
use App\Support\Aktivitas;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectController extends Controller
{
    private function role(Request $r): ?string
    {
        return $r->session()->get('role') ?? $r->session()->get('peran');
    }

    private function uid(Request $r): int
    {
        return (int) $r->session()->get('user_id');
    }

    private function isPengelola(?string $role): bool
    {
        return in_array($role, ['admin', 'project_manager'], true);
    }

    private function isMember(Project $p, int $uid): bool
    {
        return $p->members()->where('user_id', $uid)->exists();
    }

    private function canWrite(Request $r, Project $p): bool
    {
        $role = $this->role($r);
        if ($this->isPengelola($role)) return true;
        if ($role === 'technician' && $this->isMember($p, $this->uid($r))) return true;
        return false;
    }

    private function serialize(Project $p): array
    {
        $today = date('Y-m-d');
        $tasks = $p->tasks ?? collect();
        return [
            'id' => $p->id,
            'nama' => $p->nama,
            'deskripsi' => $p->deskripsi,
            'mulai' => $p->mulai,
            'deadline' => $p->deadline,
            'status' => $p->status,
            'brief' => $p->brief,
            'terlambat' => $p->deadline && $p->status !== 'complete' && $p->deadline < $today,
            'total_tugas' => $tasks->count(),
            'selesai' => $tasks->where('status', 'selesai')->count(),
        ];
    }

    public function index(Request $request): Response
    {
        $projects = Project::with('tasks')->orderBy('deadline')->orderBy('id', 'desc')->get();
        $rows = $projects->map(fn ($p) => $this->serialize($p))->all();
        $today = date('Y-m-d');
        $counts = [
            'on_track' => $projects->where('status', 'on_track')->count(),
            'complete' => $projects->where('status', 'complete')->count(),
            'terlambat' => $projects->filter(fn ($p) => $p->deadline && $p->status !== 'complete' && $p->deadline < $today)->count(),
            'semua' => $projects->count(),
        ];
        $role = $this->role($request);
        return Inertia::render('Project/Index', [
            'projects' => $rows,
            'counts' => $counts,
            'canCreate' => $this->isPengelola($role),
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('Project/Create', [
            'users' => User::orderBy('username')->get(['id', 'username']),
        ]);
    }

    public function store(Request $request)
    {
        if (!$this->isPengelola($this->role($request))) {
            return redirect('/proyek')->with('error', 'Gagal: hanya admin/project_manager.');
        }
        $data = $request->validate([
            'nama' => 'required|string|max:150',
            'deskripsi' => 'nullable|string',
            'mulai' => 'nullable|date_format:Y-m-d',
            'deadline' => 'nullable|date_format:Y-m-d',
            'status' => 'nullable|in:on_track,complete',
            'brief' => 'nullable|string',
            'members' => 'nullable|array',
            'members.*' => 'integer|exists:users,id',
        ]);
        $p = Project::create([
            'nama' => trim($data['nama']),
            'deskripsi' => $data['deskripsi'] ?? null,
            'mulai' => $data['mulai'] ?? null,
            'deadline' => $data['deadline'] ?? null,
            'status' => $data['status'] ?? 'on_track',
            'brief' => $data['brief'] ?? null,
            'created_by' => $this->uid($request),
        ]);
        if (!empty($data['members'])) $p->members()->sync($data['members']);
        Aktivitas::catat('tambah', 'Proyek', (string) $p->id, 'Buat proyek ' . $p->nama);
        return redirect('/proyek/' . $p->id)->with('success', 'Proyek dibuat!');
    }

    public function show(Request $request, $id): Response
    {
        $p = Project::with(['tasks', 'files', 'members'])->findOrFail($id);
        $role = $this->role($request);
        $logs = ActivityLog::where('modul', 'Proyek')->where('ref_id', (string) $p->id)
            ->orderBy('created_at', 'desc')->limit(50)->get();
        return Inertia::render('Project/Detail', [
            'project' => $this->serialize($p) + [
                'tasks' => $p->tasks->map(fn ($t) => [
                    'id' => $t->id, 'judul' => $t->judul, 'status' => $t->status,
                    'deadline' => $t->deadline, 'assignee' => $t->assignee,
                ])->all(),
                'files' => $p->files->map(fn ($f) => [
                    'id' => $f->id, 'nama' => $f->nama, 'path' => $f->path,
                    'url' => '/' . ltrim($f->path, '/'),
                ])->all(),
                'members' => $p->members->map(fn ($u) => ['id' => $u->id, 'username' => $u->username])->all(),
            ],
            'timeline' => $logs->map(fn ($l) => [
                'aksi' => $l->aksi, 'keterangan' => $l->keterangan,
                'username' => $l->username, 'waktu' => (string) $l->created_at,
            ])->all(),
            'users' => User::orderBy('username')->get(['id', 'username']),
            'canWrite' => $this->canWrite($request, $p),
            'canManage' => $this->isPengelola($role),
        ]);
    }

    public function edit(Request $request, $id): Response
    {
        $p = Project::with('members')->findOrFail($id);
        if (!$this->canWrite($request, $p)) {
            return redirect('/proyek/' . $p->id)->with('error', 'Gagal: akses ditolak.');
        }
        return Inertia::render('Project/Edit', [
            'project' => $this->serialize($p) + [
                'members' => $p->members->pluck('id')->all(),
            ],
            'users' => User::orderBy('username')->get(['id', 'username']),
        ]);
    }

    public function update(Request $request, $id)
    {
        $p = Project::findOrFail($id);
        if (!$this->canWrite($request, $p)) {
            return redirect('/proyek/' . $p->id)->with('error', 'Gagal: akses ditolak.');
        }
        $data = $request->validate([
            'nama' => 'required|string|max:150',
            'deskripsi' => 'nullable|string',
            'mulai' => 'nullable|date_format:Y-m-d',
            'deadline' => 'nullable|date_format:Y-m-d',
            'status' => 'nullable|in:on_track,complete',
        ]);
        $p->update([
            'nama' => trim($data['nama']),
            'deskripsi' => $data['deskripsi'] ?? null,
            'mulai' => $data['mulai'] ?? null,
            'deadline' => $data['deadline'] ?? null,
            'status' => $data['status'] ?? $p->status,
        ]);
        Aktivitas::catat('ubah', 'Proyek', (string) $p->id, 'Ubah proyek ' . $p->nama);
        return redirect('/proyek/' . $p->id)->with('success', 'Proyek diperbarui!');
    }

    public function updateBrief(Request $request, $id)
    {
        $p = Project::findOrFail($id);
        if (!$this->canWrite($request, $p)) {
            return redirect('/proyek/' . $p->id)->with('error', 'Gagal: akses ditolak.');
        }
        $request->validate(['brief' => 'nullable|string']);
        $p->update(['brief' => $request->input('brief')]);
        Aktivitas::catat('ubah', 'Proyek', (string) $p->id, 'Ubah brief proyek ' . $p->nama);
        return redirect('/proyek/' . $p->id)->with('success', 'Brief disimpan!');
    }

    public function destroy(Request $request, $id)
    {
        $p = Project::findOrFail($id);
        if (!$this->isPengelola($this->role($request))) {
            return redirect('/proyek')->with('error', 'Gagal: hanya admin/project_manager.');
        }
        $nama = $p->nama;
        $p->delete();
        Aktivitas::catat('hapus', 'Proyek', (string) $id, 'Hapus proyek ' . $nama);
        return redirect('/proyek')->with('success', 'Proyek dihapus!');
    }

    public function syncMembers(Request $request, $id)
    {
        $p = Project::findOrFail($id);
        if (!$this->isPengelola($this->role($request))) {
            return redirect('/proyek/' . $p->id)->with('error', 'Gagal: hanya admin/project_manager.');
        }
        $data = $request->validate(['members' => 'nullable|array', 'members.*' => 'integer|exists:users,id']);
        $p->members()->sync($data['members'] ?? []);
        Aktivitas::catat('ubah', 'Proyek', (string) $p->id, 'Ubah tim proyek ' . $p->nama);
        return redirect('/proyek/' . $p->id)->with('success', 'Tim diperbarui!');
    }

    public function storeTask(Request $request, $id)
    {
        $p = Project::findOrFail($id);
        if (!$this->canWrite($request, $p)) {
            return redirect('/proyek/' . $p->id)->with('error', 'Gagal: akses ditolak.');
        }
        $data = $request->validate([
            'judul' => 'required|string|max:150',
            'status' => 'nullable|in:buka,proses,selesai',
            'deadline' => 'nullable|date_format:Y-m-d',
            'assignee' => 'nullable|string|max:100',
        ]);
        $t = ProjectTask::create([
            'project_id' => $p->id,
            'judul' => trim($data['judul']),
            'status' => $data['status'] ?? 'buka',
            'deadline' => $data['deadline'] ?? null,
            'assignee' => $data['assignee'] ?? null,
            'created_by' => $this->uid($request),
        ]);
        Aktivitas::catat('tambah', 'Proyek', (string) $p->id, 'Tugas: ' . $t->judul);
        return redirect('/proyek/' . $p->id)->with('success', 'Tugas ditambah!');
    }

    public function updateTask(Request $request, $id, $taskId)
    {
        $p = Project::findOrFail($id);
        if (!$this->canWrite($request, $p)) {
            return redirect('/proyek/' . $p->id)->with('error', 'Gagal: akses ditolak.');
        }
        $t = ProjectTask::where('project_id', $p->id)->findOrFail($taskId);
        $data = $request->validate([
            'judul' => 'sometimes|required|string|max:150',
            'status' => 'sometimes|required|in:buka,proses,selesai',
            'deadline' => 'nullable|date_format:Y-m-d',
            'assignee' => 'nullable|string|max:100',
        ]);
        $t->update($data);
        Aktivitas::catat('ubah', 'Proyek', (string) $p->id, 'Tugas ' . $t->judul . ' -> ' . $t->status);
        return redirect('/proyek/' . $p->id)->with('success', 'Tugas diperbarui!');
    }

    public function destroyTask(Request $request, $id, $taskId)
    {
        $p = Project::findOrFail($id);
        if (!$this->canWrite($request, $p)) {
            return redirect('/proyek/' . $p->id)->with('error', 'Gagal: akses ditolak.');
        }
        $t = ProjectTask::where('project_id', $p->id)->findOrFail($taskId);
        $judul = $t->judul;
        $t->delete();
        Aktivitas::catat('hapus', 'Proyek', (string) $p->id, 'Hapus tugas ' . $judul);
        return redirect('/proyek/' . $p->id)->with('success', 'Tugas dihapus!');
    }

    public function storeFile(Request $request, $id)
    {
        $p = Project::findOrFail($id);
        if (!$this->canWrite($request, $p)) {
            return redirect('/proyek/' . $p->id)->with('error', 'Gagal: akses ditolak.');
        }
        $request->validate(['berkas' => 'required|file|max:10240']);
        $file = $request->file('berkas');
        $name = $file->getClientOriginalName();
        $path = $file->storeAs('uploads/projects', time() . '_' . preg_replace('/[^A-Za-z0-9._-]/', '_', $name), 'public');
        ProjectFile::create([
            'project_id' => $p->id,
            'nama' => $name,
            'path' => 'storage/' . $path,
            'created_by' => $this->uid($request),
        ]);
        Aktivitas::catat('tambah', 'Proyek', (string) $p->id, 'Berkas: ' . $name);
        return redirect('/proyek/' . $p->id)->with('success', 'Berkas diunggah!');
    }

    public function destroyFile(Request $request, $id, $fileId)
    {
        $p = Project::findOrFail($id);
        if (!$this->canWrite($request, $p)) {
            return redirect('/proyek/' . $p->id)->with('error', 'Gagal: akses ditolak.');
        }
        $f = ProjectFile::where('project_id', $p->id)->findOrFail($fileId);
        $nama = $f->nama;
        $f->delete();
        Aktivitas::catat('hapus', 'Proyek', (string) $p->id, 'Hapus berkas ' . $nama);
        return redirect('/proyek/' . $p->id)->with('success', 'Berkas dihapus!');
    }
}
