import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/Card';
import Table from '../../Components/Table';
import CompactList from '../../Components/CompactList';
import Button from '../../Components/Button';
import Search, { filterData } from '../../Components/Search';
import Pagination from '../../Components/Pagination';
import Breadcrumbs from '../../Components/Breadcrumbs';
import MetricCard from '../../Components/MetricCard';
import { FolderKanban, Plus } from 'lucide-react';

const labelStatus = (s) => (s === 'complete' ? 'Selesai' : 'On Track');

export default function Index({ projects = [], counts = {}, canCreate = false }) {
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);
    const rows = filterData(projects, q);
    const per = 10;
    const paged = rows.slice((page - 1) * per, page * per);

    return (
        <>
            <Head title="Proyek" />
            <Breadcrumbs items={[{ label: 'Proyek' }]} />
            <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Proyek</h1>
                    <p className="mt-1 text-sm text-gray-500">Daftar proyek beserta status, tenggat, dan tugasnya.</p>
                </div>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard label="On Track" value={counts.on_track ?? 0} />
                <MetricCard label="Selesai" value={counts.complete ?? 0} />
                <MetricCard label="Terlambat" value={counts.terlambat ?? 0} />
                <MetricCard label="Semua" value={counts.semua ?? 0} />
            </div>
            <Card>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <div className="min-w-0 flex-1"><Search value={q} onChange={setQ} placeholder="Cari proyek..." /></div>
                    {canCreate && <Link href="/proyek/baru"><Button><Plus className="h-4 w-4" /> Proyek Baru</Button></Link>}
                </div>
                <div className="md:hidden">
                    <CompactList
                        rows={paged}
                        kunci={(r) => r.id}
                        judul={(r) => r.nama}
                        meta={(r) => [labelStatus(r.status), r.deadline ? `Tenggat ${r.deadline}` : null, `${r.selesai}/${r.total_tugas} tugas`, r.terlambat ? 'Terlambat' : null]}
                        tautan={(r) => `/proyek/${r.id}`}
                        kosong="Belum ada proyek."
                    />
                </div>
                <div className="hidden md:block">
                    <Table headers={['Nama', 'Status', 'Tenggat', 'Tugas', 'Aksi']}>
                        {paged.map((r) => (
                            <tr key={r.id} className="border-t border-border">
                                <td className="px-4 py-2 font-medium text-text"><Link href={`/proyek/${r.id}`} className="hover:underline">{r.nama}</Link>{r.terlambat && <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">Terlambat</span>}</td>
                                <td className="px-4 py-2 text-center text-text">{labelStatus(r.status)}</td>
                                <td className="px-4 py-2 text-center text-text">{r.deadline || '-'}</td>
                                <td className="px-4 py-2 text-center text-text">{r.selesai}/{r.total_tugas}</td>
                                <td className="px-4 py-2 text-center"><Link href={`/proyek/${r.id}`} className="text-sm text-primary hover:underline">Buka</Link></td>
                            </tr>
                        ))}
                    </Table>
                    {!paged.length && <p className="flex items-center justify-center gap-2 py-8 text-sm text-text-muted"><FolderKanban className="h-4 w-4" /> Belum ada proyek.</p>}
                </div>
                <Pagination currentPage={page} totalPages={Math.max(1, Math.ceil(rows.length / per))} onPageChange={setPage} />
            </Card>
        </>
    );
}

Index.layout = page => <AppLayout children={page} />;
