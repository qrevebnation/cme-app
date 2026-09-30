import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/Card';
import Table from '../../Components/Table';
import CompactList, { AksiBaris } from '../../Components/CompactList';
import Button from '../../Components/Button';
import Search, { filterData } from '../../Components/Search';
import Pagination from '../../Components/Pagination';
import Breadcrumbs from '../../Components/Breadcrumbs';
import ConfirmationModal from '../../Components/ConfirmationModal';
import DocumentPreview from '../../Components/DocumentPreview';
import { ArrowLeftRight, CheckCircle2, Plus, Printer, Trash2, Undo2 } from 'lucide-react';

import MetricCard from '../../Components/MetricCard';

function StatusBadge({ loan }) {
    const style = {
        dipinjam: 'bg-amber-50 text-amber-700 border-amber-200',
        terlambat: 'bg-rose-50 text-rose-700 border-rose-200',
        kembali: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    }[loan.status_kode] || 'bg-gray-50 text-gray-500 border-gray-200';

    return (
        <div className="text-center whitespace-nowrap">
            <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${style}`}>
                {loan.status_label}
            </span>
            {loan.status === 'kembali' && loan.kondisi_kembali && (
                <div className="text-[10px] text-gray-400 mt-1">{loan.kondisi_kembali}</div>
            )}
        </div>
    );
}

export default function Index({ loans = [], counts = {}, filters = {}, canDelete = false }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [dokumen, setDokumen] = useState(null);

    const activeStatus = filters.status || 'aktif';
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    const iso = (d) => d.toISOString().split('T')[0];

    const handleSearchChange = (query) => {
        setSearchQuery(query);
        setCurrentPage(1);
    };

    const filteredLoans = filterData(loans, searchQuery);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredLoans.length / itemsPerPage);
    const paginatedLoans = filteredLoans.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const chips = [
        { key: 'aktif', label: `Aktif (${counts.aktif || 0})`, active: 'bg-amber-500 border-transparent text-amber-950', idle: 'bg-surface border-amber-300 text-amber-700 dark:text-amber-400' },
        { key: 'terlambat', label: `Terlambat (${counts.telat || 0})`, active: 'bg-rose-600 border-transparent text-white', idle: 'bg-surface border-rose-300 text-rose-700 dark:text-rose-300' },
        { key: 'kembali', label: `Sudah kembali (${counts.kembali || 0})`, active: 'bg-emerald-600 border-transparent text-white', idle: 'bg-surface border-emerald-300 text-emerald-700 dark:text-emerald-400' },
        { key: 'semua', label: `Semua (${counts.semua || 0})`, active: 'bg-text text-bg border-transparent', idle: 'bg-surface border-gray-300 text-gray-600' },
    ];

    const confirmDelete = () => {
        if (!pendingDelete) return;
        router.delete(`/tools/${pendingDelete}`, {
            preserveScroll: true,
            onFinish: () => setPendingDelete(null),
        });
    };

    return (
        <>
            <Head title="Peminjaman Tools - Web CME" />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Inventory', href: '/gudang' },
                { label: 'Peminjaman Tools' }
            ]} />

            <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines">
                        Peminjaman Tools
                    </h1>
                    <p className="text-sm text-gray-500 font-headlines mt-1">
                        Pencatatan peminjaman dan pengembalian peralatan kerja beserta status pengembaliannya.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setDokumen({
                            judul: 'Rekap Peminjaman Tools (Bulan Ini)',
                            src: `/print/tool_loan_print?dari=${iso(monthStart)}&sampai=${iso(monthEnd)}`,
                        })}
                        className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] sm:min-h-0 bg-surface border border-border text-text hover:text-primary hover:border-primary text-xs font-bold uppercase rounded-lg transition shadow-sm"
                    >
                        <Printer className="h-4 w-4 stroke-[1.5]" />
                        Cetak Bulan Ini
                    </button>
                    <Link
                        href="/tools/baru"
                        className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] sm:min-h-0 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold uppercase rounded-lg transition shadow-sm"
                    >
                        <Plus className="h-4 w-4 stroke-[1.5]" />
                        Pinjamkan Tool
                    </Link>
                </div>
            </div>

            {/* Mobile: dua kartu per baris agar bentuknya persegi seperti ATP/Survey */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                <MetricCard
                    title="Sedang Dipinjam"
                    value={counts.aktif || 0}
                    note={`${counts.telat || 0} terlambat dikembalikan`}
                />
                <MetricCard title="Terlambat" value={counts.telat || 0} note="Melewati rencana kembali" />
                <MetricCard title="Sudah Kembali" value={counts.kembali || 0} note="Transaksi selesai" />
                <MetricCard title="Total Transaksi" value={counts.semua || 0} note="Seluruh peminjaman tercatat" />
            </div>

            <div className="flex flex-wrap gap-1.5 mb-4">
                {chips.map((chip) => (
                    <Link
                        key={chip.key}
                        href={`/tools?status=${chip.key}`}
                        className={`px-3 py-1.5 min-h-[44px] sm:min-h-0 rounded-lg border text-[11px] font-bold uppercase tracking-wider transition ${activeStatus === chip.key ? chip.active : `${chip.idle} hover:border-primary hover:text-primary`}`}
                    >
                        {chip.label}
                    </Link>
                ))}
            </div>

            <Card title="Daftar Transaksi">
                <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3 mb-4">
                    <Search value={searchQuery} onChange={handleSearchChange} placeholder="Cari no. form / tool / peminjam..." />
                </div>

                {/* Mobile: daftar rapat agar 8 kolom tidak perlu digeser */}
                <div className="xl:hidden">
                    <CompactList
                        rows={paginatedLoans}
                        kunci={(loan) => loan.id}
                        judul={(loan) => loan.tipe || '-'}
                        nuansa={(loan) => <StatusBadge loan={loan} />}
                        meta={(loan) => [loan.no_form, loan.merek || '-', loan.peminjam, loan.tgl_pinjam, loan.rencana_kembali || '-']}
                        kosong="Belum ada transaksi pada filter ini."
                        aksi={(loan) => (
                            <>
                                {loan.status === 'dipinjam' && (
                                    <AksiBaris label="Kembalikan" href={`/tools/${loan.id}`} ikon={Undo2} />
                                )}
                                {/* Cetak: /print bukan respons Inertia, jadi dokumen dibuka di pratinjau dalam aplikasi */}
                                <AksiBaris
                                    label="Cetak PDF"
                                    ikon={Printer}
                                    onClick={() => setDokumen({ judul: `Dokumen Peminjaman Tools ${loan.no_form}`, src: `/print/tool_loan_print?id=${loan.id}` })}
                                />
                                {canDelete && (
                                    <AksiBaris label="Hapus" ikon={Trash2} tone="bahaya" onClick={() => setPendingDelete(loan.id)} />
                                )}
                            </>
                        )}
                    />
                </div>

                {/* Desktop: tabel 8 kolom tetap dipakai dari xl ke atas */}
                <div className="hidden xl:block">
                    <Table headers={['No. Form', 'Tool', 'Jml', 'Peminjam', 'Tgl Pinjam', 'Rencana Kembali', 'Status', 'Aksi']}>
                        {paginatedLoans.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-8 text-center text-gray-400 font-medium">
                                    Belum ada transaksi pada filter ini.
                                </td>
                            </tr>
                        ) : (
                            paginatedLoans.map((loan) => (
                                <tr key={loan.id} className="hover:bg-gray-50/50">
                                    <td className="px-4 py-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">{loan.no_form}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-bold text-gray-900">{loan.tipe || '-'}</div>
                                        <div className="text-[10px] text-gray-400 uppercase tracking-wider">
                                            {[loan.merek, loan.kategori].filter(Boolean).join(' · ')}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center font-semibold text-gray-700">{loan.jumlah}</td>
                                    <td className="px-4 py-3 text-gray-700">{loan.peminjam}</td>
                                    <td className="px-4 py-3 text-center text-gray-500 text-xs whitespace-nowrap">{loan.tgl_pinjam}</td>
                                    <td className={`px-4 py-3 text-center text-xs whitespace-nowrap ${loan.status_kode === 'terlambat' ? 'text-rose-600 font-bold' : 'text-gray-500'}`}>
                                        {loan.rencana_kembali || '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge loan={loan} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {loan.status === 'dipinjam' ? (
                                                <Link
                                                    href={`/tools/${loan.id}`}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[44px] sm:min-h-0 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wider transition"
                                                >
                                                    <ArrowLeftRight className="h-3 w-3 stroke-[2]" />
                                                    Kembalikan
                                                </Link>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 whitespace-nowrap">
                                                    <CheckCircle2 className="h-3 w-3 stroke-[2]" />
                                                    {loan.tgl_kembali || '-'}
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setDokumen({ judul: `Dokumen Peminjaman Tools ${loan.no_form}`, src: `/print/tool_loan_print?id=${loan.id}` })}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 min-h-[44px] sm:min-h-0 rounded-md border border-border text-text hover:text-primary hover:border-primary text-[10px] font-bold uppercase tracking-wider transition"
                                            >
                                                <Printer className="h-3 w-3 stroke-[1.5]" />
                                                Cetak PDF
                                            </button>
                                            {canDelete && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPendingDelete(loan.id)}
                                                    title="Hapus transaksi ini"
                                                    className="inline-flex items-center justify-center h-6 w-6 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 transition text-sm font-bold"
                                                >
                                                    ×
                                                </button>
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
                    totalItems={filteredLoans.length}
                    itemsPerPage={itemsPerPage}
                />
            </Card>

            <DocumentPreview
                isOpen={!!dokumen}
                onClose={() => setDokumen(null)}
                judul={dokumen?.judul}
                src={dokumen?.src}
            />

            <ConfirmationModal
                isOpen={pendingDelete !== null}
                onClose={() => setPendingDelete(null)}
                onConfirm={confirmDelete}
                type="danger"
                title="Hapus transaksi ini?"
                message="Data peminjaman akan dihapus permanen dan tidak dapat dikembalikan."
                confirmText="Ya, Hapus"
            />
        </>
    );
}

Index.layout = page => <AppLayout children={page} />;
