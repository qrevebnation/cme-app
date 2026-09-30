import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { CircleCheck, CircleX, Clock, FileText, Search, Trash2, TriangleAlert } from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/Card';
import DataTable from '../../Components/DataTable';
import CompactList, { AksiBaris } from '../../Components/CompactList';
import ConfirmationModal from '../../Components/ConfirmationModal';
import Breadcrumbs from '../../Components/Breadcrumbs';
import PageTabs from '../../Components/PageTabs';
import MetricCard from '../../Components/MetricCard';
import Pagination from '../../Components/Pagination';

/** Jumlah baris per halaman untuk daftar rapat ponsel (sama seperti tabel desktop). */
const PER_HALAMAN_HP = 10;

/** admin & project_manager bebas menghapus; peran lain hanya baris dengan created_by miliknya. */
const bolehHapusBaris = (row, user) =>
    !!row && (['admin', 'project_manager'].includes(user?.role) || (user?.id != null && row.created_by === user.id));

const KELAS_VERDICT = {
    ACCEPT: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    CONDITIONAL: 'bg-amber-50 text-amber-800 border border-amber-200',
    REJECT: 'bg-rose-50 text-rose-800 border border-rose-200',
    'NOT ACCEPT': 'bg-rose-50 text-rose-800 border border-rose-200',
};

