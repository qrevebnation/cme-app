import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Breadcrumbs from '../../Components/Breadcrumbs';
import Card from '../../Components/Card';
import Table from '../../Components/Table';
import Search, { filterData } from '../../Components/Search';
import Pagination from '../../Components/Pagination';
import ConfirmationModal from '../../Components/ConfirmationModal';
import DocumentPreview from '../../Components/DocumentPreview';
import Button from '../../Components/Button';
import { Plus, Eye, Pencil, Printer, Trash2 } from 'lucide-react';
import CompactList, { AksiBaris } from '../../Components/CompactList';

const KELAS_TOMBOL_KECIL = 'px-2.5 py-1 bg-surface border border-border text-xs font-semibold text-gray-700 rounded-md hover:bg-gray-50 hover:border-primary hover:text-primary transition';

const KELAS_CHIP = 'inline-flex h-11 items-center rounded-md px-3 text-xs font-semibold transition md:h-8';
const KELAS_INPUT_TANGGAL = 'h-11 rounded-md border border-border bg-surface px-2 text-sm shadow-sm outline-none transition focus:border-primary focus:ring focus:ring-primary/20 md:h-8';

const MODE_SEMUA = 'semua';
const MODE_BULAN = 'bulan';
const MODE_TAHUN = 'tahun';
const MODE_RENTANG = 'rentang';

const CHIP_PERIODE = [
    { nilai: MODE_SEMUA, label: 'Semua' },
    { nilai: MODE_BULAN, label: 'Bulan ini' },
    { nilai: MODE_TAHUN, label: 'Tahun ini' },
    { nilai: MODE_RENTANG, label: 'Rentang…' },
];

