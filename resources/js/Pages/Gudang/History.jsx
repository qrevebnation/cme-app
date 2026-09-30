import React, { useMemo, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import DataTable from '../../Components/DataTable';
import CompactList, { AksiBaris } from '../../Components/CompactList';
import ConfirmationModal from '../../Components/ConfirmationModal';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Search, Edit, Trash2 } from 'lucide-react';
import Breadcrumbs from '../../Components/Breadcrumbs';

/** Badge tipe transaksi: dipakai kolom Tipe tabel dan nuansa daftar di ponsel. */
function BadgeTipe({ type }) {
    return type === 'masuk' ? (
        <span className="inline-flex shrink-0 items-center gap-1 bg-emerald-50 border border-emerald-250 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            <ArrowUpRight className="h-3 w-3 text-emerald-600 stroke-[2]" />
            Masuk
        </span>
    ) : (
        <span className="inline-flex shrink-0 items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
            <ArrowDownLeft className="h-3 w-3 text-amber-600 stroke-[2]" />
            Keluar
        </span>
    );
}

const OPSI_TIPE = [
    { label: 'Semua', value: '' },
    { label: 'Masuk (BM)', value: 'masuk' },
    { label: 'Keluar (BK)', value: 'keluar' },
];

/** Tautan halaman perbaikan transaksi: jenis menentukan jalur edit/hapus. */
const tautanBaris = (row, aksi) => `/gudang/${row.type === 'masuk' ? 'masuk' : 'keluar'}/${row.id}${aksi}`;

const kolomRiwayat = (onHapus) => [
    {
        accessorKey: 'type',
        header: 'Tipe',
        cell: ({ getValue }) => <BadgeTipe type={getValue()} />,
        exportValue: (row) => (row.type === 'masuk' ? 'Masuk' : 'Keluar'),
    },
    {
        accessorKey: 'no_form',
        header: 'No. Form',
        cell: ({ getValue }) => <span className="font-mono font-bold text-gray-900">{getValue() || '-'}</span>,
        exportValue: (row) => row.no_form ?? '',
    },
    {
        accessorKey: 'tanggal',
        header: 'Tanggal',
        cell: ({ getValue }) => <span className="text-gray-500 whitespace-nowrap">{getValue() || '-'}</span>,
        exportValue: (row) => row.tanggal ?? '',
    },
    {
        accessorKey: 'judul',
        header: 'Judul',
        cell: ({ getValue }) => <span className="font-semibold text-gray-800">{getValue() || '-'}</span>,
        exportValue: (row) => row.judul ?? '',
    },
    {
        accessorKey: 'pihak',
        header: 'Pihak',
        cell: ({ row }) => (
            <span className="font-medium text-gray-700">
                {row.original.pihak || '-'}
                {row.original.penerima_pengambil && row.original.penerima_pengambil !== row.original.pihak && (
                    <span className="block text-[10px] text-gray-400 font-normal">
                        PJ: {row.original.penerima_pengambil}
                    </span>
                )}
            </span>
        ),
        exportValue: (row) => row.pihak ?? '',
    },
    {
        accessorKey: 'lokasi',
        header: 'Lokasi Rak / Tujuan',
        cell: ({ getValue }) => <span className="text-gray-600 font-medium">{getValue() || '-'}</span>,
        exportValue: (row) => row.lokasi ?? '',
    },
    {
        id: 'aksi',
        header: 'Aksi',
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }) => (
            <div className="flex items-center gap-1">
                <Link
                    href={row.original.type === 'masuk' ? `/gudang/masuk-history/${row.original.id}` : `/gudang/keluar-history/${row.original.id}`}
                    className="inline-flex items-center justify-center px-3 py-1 bg-surface hover:bg-surface border border-border text-xs font-semibold text-text hover:text-primary rounded-lg transition duration-150"
                >
                    Detail
                </Link>
                <AksiBaris label="Edit Transaksi" href={tautanBaris(row.original, '/edit')} ikon={Edit} />
                <AksiBaris label="Hapus Transaksi" onClick={() => onHapus(row.original)} ikon={Trash2} tone="bahaya" />
            </div>
        ),
    },
];

