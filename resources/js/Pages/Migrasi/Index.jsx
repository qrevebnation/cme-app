import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/Card';
import Table from '../../Components/Table';
import CompactList, { AksiBaris } from '../../Components/CompactList';
import Search, { filterData } from '../../Components/Search';
import Pagination from '../../Components/Pagination';
import Breadcrumbs from '../../Components/Breadcrumbs';
import ConfirmationModal from '../../Components/ConfirmationModal';
import { Pencil, Plus, Trash2 } from 'lucide-react';

const LABEL_JENIS = {
    busbar: 'Busbar',
    geser_rack: 'Geser Rack',
    tambah_perangkat: 'Tambah Perangkat',
    tambah_daya: 'Tambah Daya',
};

function StatusBadge({ status }) {
    const style = {
        diajukan: 'bg-amber-50 text-amber-700 border-amber-200',
        disetujui: 'bg-teal-50 text-teal-700 border-teal-200',
        selesai: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    }[status] || 'bg-gray-50 text-gray-500 border-gray-200';

    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${style}`}>
            {status || '-'}
        </span>
    );
}

export default function Index({ rows = [], filters = {}, jenisList = [], statusList = [], canWrite = false, canDelete = false }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pendingDelete, setPendingDelete] = useState(null);

    const activeJenis = filters.jenis || 'semua';
    const activeStatus = filters.status || 'semua';

    const queryJenis = (j) => `/migrasi?jenis=${j}&status=${activeStatus}`;
    const queryStatus = (s) => `/migrasi?jenis=${activeJenis}&status=${s}`;

    const filtered = filterData(rows, searchQuery);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const confirmDelete = () => {
        if (!pendingDelete) return;
        router.delete(`/migrasi/${pendingDelete}`, {
            preserveScroll: true,
            onFinish: () => setPendingDelete(null),
        });
    };

    return (
        <>
            <Head title="Kebutuhan Migrasi - Web CME" />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Kebutuhan Migrasi' },
            ]} />

            <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-text font-headlines">
                        Kebutuhan Migrasi
                    </h1>
                    <p className="text-sm text-text-muted font-headlines mt-1">
                        Catat kebutuhan busbar, geser rack, tambah perangkat, dan tambah daya per site.
                    </p>
                </div>
                {canWrite && (
                    <Link
                        href="/migrasi/baru"
                        className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] sm:min-h-0 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold uppercase rounded-lg transition shadow-sm"
                    >
                        <Plus className="h-4 w-4 stroke-[1.5]" />
                        Tambah Kebutuhan
                    </Link>
                )}
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
                <Link
                    href={queryJenis('semua')}
                    className={`px-3 py-1.5 min-h-[44px] sm:min-h-0 rounded-lg border text-[11px] font-bold uppercase tracking-wider transition ${activeJenis === 'semua' ? 'bg-text text-bg border-transparent' : 'bg-surface border-gray-300 text-gray-600 hover:border-primary hover:text-primary'}`}
                >
                    Semua Jenis
                </Link>
                {jenisList.map((j) => (
                    <Link
                        key={j}
                        href={queryJenis(j)}
                        className={`px-3 py-1.5 min-h-[44px] sm:min-h-0 rounded-lg border text-[11px] font-bold uppercase tracking-wider transition ${activeJenis === j ? 'bg-primary border-transparent text-primary-foreground' : 'bg-surface border-gray-300 text-gray-600 hover:border-primary hover:text-primary'}`}
                    >
                        {LABEL_JENIS[j] || j}
                    </Link>
                ))}
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
                <Link
                    href={queryStatus('semua')}
                    className={`px-3 py-1.5 min-h-[44px] sm:min-h-0 rounded-lg border text-[11px] font-bold uppercase tracking-wider transition ${activeStatus === 'semua' ? 'bg-text text-bg border-transparent' : 'bg-surface border-gray-300 text-gray-600 hover:border-primary hover:text-primary'}`}
                >
                    Semua Status
                </Link>
                {statusList.map((s) => (
                    <Link
                        key={s}
                        href={queryStatus(s)}
                        className={`px-3 py-1.5 min-h-[44px] sm:min-h-0 rounded-lg border text-[11px] font-bold uppercase tracking-wider transition ${activeStatus === s ? 'bg-text text-bg border-transparent' : 'bg-surface border-gray-300 text-gray-600 hover:border-primary hover:text-primary'}`}
                    >
                        {s}
                    </Link>
                ))}
            </div>

            <Card title="Daftar Kebutuhan">
                <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3 mb-4">
                    <Search value={searchQuery} onChange={(q) => { setSearchQuery(q); setCurrentPage(1); }} placeholder="Cari site / detail..." />
                </div>

                <div className="xl:hidden">
                    <CompactList
                        rows={paginated}
                        kunci={(row) => row.id}
                        judul={(row) => row.site || '-'}
                        nuansa={(row) => <StatusBadge status={row.status} />}
                        meta={(row) => [LABEL_JENIS[row.jenis] || row.jenis, `${row.qty} ${row.satuan}`]}
                        kosong="Belum ada kebutuhan pada filter ini."
                        aksi={(row) => (
                            <>
                                {canWrite && (
                                    <AksiBaris label="Ubah" href={`/migrasi/${row.id}/edit`} ikon={Pencil} />
                                )}
                                {canDelete && (
                                    <AksiBaris label="Hapus" ikon={Trash2} tone="bahaya" onClick={() => setPendingDelete(row.id)} />
                                )}
                            </>
                        )}
                    />
                </div>

                <div className="hidden xl:block">
                    <Table headers={['Site', 'Jenis', 'Qty', 'Status', 'Aksi']}>
                        {paginated.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-400 font-medium">
                                    Belum ada kebutuhan pada filter ini.
                                </td>
                            </tr>
                        ) : (
                            paginated.map((row) => (
                                <tr key={row.id} className="hover:bg-gray-50/50">
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-gray-900">{row.site}</div>
                                        <div className="text-[11px] text-gray-500 truncate max-w-[320px]">{row.detail || '-'}</div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{LABEL_JENIS[row.jenis] || row.jenis}</td>
                                    <td className="px-4 py-3 text-center font-semibold text-gray-700 whitespace-nowrap">{row.qty} {row.satuan}</td>
                                    <td className="px-4 py-3 text-center"><StatusBadge status={row.status} /></td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5">
                                            {canWrite && (
                                                <Link
                                                    href={`/migrasi/${row.id}/edit`}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[44px] sm:min-h-0 rounded-md border border-border text-text hover:text-primary hover:border-primary text-[10px] font-bold uppercase tracking-wider transition"
                                                >
                                                    <Pencil className="h-3 w-3 stroke-[1.5]" />
                                                    Ubah
                                                </Link>
                                            )}
                                            {canDelete && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPendingDelete(row.id)}
                                                    title="Hapus data ini"
                                                    className="inline-flex items-center justify-center h-6 w-6 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 transition text-sm font-bold"
                                                >
                                                    ×
                                                </button>
                                            )}
                                            {!canWrite && !canDelete && (
                                                <span className="text-[11px] text-gray-400">Baca saja</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </Table>
                </div>

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filtered.length}
                    itemsPerPage={itemsPerPage}
                />
            </Card>

            <ConfirmationModal
                isOpen={pendingDelete !== null}
                onClose={() => setPendingDelete(null)}
                onConfirm={confirmDelete}
                type="danger"
                title="Hapus data ini?"
                message="Kebutuhan migrasi akan dihapus permanen dan tidak dapat dikembalikan."
                confirmText="Ya, Hapus"
            />
        </>
    );
}

Index.layout = page => <AppLayout children={page} />;