const keTanggal = (d) => {
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const rentangBulan = (now = new Date()) => [
    keTanggal(new Date(now.getFullYear(), now.getMonth(), 1)),
    keTanggal(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
];

const rentangTahun = (now = new Date()) => [`${now.getFullYear()}-01-01`, `${now.getFullYear()}-12-31`];

// Filter datang dari query string, jadi chip yang aktif disimpulkan dari rentangnya
// agar tampilan tetap benar setelah halaman dimuat ulang.
const modeAwal = (dari, sampai) => {
    if (!dari && !sampai) return MODE_SEMUA;
    const [bulanDari, bulanSampai] = rentangBulan();
    if (dari === bulanDari && sampai === bulanSampai) return MODE_BULAN;
    const [tahunDari, tahunSampai] = rentangTahun();
    if (dari === tahunDari && sampai === tahunSampai) return MODE_TAHUN;
    return MODE_RENTANG;
};

export default function Index({ records = [], filters = {} }) {
    const { props } = usePage();
    const user = props.auth?.user;
    const canManage = user && ['admin', 'project_manager'].includes(user.role);

    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [dari, setDari] = useState(filters.dari || '');
    const [sampai, setSampai] = useState(filters.sampai || '');
    const [mode, setMode] = useState(() => modeAwal(filters.dari || '', filters.sampai || ''));
    const [deleteId, setDeleteId] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [dokumen, setDokumen] = useState(null);

    const terfilter = filterData(records, searchQuery);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(terfilter.length / itemsPerPage);
    const halaman = terfilter.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const terapkanFilter = (dariBaru, sampaiBaru) => {
        router.get('/material-request', { dari: dariBaru, sampai: sampaiBaru }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const ubahCari = (nilai) => {
        setSearchQuery(nilai);
        setCurrentPage(1);
    };

    // Rentang hanya membuka input tanggal; permintaan dikirim saat "Terapkan" ditekan.
    const pilihPeriode = (modeBaru) => {
        setMode(modeBaru);
        if (modeBaru === MODE_RENTANG) return;

        const [dariBaru, sampaiBaru] = modeBaru === MODE_BULAN
            ? rentangBulan()
            : modeBaru === MODE_TAHUN
                ? rentangTahun()
                : ['', ''];

        setDari(dariBaru);
        setSampai(sampaiBaru);
        setCurrentPage(1);
        terapkanFilter(dariBaru, sampaiBaru);
    };

    const terapkanRentang = () => {
        setCurrentPage(1);
        terapkanFilter(dari, sampai);
    };

    const konfirmasiHapus = () => {
        if (!deleteId) return;
        setDeleting(true);
        router.delete(`/material-request/${deleteId}`, {
            onSuccess: () => {
                setDeleteId(null);
                setDeleting(false);
            },
            onError: () => setDeleting(false),
        });
    };

    return (
        <>
            <Head title="Request Material - Web CME" />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Request Material' },
            ]} />

            <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines">
                        Riwayat Request Material
                    </h1>
                    <p className="text-sm text-gray-500 font-headlines mt-1">
                        Daftar permintaan barang/material beserta status item yang diminta.
                    </p>
                </div>
                {canManage && (
                    <Link href="/material-request/baru">
                        <Button className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold">
                            <Plus className="h-4 w-4 stroke-[1.5]" />
                            Buat Request
                        </Button>
                    </Link>
                )}
            </div>

            <Card className="mb-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    {/* Chip periode: satu bingkai bersudut kontrol, bukan tombol berbentuk pil penuh. */}
                    <div
                        className="flex w-fit max-w-full flex-wrap items-center gap-1 rounded-lg border border-border bg-surface p-0.5"
                        role="group"
                        aria-label="Filter periode"
                    >
                        {CHIP_PERIODE.map((chip) => (
                            <button
                                key={chip.nilai}
                                type="button"
                                aria-pressed={mode === chip.nilai}
                                onClick={() => pilihPeriode(chip.nilai)}
                                className={`${KELAS_CHIP} ${
                                    mode === chip.nilai
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-gray-600 hover:bg-surface'
                                }`}
                            >
                                {chip.label}
                            </button>
                        ))}
                    </div>
                    <Search
                        placeholder="Cari no. pengajuan, site, requestor..."
                        value={searchQuery}
                        onChange={ubahCari}
                        className="[&_input]:h-11 [&_input]:py-0 md:[&_input]:h-8"
                    />
                </div>

                {mode === MODE_RENTANG && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <input
                            type="date"
                            value={dari}
                            aria-label="Tanggal awal"
                            onChange={e => setDari(e.target.value)}
                            className={KELAS_INPUT_TANGGAL}
                        />
                        <span className="text-xs text-gray-500">s/d</span>
                        <input
                            type="date"
                            value={sampai}
                            aria-label="Tanggal akhir"
                            onChange={e => setSampai(e.target.value)}
                            className={KELAS_INPUT_TANGGAL}
                        />
                        <Button
                            type="button"
                            onClick={terapkanRentang}
                            className="h-11 md:h-8"
                        >
                            Terapkan
                        </Button>
                    </div>
                )}
            </Card>

            <Card title="Daftar Request Material">
                {/* Desktop: tabel lama tetap tampil sejak xl ke atas */}
                <div className="hidden xl:block">
                <Table headers={['No. Pengajuan', 'Tanggal', 'Stasiun/Site', 'Reason', 'Item', 'Requestor', 'Aksi']}>
                    {halaman.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="px-6 py-8 text-center text-gray-400 font-medium">
                                Belum ada data
                            </td>
                        </tr>
                    ) : (
                        halaman.map(row => (
                            <tr key={row.id} className="hover:bg-gray-50/50">
                                <td className="px-3 py-3 sm:px-6 sm:py-4 font-bold text-gray-900">{row.no_pengajuan || row.no_form}</td>
                                <td className="px-3 py-3 sm:px-6 sm:py-4 text-center text-gray-500">{row.tanggal}</td>
                                <td className="px-3 py-3 sm:px-6 sm:py-4 text-gray-700">{row.stasiun_site || '-'}</td>
                                <td className="px-3 py-3 sm:px-6 sm:py-4 text-gray-600 max-w-xs truncate" title={row.reason || ''}>
                                    {row.reason || '-'}
                                </td>
                                <td className="px-3 py-3 sm:px-6 sm:py-4 text-center text-gray-700">{row.jml_item}</td>
                                <td className="px-3 py-3 sm:px-6 sm:py-4 text-gray-700">{row.requestor || '-'}</td>
                                <td className="px-3 py-3 sm:px-6 sm:py-4">
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        <Link href={`/material-request/${row.id}`} className={KELAS_TOMBOL_KECIL}>
                                            Detail
                                        </Link>
                                        {canManage && (
                                            <>
                                                <Link href={`/material-request/${row.id}/edit`} className={KELAS_TOMBOL_KECIL}>
                                                    Edit
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => setDokumen({
                                                        judul: `Dokumen Permintaan Barang ${row.no_pengajuan || row.no_form}`,
                                                        src: `/print/material_request_print?id=${row.id}`,
                                                    })}
                                                    className={KELAS_TOMBOL_KECIL}
                                                >
                                                    Cetak PDF
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteId(row.id)}
                                                    className="px-2.5 py-1 bg-surface border border-border text-xs font-semibold text-danger rounded-md hover:bg-red-50 hover:border-red-300 transition"
                                                >
                                                    Hapus
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </Table>
                </div>

                {/* Mobile: daftar request satu baris agar kolom tidak perlu digeser */}
                <div className="xl:hidden">
                    <CompactList
                        rows={halaman}
                        kunci={row => row.id}
                        judul={row => row.no_pengajuan || row.no_form}
                        meta={row => [row.tanggal, row.stasiun_site || '-', row.requestor || '-', row.jml_item != null ? `${row.jml_item} item` : null]}
                        kosong="Belum ada data"
                        aksi={row => (
                            <>
                                {/* Mobile: Detail selalu ada; sisanya mengikuti hak akses, sama seperti tabel */}
                                <AksiBaris label="Detail" href={`/material-request/${row.id}`} ikon={Eye} />
                                {canManage && (
                                    <>
                                        <AksiBaris label="Edit" href={`/material-request/${row.id}/edit`} ikon={Pencil} />
                                        {/* Mobile: tombol ikon, dibuka di pratinjau dalam aplikasi seperti di tabel */}
                                        <button
                                            type="button"
                                            onClick={() => setDokumen({
                                                judul: `Dokumen Permintaan Barang ${row.no_pengajuan || row.no_form}`,
                                                src: `/print/material_request_print?id=${row.id}`,
                                            })}
                                            aria-label="Cetak PDF"
                                            title="Cetak PDF"
                                            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-sunken hover:text-text"
                                        >
                                            <Printer className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                        <AksiBaris label="Hapus" onClick={() => setDeleteId(row.id)} ikon={Trash2} tone="bahaya" />
                                    </>
                                )}
                            </>
                        )}
                    />
                </div>

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={terfilter.length}
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
                isOpen={deleteId !== null}
                onClose={() => setDeleteId(null)}
                onConfirm={konfirmasiHapus}
                title="Hapus Request Material"
                message="Data yang dihapus tidak bisa dikembalikan. Header dan seluruh baris material akan ikut terhapus."
                type="danger"
                confirmText={deleting ? 'Menghapus...' : 'Ya, Hapus'}
            />
        </>
    );
}

Index.layout = page => <AppLayout children={page} />;