export default function History({ transactions, filters }) {
    const [selectedType, setSelectedType] = useState(filters.type || '');
    const [cariPonsel, setCariPonsel] = useState('');
    const [pendingHapus, setPendingHapus] = useState(null);

    // Kolom tabel dibangun sekali: aksi hapus memakai state konfirmasi halaman ini.
    const kolom = useMemo(() => kolomRiwayat(setPendingHapus), []);

    const kirimHapus = () => {
        if (!pendingHapus) return;

        router.delete(tautanBaris(pendingHapus, ''), { preserveScroll: true });
        setPendingHapus(null);
    };

    const filteredTransactions = useMemo(
        () => (selectedType ? transactions.filter((tr) => tr.type === selectedType) : transactions),
        [transactions, selectedType],
    );

    // Pencarian ponsel: toolbar DataTable ikut tersembunyi di bawah md, jadi daftar
    // disaring dengan kata kunci yang sama (no. form / judul / pihak).
    const transaksiPonsel = useMemo(() => {
        const kunci = cariPonsel.trim().toLowerCase();
        if (!kunci) return filteredTransactions;
        return filteredTransactions.filter((tr) =>
            [tr.no_form, tr.judul, tr.pihak].some((nilai) => String(nilai ?? '').toLowerCase().includes(kunci)),
        );
    }, [filteredTransactions, cariPonsel]);

    // Chip Tipe dipakai dua tempat: di luar kartu (ponsel) dan di toolbar tabel (desktop),
    // supaya filter tetap terlihat dan berlaku untuk kedua tampilan.
    const chipsTipe = (
        <div className="flex items-center gap-1.5">
            {OPSI_TIPE.map((opsi) => (
                <button
                    key={opsi.label}
                    type="button"
                    onClick={() => setSelectedType(opsi.value)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                        selectedType === opsi.value
                            ? 'border-primary bg-primary/10 text-primary dark:text-primary-strong'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    {opsi.label}
                </button>
            ))}
        </div>
    );

    return (
        <>
            <Head title="Riwayat Transaksi Gudang - Web CME" />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Inventory', href: '/gudang' },
                { label: 'Riwayat Transaksi' }
            ]} />

            <div className="mb-6 flex items-center gap-3">
                <Link
                    href="/gudang"
                    className="inline-flex items-center justify-center p-2 rounded-lg border border-gray-300 bg-surface text-gray-500 hover:bg-gray-50 hover:text-black transition shrink-0"
                >
                    <ArrowLeft className="h-4 w-4 stroke-[1.5]" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines">
                        Riwayat Transaksi Gudang
                    </h1>
                    <p className="text-sm text-gray-500 font-headlines mt-1">
                        Log gabungan seluruh barang masuk (BM) dan barang keluar (BK) dari inventaris.
                    </p>
                </div>
            </div>

            {/* Pencarian ponsel: toolbar DataTable tersembunyi di bawah xl, tinggi 44 px */}
            <div className="relative mb-3 xl:hidden">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400 stroke-[1.5]" aria-hidden="true" />
                <input
                    type="search"
                    value={cariPonsel}
                    onChange={(e) => setCariPonsel(e.target.value)}
                    placeholder="Cari no. form / judul / pihak..."
                    className="h-11 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm text-text shadow-sm outline-none transition placeholder-gray-400 focus:border-primary focus:ring focus:ring-primary/20"
                />
            </div>

            {/* Chip Tipe di luar kartu tabel agar tetap terlihat saat tabel disembunyikan di ponsel */}
            <div className="mb-3 xl:hidden">{chipsTipe}</div>

            {/* Mobile: daftar rapat agar kolom tidak perlu digeser */}
            <div className="xl:hidden">
                <CompactList
                    rows={transaksiPonsel}
                    kunci={(row) => `${row.type}-${row.id}`}
                    judul={(row) => row.judul || '-'}
                    nuansa={(row) => <BadgeTipe type={row.type} />}
                    meta={(row) => [row.no_form, row.tanggal, row.pihak]}
                    tautan={(row) => row.type === 'masuk' ? `/gudang/masuk-history/${row.id}` : `/gudang/keluar-history/${row.id}`}
                    aksi={(row) => (
                        <>
                            <AksiBaris label="Edit Transaksi" href={tautanBaris(row, '/edit')} ikon={Edit} />
                            <AksiBaris label="Hapus Transaksi" onClick={() => setPendingHapus(row)} ikon={Trash2} tone="bahaya" />
                        </>
                    )}
                    kosong="Belum ada log transaksi yang sesuai"
                />
            </div>

            {/* Desktop: tabel riwayat tetap dipakai dari xl ke atas */}
            <div className="hidden xl:block">
                <DataTable
                    columns={kolom}
                    data={filteredTransactions}
                    cariPlaceholder="Cari riwayat..."
                    namaEkspor="riwayat-transaksi"
                    modulEkspor="Riwayat Gudang"
                    kosongPesan="Belum ada log transaksi yang sesuai"
                    toolbar={chipsTipe}
                />
            </div>

            <ConfirmationModal
                isOpen={pendingHapus !== null}
                onClose={() => setPendingHapus(null)}
                onConfirm={kirimHapus}
                title="Hapus Transaksi"
                message={`Transaksi ${pendingHapus?.no_form || ''} beserta seluruh rinciannya akan dihapus dan stok barang dikembalikan. Lanjutkan?`}
                type="danger"
                confirmText="Ya, Hapus"
            />
        </>
    );
}

History.layout = page => <AppLayout children={page} />;
