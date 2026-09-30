import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/Card';
import Table from '../../Components/Table';
import CompactList from '../../Components/CompactList';
import Button from '../../Components/Button';
import Input from '../../Components/Input';
import StatefulButton from '../../Components/StatefulButton';
import Breadcrumbs from '../../Components/Breadcrumbs';
import PageTabs from '../../Components/PageTabs';
import ConfirmationModal from '../../Components/ConfirmationModal';
import { ArrowLeft, CheckCircle2, Pencil, Plus, Trash2, Upload } from 'lucide-react';

const labelTugas = (s) => ({ buka: 'Buka', proses: 'Proses', selesai: 'Selesai' }[s] || s);

export default function Detail({ project, timeline = [], users = [], canWrite = false, canManage = false }) {
    const [tab, setTab] = useState('overview');
    const [hapusTugas, setHapusTugas] = useState(null);
    const [hapusBerkas, setHapusBerkas] = useState(null);
    const [tim, setTim] = useState((project.members || []).map((m) => m.id));

    const tugasForm = useForm({ judul: '', status: 'buka', deadline: '', assignee: '' });
    const briefForm = useForm({ brief: project.brief || '' });
    const berkasForm = useForm({ berkas: null });

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'task', label: `Task (${(project.tasks || []).length})` },
        { id: 'file', label: `File (${(project.files || []).length})` },
        { id: 'brief', label: 'Brief' },
        { id: 'timeline', label: 'Timeline' },
        { id: 'team', label: `Team (${(project.members || []).length})` },
    ];

    const submitTugas = (e) => { e.preventDefault(); tugasForm.post(`/proyek/${project.id}/tugas`, { onSuccess: () => tugasForm.reset() }); };
    const tandaiSelesai = (t) => router.post(`/proyek/${project.id}/tugas/${t.id}`, { _method: 'patch', status: 'selesai' });
    const submitBrief = (e) => { e.preventDefault(); briefForm.post(`/proyek/${project.id}/brief`); };
    const submitBerkas = (e) => { e.preventDefault(); berkasForm.post(`/proyek/${project.id}/berkas`, { forceFormData: true, onSuccess: () => berkasForm.reset() }); };
    const submitTim = (e) => { e.preventDefault(); router.post(`/proyek/${project.id}/anggota`, { members: tim }); };
    const hapusProyek = () => { if (confirm('Hapus proyek ini?')) router.delete(`/proyek/${project.id}`); };

    const toggleTim = (id) => setTim((v) => (v.includes(id) ? v.filter((m) => m !== id) : [...v, id]));

    return (
        <>
            <Head title={project.nama} />
            <Breadcrumbs items={[{ label: 'Proyek', href: '/proyek' }, { label: project.nama }]} />
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <Link href="/proyek" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"><ArrowLeft className="h-4 w-4" /> Kembali</Link>
                <h1 className="text-lg font-bold text-text">{project.nama}</h1>
                <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-text-muted">{project.status === 'complete' ? 'Selesai' : 'On Track'}</span>
                {project.terlambat && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">Terlambat</span>}
                <span className="ml-auto flex gap-2">
                    {canWrite && <Link href={`/proyek/${project.id}/edit`}><Button variant="secondary"><Pencil className="h-4 w-4" /> Ubah</Button></Link>}
                    {canManage && <Button variant="danger" onClick={hapusProyek}><Trash2 className="h-4 w-4" /> Hapus</Button>}
                </span>
            </div>
            <PageTabs tabs={tabs} active={tab} onChange={setTab} />

            {tab === 'overview' && (
                <Card>
                    <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        <div><dt className="text-text-muted">Mulai</dt><dd className="font-medium text-text">{project.mulai || '-'}</dd></div>
                        <div><dt className="text-text-muted">Tenggat</dt><dd className="font-medium text-text">{project.deadline || '-'}</dd></div>
                        <div><dt className="text-text-muted">Progres tugas</dt><dd className="font-medium text-text">{project.selesai}/{project.total_tugas} selesai</dd></div>
                        <div><dt className="text-text-muted">Deskripsi</dt><dd className="text-text">{project.deskripsi || '-'}</dd></div>
                    </dl>
                </Card>
            )}

            {tab === 'task' && (
                <Card>
                    {canWrite && (
                        <form onSubmit={submitTugas} className="mb-4 flex flex-wrap items-end gap-2">
                            <div className="min-w-40 flex-1"><Input label="Judul tugas" value={tugasForm.data.judul} onChange={(e) => tugasForm.setData('judul', e.target.value)} required /></div>
                            <div><Input label="Tenggat" type="date" value={tugasForm.data.deadline} onChange={(e) => tugasForm.setData('deadline', e.target.value)} /></div>
                            <div><Input label="Assignee" value={tugasForm.data.assignee} onChange={(e) => tugasForm.setData('assignee', e.target.value)} /></div>
                            <StatefulButton type="submit" loading={tugasForm.processing}><Plus className="h-4 w-4" /> Tambah</StatefulButton>
                        </form>
                    )}
                    <div className="md:hidden">
                        <CompactList
                            rows={project.tasks || []}
                            kunci={(r) => r.id}
                            judul={(r) => r.judul}
                            meta={(r) => [labelTugas(r.status), r.deadline ? `Tenggat ${r.deadline}` : null, r.assignee]}
                            kosong="Belum ada tugas."
                        />
                    </div>
                    <div className="hidden md:block">
                        <Table headers={['Judul', 'Status', 'Tenggat', 'Assignee', 'Aksi']}>
                            {(project.tasks || []).map((t) => (
                                <tr key={t.id} className="border-t border-border">
                                    <td className="px-4 py-2 font-medium text-text">{t.judul}</td>
                                    <td className="px-4 py-2 text-center text-text">{labelTugas(t.status)}</td>
                                    <td className="px-4 py-2 text-center text-text">{t.deadline || '-'}</td>
                                    <td className="px-4 py-2 text-center text-text">{t.assignee || '-'}</td>
                                    <td className="px-4 py-2 text-center">
                                        {canWrite && t.status !== 'selesai' && <button type="button" onClick={() => tandaiSelesai(t)} className="mr-2 inline-flex items-center gap-1 text-xs text-teal-700 dark:text-teal-400 hover:underline"><CheckCircle2 className="h-4 w-4" /> Selesai</button>}
                                        {canWrite && <button type="button" onClick={() => setHapusTugas(t)} className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"><Trash2 className="h-4 w-4" /> Hapus</button>}
                                    </td>
                                </tr>
                            ))}
                        </Table>
                    </div>
                </Card>
            )}

            {tab === 'file' && (
                <Card>
                    {canWrite && (
                        <form onSubmit={submitBerkas} className="mb-4 flex flex-wrap items-end gap-2">
                            <input type="file" onChange={(e) => berkasForm.setData('berkas', e.target.files[0])} className="text-sm text-text" />
                            <StatefulButton type="submit" loading={berkasForm.processing}><Upload className="h-4 w-4" /> Unggah</StatefulButton>
                        </form>
                    )}
                    <Table headers={['Nama', 'Tautan', 'Aksi']}>
                        {(project.files || []).map((f) => (
                            <tr key={f.id} className="border-t border-border">
                                <td className="px-4 py-2 text-text">{f.nama}</td>
                                <td className="px-4 py-2 text-center"><a href={f.url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">Unduh</a></td>
                                <td className="px-4 py-2 text-center">{canWrite && <button type="button" onClick={() => setHapusBerkas(f)} className="text-xs text-red-600 hover:underline">Hapus</button>}</td>
                            </tr>
                        ))}
                    </Table>
                    {!(project.files || []).length && <p className="py-6 text-center text-sm text-text-muted">Belum ada berkas.</p>}
                </Card>
            )}

            {tab === 'brief' && (
                <Card>
                    {canWrite ? (
                        <form onSubmit={submitBrief} className="space-y-3">
                            <Input label="Brief proyek" type="textarea" value={briefForm.data.brief} onChange={(e) => briefForm.setData('brief', e.target.value)} />
                            <StatefulButton type="submit" loading={briefForm.processing}>Simpan Brief</StatefulButton>
                        </form>
                    ) : (
                        <p className="whitespace-pre-wrap text-sm text-text">{project.brief || 'Belum ada brief.'}</p>
                    )}
                </Card>
            )}

            {tab === 'timeline' && (
                <Card>
                    <ul className="space-y-2">
                        {(timeline || []).map((l, i) => (
                            <li key={i} className="border-l-2 border-border pl-3 text-sm">
                                <p className="font-medium text-text">{l.keterangan || l.aksi}</p>
                                <p className="text-xs text-text-muted">{l.username} · {l.waktu}</p>
                            </li>
                        ))}
                        {!(timeline || []).length && <p className="text-sm text-text-muted">Belum ada aktivitas.</p>}
                    </ul>
                </Card>
            )}

            {tab === 'team' && (
                <Card>
                    {canManage ? (
                        <form onSubmit={submitTim} className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                                {users.map((u) => (
                                    <label key={u.id} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text">
                                        <input type="checkbox" checked={tim.includes(u.id)} onChange={() => toggleTim(u.id)} className="h-4 w-4 accent-teal-700" />
                                        {u.username}
                                    </label>
                                ))}
                            </div>
                            <StatefulButton type="submit">Simpan Tim</StatefulButton>
                        </form>
                    ) : (
                        <ul className="space-y-1 text-sm text-text">{(project.members || []).map((m) => <li key={m.id}>{m.username}</li>)}</ul>
                    )}
                </Card>
            )}

            <ConfirmationModal
                open={!!hapusTugas}
                onClose={() => setHapusTugas(null)}
                onConfirm={() => { router.delete(`/proyek/${project.id}/tugas/${hapusTugas.id}`); setHapusTugas(null); }}
                title="Hapus tugas?"
                message={`Tugas "${hapusTugas?.judul}" akan dihapus permanen.`}
            />
            <ConfirmationModal
                open={!!hapusBerkas}
                onClose={() => setHapusBerkas(null)}
                onConfirm={() => { router.delete(`/proyek/${project.id}/berkas/${hapusBerkas.id}`); setHapusBerkas(null); }}
                title="Hapus berkas?"
                message={`Berkas "${hapusBerkas?.nama}" akan dihapus.`}
            />
        </>
    );
}

Detail.layout = page => <AppLayout children={page} />;