const kolomAtp = (bolehHapus, onHapus) => [
    {
        accessorKey: 'nama_site',
        header: 'Nama Site',
        cell: ({ getValue }) => (
            <span className="block max-w-[200px] truncate font-bold text-gray-900" title={getValue() || ''}>
                {getValue() || '-'}
            </span>
        ),
        exportValue: (row) => row.nama_site ?? '',
    },
    {
        accessorKey: 'tanggal',
        header: 'Tanggal',
        cell: ({ getValue }) => <span className="text-gray-500">{getValue() || '-'}</span>,
        exportValue: (row) => row.tanggal ?? '',
    },
    {
        accessorKey: 'region',
        header: 'Region',
        cell: ({ getValue }) => (
            <span className="block max-w-[160px] truncate text-gray-600" title={getValue() || ''}>
                {getValue() || '-'}
            </span>
        ),
        exportValue: (row) => row.region ?? '',
    },
    {
        accessorKey: 'no_po',
        header: 'No. PO',
        cell: ({ getValue }) => (
            <span className="block max-w-[180px] truncate font-medium text-gray-700" title={getValue() || ''}>
                {getValue() || '-'}
            </span>
        ),
        exportValue: (row) => row.no_po ?? '',
    },
    {
        accessorKey: 'verdict',
        header: 'Putusan',
        cell: ({ getValue }) => {
            const verdict = getValue();
            return (
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${KELAS_VERDICT[verdict] || 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
                    {verdict || '-'}
                </span>
            );
        },
        exportValue: (row) => row.verdict ?? '',
    },
    {
        id: 'aksi',
        header: 'Aksi',
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }) => (
            <div className="flex items-center gap-1">
                <Link
                    href={`/atp/${row.original.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 min-h-[44px] sm:min-h-0 rounded-lg border border-gray-300 bg-surface text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-black transition"
                >
                    Detail
                </Link>
                {/* Hapus tampil hanya bila peran/pemilik baris mengizinkan */}
                {bolehHapus(row.original) && (
                    <AksiBaris
                        label={`Hapus ATP ${row.original.nama_site || ''}`}
                        onClick={() => onHapus(row.original)}
                        ikon={Trash2}
                        tone="bahaya"
                    />
                )}
            </div>
        ),
    },
];

export default function AtpDashboard({ stats, recent }) {
    const { auth } = usePage().props;
    const [verdictAktif, setVerdictAktif] = useState(null);
    const [pendingHapus, setPendingHapus] = useState(null);

    const bolehHapus = (row) => bolehHapusBaris(row, auth?.user);

    // Kolom tabel dibangun sekali: aksi hapus memakai state konfirmasi halaman ini.
    const kolom = useMemo(() => kolomAtp(bolehHapus, setPendingHapus), [auth?.user?.id, auth?.user?.role]);

    const kirimHapus = () => {
        if (!pendingHapus) return;

        router.delete(`/atp/${pendingHapus.id}`, { preserveScroll: true });
        setPendingHapus(null);
    };

    // Badge tiap kartu memakai porsi terhadap total ATP; catatan menjelaskan
    // tindak lanjut sesuai panduan kategori putusan di bawah.
    const totalAtp = stats.total ?? 0;
    const porsiTotal = (jumlah) => (totalAtp > 0 ? Math.round(((jumlah ?? 0) / totalAtp) * 100) : 0);
    const disetujui = (stats.accept ?? 0) + (stats.conditional ?? 0);

    const kartuAtp = [
        {
            label: 'Total ATP',
            nilai: stats.total,
            verdict: null,
            badge: `${disetujui} disetujui`,
            badgeIcon: FileText,
            badgeTone: 'netral',
            note: `${stats.pending ?? 0} menunggu putusan`,
        },
        {
            label: 'Accept',
            nilai: stats.accept,
            verdict: 'ACCEPT',
            badge: `${porsiTotal(stats.accept)}% dari total`,
            badgeIcon: CircleCheck,
            badgeTone: 'naik',
            note: 'Dokumen BAL & BASTP dapat ditandatangani',
        },
        {
            label: 'Conditional',
            nilai: stats.conditional,
            verdict: 'CONDITIONAL',
            badge: `${porsiTotal(stats.conditional)}% dari total`,
            badgeIcon: TriangleAlert,
            badgeTone: 'peringatan',
            note: 'Perbaikan minor maksimal 7 hari kerja',
        },
        {
            label: 'Reject',
            nilai: stats.reject,
            verdict: 'REJECT',
            badge: `${porsiTotal(stats.reject)}% dari total`,
            badgeIcon: CircleX,
            badgeTone: (stats.reject ?? 0) > 0 ? 'turun' : 'naik',
            note: 'Perbaikan total lalu ATP ulang',
        },
        {
            label: 'Pending',
            nilai: stats.pending,
            verdict: 'PENDING',
            badge: `${porsiTotal(stats.pending)}% dari total`,
            badgeIcon: Clock,
            badgeTone: 'netral',
            note: 'Belum ada putusan pada checklist',
        },
    ];

    const recentTampil = useMemo(() => {
        if (!verdictAktif) return recent;
        if (verdictAktif === 'PENDING') return recent.filter((row) => !row.verdict);
        return recent.filter((row) => row.verdict === verdictAktif);
    }, [recent, verdictAktif]);

    // Pencarian khusus ponsel: toolbar DataTable ikut tersembunyi di bawah md,
    // jadi daftar rapat butuh pencariannya sendiri.
    const [cariHp, setCariHp] = useState('');
    const recentHp = useMemo(() => {
        const kata = cariHp.trim().toLowerCase();
        if (!kata) return recentTampil;
        return recentTampil.filter((row) =>
            [row.nama_site, row.region, row.no_po].some((nilai) => String(nilai || '').toLowerCase().includes(kata)),
        );
    }, [cariHp, recentTampil]);

    // Daftar rapat ponsel dipaginasi sendiri supaya tidak menumpuk panjang saat data banyak.
    const [halamanHp, setHalamanHp] = useState(1);
    useEffect(() => setHalamanHp(1), [cariHp, verdictAktif]);
    const recentHpHalaman = recentHp.slice((halamanHp - 1) * PER_HALAMAN_HP, halamanHp * PER_HALAMAN_HP);

    return (
        <>
            <Head title="ATP Dashboard - Web CME" />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'ATP Check' }
            ]} />

            <PageTabs tabs={[
                { label: 'Daftar ATP', href: '/atp', active: true },
                { label: 'Papan Status', href: '/atp/papan', active: false },
                { label: 'Template ATP', href: '/template', active: false },
            ]} />

            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines">
                    ATP Dashboard
                </h1>
                <p className="text-sm text-gray-500 font-headlines mt-1">
                    Acceptance Test Procedure Monitoring Hub
                </p>
            </div>

            {/* Mobile: dua kartu per baris agar metrik tidak memanjang satu kolom */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-8">
                {kartuAtp.map((kartu) => (
                    <button
                        key={kartu.label}
                        type="button"
                        onClick={() => setVerdictAktif(kartu.verdict)}
                        className={`w-full min-w-0 cursor-pointer rounded-xl text-left transition duration-150 ${verdictAktif === kartu.verdict ? 'ring-2 ring-gray-300' : ''}`}
                    >
                        <MetricCard
                            title={kartu.label}
                            value={kartu.nilai ?? 0}
                            badge={kartu.badge}
                            badgeIcon={kartu.badgeIcon}
                            badgeTone={kartu.badgeTone}
                            note={kartu.note}
                        />
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-8">
                <div className="space-y-6">
                    <div>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-900">ATP Terbaru</h2>
                            <Link
                                href="/atp/baru"
                                className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] sm:min-h-0 bg-primary hover:bg-primary-strong text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-lg transition"
                            >
                                + ATP Baru
                            </Link>
                        </div>

                        {/* Mobile: daftar rapat agar kolom tidak perlu digeser */}
                        <div className="xl:hidden">
                            {/* Mobile: pencarian sendiri, toolbar cari DataTable tersembunyi di bawah xl */}
                            <div className="relative mb-3">
                                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 stroke-[1.5] text-gray-400" aria-hidden="true" />
                                <input
                                    type="search"
                                    value={cariHp}
                                    onChange={(e) => setCariHp(e.target.value)}
                                    placeholder="Cari ATP (nama site, region, no. PO)"
                                    aria-label="Cari ATP"
                                    className="h-11 w-full rounded-lg border border-border bg-surface pr-3 pl-10 text-sm outline-none focus:border-primary focus:ring focus:ring-primary/20"
                                />
                            </div>
                            <CompactList
                                rows={recentHpHalaman}
                                kunci={(row) => row.id}
                                judul={(row) => row.nama_site || '-'}
                                meta={(row) => [row.tanggal, row.region, row.no_po]}
                                nuansa={(row) => (
                                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${KELAS_VERDICT[row.verdict] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                        {row.verdict || '-'}
                                    </span>
                                )}
                                tautan={(row) => `/atp/${row.id}`}
                                aksi={(row) =>
                                    bolehHapus(row) && (
                                        <AksiBaris
                                            label={`Hapus ATP ${row.nama_site || ''}`}
                                            onClick={() => setPendingHapus(row)}
                                            ikon={Trash2}
                                            tone="bahaya"
                                        />
                                    )
                                }
                                kosong={cariHp.trim() ? 'Tidak ada ATP yang cocok' : 'Belum ada data ATP'}
                            />

                            {/* Mobile: paginasi sendiri, agar daftar rapat tidak menumpuk panjang */}
                            <Pagination
                                currentPage={halamanHp}
                                totalPages={Math.max(1, Math.ceil(recentHp.length / PER_HALAMAN_HP))}
                                onPageChange={setHalamanHp}
                                totalItems={recentHp.length}
                            />
                        </div>

                        {/* Desktop: tabel lama tetap dipakai dari xl ke atas */}
                        <div className="hidden xl:block">
                            <DataTable
                                columns={kolom}
                                data={recentTampil}
                                cariPlaceholder="Cari ATP..."
                                namaEkspor="atp-terbaru"
                                modulEkspor="ATP"
                                kosongPesan="Belum ada data ATP"
                            />
                        </div>
                    </div>

                    <Card title="Panduan Kategori Putusan">
                        <div className="space-y-4 text-xs text-gray-600">
                            <div className="space-y-3">
                                <div className="flex gap-3">
                                    <span className="w-2.5 h-2.5 mt-1 rounded-full bg-emerald-500 flex-shrink-0" />
                                    <div>
                                        <p className="font-bold text-gray-900">ACCEPT</p>
                                        <p className="text-[11px]">Seluruh checklist item bernilai YES. Dokumen BAL & BASTP dapat ditandatangani.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <span className="w-2.5 h-2.5 mt-1 rounded-full bg-amber-500 flex-shrink-0" />
                                    <div>
                                        <p className="font-bold text-gray-900">CONDITIONAL</p>
                                        <p className="text-[11px]">Sebagian kecil checklist minor bernilai NO. Butuh perbaikan minor dalam 7 hari kerja.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <span className="w-2.5 h-2.5 mt-1 rounded-full bg-rose-500 flex-shrink-0" />
                                    <div>
                                        <p className="font-bold text-gray-900">REJECT</p>
                                        <p className="text-[11px]">Terdapat checklist kritikal bernilai NO. Harus dilakukan perbaikan total dan re-ATP.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-3 border-t">
                                <Link href="/instruction" className="text-xs font-bold text-primary hover:underline">
                                    Lihat Panduan Teknis (SOW) &rarr;
                                </Link>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <ConfirmationModal
                isOpen={pendingHapus !== null}
                onClose={() => setPendingHapus(null)}
                onConfirm={kirimHapus}
                title="Hapus ATP"
                message={`Data ATP site ${pendingHapus?.nama_site || '-'} beserta dokumen BAL/BASTP dan fotonya akan dihapus permanen. Lanjutkan?`}
                type="danger"
                confirmText="Ya, Hapus"
            />
        </>
    );
}

AtpDashboard.layout = page => <AppLayout children={page} />;
