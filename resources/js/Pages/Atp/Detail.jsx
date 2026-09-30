import React, { useState, useEffect } from 'react';
import { Head, Link, useForm, router, usePage } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/Card';
import Table from '../../Components/Table';
import Button from '../../Components/Button';
import Input from '../../Components/Input';
import PhotoGallery from '../../Components/PhotoGallery';
import ResponsiveModal from '../../Components/ResponsiveModal';
import SiteMap from '../../Components/SiteMap';
import Timeline from '../../Components/Timeline';
import ConfirmationModal from '../../Components/ConfirmationModal';
import DocumentPreview from '../../Components/DocumentPreview';
import { Plus, Trash2, Printer, ArrowLeft, Pencil, FileSpreadsheet, FileText } from 'lucide-react';
import SearchInput, { filterData } from '../../Components/Search';
import Pagination from '../../Components/Pagination';
import Breadcrumbs from '../../Components/Breadcrumbs';
import CompactList from '../../Components/CompactList';

export default function Detail({ record }) {
    const { auth } = usePage().props;
    const [showBalForm, setShowBalForm] = useState(false);
    const [showBastpForm, setShowBastpForm] = useState(false);
    const [deletingBal, setDeletingBal] = useState(false);
    const [deletingBastp, setDeletingBastp] = useState(false);
    const [galeriIdx, setGaleriIdx] = useState(null);
    // Dokumen yang sedang dipratinjau di dalam aplikasi: null = modal tertutup.
    const [dokumen, setDokumen] = useState(null);
    // admin & project_manager bebas menghapus; peran lain hanya record dengan created_by miliknya.
    const bolehHapus = ['admin', 'project_manager'].includes(auth?.user?.role)
        || (auth?.user?.id != null && record.created_by === auth.user.id);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null
    });

    // Define initial values for disabling fields if pre-filled
    const initialBalValues = {
        project: record.bal?.project || record.nama_site || '',
        no_po: record.bal?.no_po || record.no_po || '',
        tanggal_mulai: record.bal?.tanggal_mulai || '',
        tanggal: record.bal?.tanggal || record.tanggal || '',
        pelaksana: record.bal?.pelaksana || record.hasil_json?.approval?.vendor_company || '',
        lokasi: record.bal?.lokasi || record.nama_site || '',
        hasil: record.bal?.hasil || record.verdict || '',
        pihak1: record.bal?.pihak1 || record.hasil_json?.approval?.vendor_company || '',
        pihak2: record.bal?.pihak2 || record.hasil_json?.approval?.cme_company || '',
        nama1: record.bal?.nama1 || record.hasil_json?.approval?.vendor_1_name || '',
        jabatan1: record.bal?.jabatan1 || record.hasil_json?.approval?.vendor_1_role || '',
        nama2: record.bal?.nama2 || record.hasil_json?.approval?.cme_1_name || '',
        jabatan2: record.bal?.jabatan2 || record.hasil_json?.approval?.cme_1_role || '',
    };

    const initialBastpValues = {
        p1_nama: record.bastp?.p1_nama || record.hasil_json?.approval?.vendor_1_name || '',
        p1_alamat: record.bastp?.p1_alamat || '',
        p2_nama: record.bastp?.p2_nama || record.hasil_json?.approval?.cme_1_name || '',
        p2_jabatan: record.bastp?.p2_jabatan || record.hasil_json?.approval?.cme_1_role || '',
        p2_alamat: record.bastp?.p2_alamat || '',
        pekerjaan: record.bastp?.pekerjaan || '',
        mengetahui1: record.bastp?.mengetahui1 || '',
        mengetahui2: record.bastp?.mengetahui2 || '',
        photos: record.bastp?.photos || '',
    };

    // Initial forms states for BAL
    const balForm = useForm({ ...initialBalValues });

    // Initial forms states for BASTP
    const bastpForm = useForm({ ...initialBastpValues });

    // Riwayat langkah dokumen untuk garis waktu.
    const tampilWaktu = (nilai) =>
        nilai
            ? new Date(nilai).toLocaleString('id-ID', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
              })
            : null;

    const riwayatDokumen = [
        {
            judul: 'ATP dibuat',
            waktu: tampilWaktu(record.created_at),
            keterangan: `Site ${record.nama_site || '-'}`,
            status: 'selesai',
        },
        {
            judul: 'Putusan ditetapkan',
            keterangan: record.verdict ? `Hasil: ${record.verdict}` : 'Belum ada putusan',
            status: record.verdict ? 'selesai' : 'menunggu',
        },
        {
            judul: 'BAL (Berita Acara Lapangan)',
            waktu: tampilWaktu(record.bal?.created_at),
            keterangan: record.bal ? 'Dokumen sudah dibuat' : 'Belum dibuat',
            status: record.bal ? 'selesai' : 'menunggu',
        },
        {
            judul: 'BASTP (Serah Terima Pekerjaan)',
            waktu: tampilWaktu(record.bastp?.created_at),
            keterangan: record.bastp ? 'Dokumen sudah dibuat' : 'Belum dibuat',
            status: record.bastp ? 'selesai' : 'menunggu',
        },
    ];

    const handleSaveBal = (e) => {
        e.preventDefault();
        setConfirmModal({
            isOpen: true,
            title: 'Simpan Berita Acara Lapangan (BAL)',
            message: 'Apakah Anda yakin ingin menyimpan dokumen BAL ini? Dokumen dapat diubah kembali kapan saja.',
            type: 'info',
            onConfirm: () => {
                balForm.post(`/atp/${record.id}/bal`, {
                    onSuccess: () => setShowBalForm(false)
                });
            }
        });
    };

    const handleSaveBastp = (e) => {
        e.preventDefault();
        setConfirmModal({
            isOpen: true,
            title: 'Simpan BASTP / Handover',
            message: 'Apakah Anda yakin ingin menyimpan dokumen BASTP ini? Dokumen dapat diubah kembali kapan saja.',
            type: 'info',
            onConfirm: () => {
                bastpForm.post(`/atp/${record.id}/bastp`, {
                    onSuccess: () => setShowBastpForm(false)
                });
            }
        });
    };

    const handleDeleteBal = (e) => {
        if (e) e.preventDefault();
        setConfirmModal({
            isOpen: true,
            title: 'Hapus Berita Acara Lapangan (BAL)',
            message: 'Apakah Anda yakin ingin menghapus dokumen BAL ini? Tindakan ini tidak dapat dibatalkan.',
            type: 'danger',
            onConfirm: () => {
                setDeletingBal(true);
                router.delete(`/atp/${record.id}/bal`, {
                    preserveScroll: true,
                    preserveState: true,
                    onFinish: () => setDeletingBal(false)
                });
            }
        });
    };

    const handleDeleteBastp = (e) => {
        if (e) e.preventDefault();
        setConfirmModal({
            isOpen: true,
            title: 'Hapus BASTP / Handover',
            message: 'Apakah Anda yakin ingin menghapus dokumen BASTP ini? Tindakan ini tidak dapat dibatalkan.',
            type: 'danger',
            onConfirm: () => {
                setDeletingBastp(true);
                router.delete(`/atp/${record.id}/bastp`, {
                    preserveScroll: true,
                    preserveState: true,
                    onFinish: () => setDeletingBastp(false)
                });
            }
        });
    };

    const app = record.hasil_json?.approval || {};
    const itemNames = record.hasil_json?.itemNames || {};
    const itemStds = record.hasil_json?.itemStds || {};
    const itemTools = record.hasil_json?.itemTools || {};
    const itemVals = record.hasil_json?.items || {};
    const itemHasil = record.hasil_json?.hasil || {};
    const itemCatatan = record.hasil_json?.catatan || {};

    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const handleSearchChange = (query) => {
        setSearchQuery(query);
        setCurrentPage(1);
    };

    const itemsList = Object.entries(itemNames).map(([key, name]) => ({
        key,
        name,
        tool: itemTools[key],
        std: itemStds[key],
        hasil: itemHasil[key],
        val: itemVals[key],
        catatan: itemCatatan[key],
        // Foto disaring sekali di sini supaya tabel (md ke atas) dan daftar ponsel pakai sumber yang sama.
        photos: (record.photos || []).filter(p => String(p.item_id) === String(key))
    }));

    // Warna badge status penilaian checklist: OK hijau, NG merah, NA kuning, kosong abu.
    const badgeChecklist = (status) => {
        if (status === 'OK') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
        if (status === 'NG') return 'bg-rose-50 text-rose-800 border-rose-200';
        if (status === 'NA') return 'bg-amber-50 text-amber-800 border-amber-200';
        return 'bg-gray-50 text-gray-500 border-gray-200';
    };

    const filteredItems = filterData(itemsList, searchQuery);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    // Galeri: satu daftar supaya panah prev/next jelajah semua foto checkpoint.
    const galeriFoto = (record.photos || []).map((p) => ({
        src: p.file_url,
        nama: itemNames[String(p.item_id)] || p.file_url?.split('/').pop() || '',
    }));
    const bukaGaleri = (photo) => {
        const idx = galeriFoto.findIndex((g) => g.src === photo.file_url);
        setGaleriIdx(idx >= 0 ? idx : 0);
    };
    // Tanggal awal 0000-00-00 (#74) tampil sebagai strip, bukan tanggal rusak.
    const tampilTanggal = (nilai) => (!nilai || String(nilai).startsWith('0000') ? '-' : nilai);
    // Redirect pasca-simpan ?cetak=<dok>: buka modal cetak lalu bersihkan param.
    const petaCetak = {
        atp_print: 'Dokumen ATP',
        atp_cover: 'Cover ATP',
        atp_bal: 'Berita Acara Lapangan (BAL)',
        atp_bastp: 'BASTP / Handover',
        print_survey: 'Laporan Survey (A4)',
    };
    useEffect(() => {
        const param = new URLSearchParams(window.location.search).get('cetak');
        if (param && petaCetak[param]) {
            setDokumen({ judul: petaCetak[param], src: `/print/${param}?id=${record.id}` });
            const url = new URL(window.location.href);
            url.searchParams.delete('cetak');
            window.history.replaceState({}, '', url.toString());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            <Head title={`ATP Detail ${record.nama_site} - Web CME`} />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'ATP Check', href: '/atp' },
                { label: record.nama_site || `ATP #${record.id}` }
            ]} />

            {/* Mobile: header melipat agar klaster tombol turun baris dan tidak melebar di 390 px */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
                <Link
                    href="/atp"
                    aria-label="Kembali ke daftar ATP"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-surface text-gray-500 hover:bg-gray-50 hover:text-black transition sm:h-9 sm:w-9"
                >
                    <ArrowLeft className="h-4 w-4 stroke-[1.5]" />
                </Link>
                <div className="min-w-0 flex-grow">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines">
                        Detail ATP Check
                    </h1>
                    <p className="text-sm text-gray-500 font-headlines mt-1 break-words">
                        Informasi site {record.nama_site || '-'} &bull; No. PO: {record.no_po || '-'}
                    </p>
                </div>
                {/* Mobile: klaster aksi vertikal penuh; desktop baris. Tanpa strip overflow-x-auto. */}
                <div className="mt-1 flex w-full flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <Link
                        href={`/atp/${record.id}/edit`}
                        className="inline-flex h-11 w-full items-center justify-center px-3.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold uppercase rounded-lg transition sm:h-9 sm:w-auto"
                    >
                        Edit
                    </Link>
                    {/* Pratinjau internal: dokumen cetak tampil di modal, tab baru tetap tersedia dari sana */}
                    <button
                        type="button"
                        onClick={() => setDokumen({ judul: 'Dokumen ATP', src: `/print/atp_print?id=${record.id}` })}
                        className="inline-flex h-11 w-full items-center justify-center px-3.5 bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-strong text-xs font-bold uppercase rounded-lg transition sm:h-9 sm:w-auto"
                    >
                        Cetak ATP
                    </button>
                    <button
                        type="button"
                        onClick={() => setDokumen({ judul: 'Cover ATP', src: `/print/atp_cover?id=${record.id}` })}
                        className="inline-flex h-11 w-full items-center justify-center px-3.5 bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-strong text-xs font-bold uppercase rounded-lg transition sm:h-9 sm:w-auto"
                    >
                        Cover
                    </button>
                    {/* CSV/Markdown bukan HTML: tautan tetap mengunduh berkas seperti sebelumnya,
                        pratinjau hanya menyediakan tombol "Buka di tab" (tanpa iframe). */}
                    <a
                        href={`/ekspor/atp?id=${record.id}`}
                        onClick={() => setDokumen({ judul: 'Ekspor CSV ATP', src: `/ekspor/atp?id=${record.id}`, jenis: 'unduhan' })}
                        title="Ekspor CSV"
                        className="inline-flex h-11 w-full items-center justify-center gap-1.5 px-3.5 border border-gray-300 bg-surface text-gray-600 hover:bg-gray-50 hover:text-black text-xs font-bold uppercase rounded-lg transition sm:h-9 sm:w-auto"
                    >
                        <FileSpreadsheet className="h-4 w-4 stroke-[1.5]" />
                        CSV
                    </a>
                    <a
                        href={`/ekspor/atp?id=${record.id}&type=md`}
                        onClick={() => setDokumen({ judul: 'Ekspor Markdown ATP', src: `/ekspor/atp?id=${record.id}&type=md`, jenis: 'unduhan' })}
                        title="Ekspor Markdown"
                        className="inline-flex h-11 w-full items-center justify-center gap-1.5 px-3.5 border border-gray-300 bg-surface text-gray-600 hover:bg-gray-50 hover:text-black text-xs font-bold uppercase rounded-lg transition sm:h-9 sm:w-auto"
                    >
                        <FileText className="h-4 w-4 stroke-[1.5]" />
                        Markdown
                    </a>
                    {/* Hapus tampil hanya bila peran/pemilik record mengizinkan */}
                    {bolehHapus && (
                        <button
                            type="button"
                            onClick={() => setConfirmModal({
                                isOpen: true,
                                title: 'Hapus ATP',
                                message: `Data ATP site ${record.nama_site} beserta dokumen BAL/BASTP dan fotonya akan dihapus permanen. Lanjutkan?`,
                                type: 'danger',
                                onConfirm: () => router.delete(`/atp/${record.id}`),
                            })}
                            className="inline-flex h-11 w-full items-center justify-center gap-1.5 px-3.5 border border-ng/40 bg-surface text-ng hover:bg-ng/10 text-xs font-bold uppercase rounded-lg transition sm:h-9 sm:w-auto"
                        >
                            <Trash2 className="h-4 w-4 stroke-[1.5]" />
                            Hapus
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-6 max-w-5xl mx-auto">
                {/* 1. Detail Site Card */}
                <Card title="Detail Site">
                    <div className="space-y-3.5 text-xs text-gray-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase">Tanggal Audit</p>
                                        <p className="font-bold text-gray-900 mt-0.5">{tampilTanggal(record.tanggal)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase">No. PO / SPK</p>
                                        <p className="font-bold text-gray-900 mt-0.5">{record.no_po || '-'}</p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Wilayah / Region</p>
                                    <p className="font-bold text-gray-900 mt-0.5">{record.region || '-'}</p>
                                </div>

                                {record.latitude && (
                                    <div className="pt-2">
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase">Koordinat GPS</p>
                                        <code className="text-xs bg-gray-100 text-gray-500 font-mono px-2 py-0.5 rounded inline-block mt-1">
                                            {record.latitude}, {record.longitude}
                                        </code>
                                    </div>
                                )}
                            </div>

                            {record.latitude && (
                                <div className="w-full z-10">
                                    <SiteMap lat={record.latitude} lng={record.longitude} height={200} />
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* 2. Checkpoint Table Card */}
                <Card title="Checkpoint Parameter ATP">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3 mb-4">
                        <SearchInput value={searchQuery} onChange={handleSearchChange} />
                    </div>

                    {/* Mobile: daftar satu baris per parameter agar tabel 6 kolom tidak perlu digeser */}
                    <div className="lg:hidden">
                        <CompactList
                            rows={paginatedItems}
                            kunci={(item) => item.key}
                            judul={(item) => item.name}
                            meta={(item) => [
                                item.tool && `Alat: ${item.tool}`,
                                item.std && `Std: ${item.std}`,
                                item.hasil,
                                item.catatan,
                            ]}
                            nuansa={(item) => (
                                <span
                                    className={`inline-flex shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${badgeChecklist(item.val)}`}
                                >
                                    {item.val || '-'}
                                </span>
                            )}
                            aksi={(item) =>
                                item.photos.length > 0 && (
                                    // Thumbnail kecil dibungkus sasaran sentuh 44 px; dibatasi lebarnya agar baris tidak melebar
                                    <div className="flex max-w-[45vw] flex-wrap justify-end gap-1">
                                        {item.photos.map((photo) => (
                                            <button
                                                key={photo.id}
                                                type="button"
                                                onClick={() => bukaGaleri(photo)}
                                                aria-label={`Pratinjau foto ${item.name}`}
                                                className="flex h-11 w-11 items-center justify-center"
                                            >
                                                <img
                                                    src={photo.file_url}
                                                    alt=""
                                                    className="h-9 w-9 rounded object-cover"
                                                    onError={(e) => {
                                                        e.target.src = 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=400&q=85';
                                                    }}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )
                            }
                            kosong="Tidak ada data checkpoint"
                        />
                    </div>

                    {/* Desktop: tabel lama tetap dipakai dari lg ke atas */}
                    <div className="hidden lg:block">
                        <Table headers={['Nama Parameter', 'Standard', 'Hasil', 'Status', 'Catatan', 'Dokumentasi']}>
                            {paginatedItems.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400 font-medium">
                                        Tidak ada data checkpoint
                                    </td>
                                </tr>
                            ) : (
                                paginatedItems.map((item) => {
                                    const itemPhotos = item.photos;
                                    return (
                                        <tr key={item.key} className="hover:bg-gray-50/50">
                                            <td className="px-4 py-3 font-bold text-gray-900">
                                                {item.name}
                                                <div className="text-[10px] text-gray-400 mt-0.5">Alat: {item.tool}</div>
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs text-gray-500">{item.std}</td>
                                            <td className="px-4 py-3 text-center font-semibold text-gray-700">{item.hasil || '-'}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${item.val === 'OK'
                                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                                        : item.val === 'NG'
                                                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                                                        }`}
                                                >
                                                    {item.val || '-'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 text-xs">{item.catatan || '-'}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {itemPhotos.map((photo) => (
                                                        <div
                                                            key={photo.id}
                                                            className="relative w-10 h-10 rounded border border-gray-200 overflow-hidden bg-surface shadow-sm hover:border-primary transition cursor-pointer"
                                                            onClick={() => bukaGaleri(photo)}
                                                        >
                                                            <img
                                                                src={photo.file_url}
                                                                alt={item.name}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    e.target.src = 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=400&q=85';
                                                                }}
                                                            />
                                                        </div>
                                                    ))}
                                                    {itemPhotos.length === 0 && <span className="text-gray-400 text-xs">-</span>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </Table>
                    </div>

                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={filteredItems.length}
                        itemsPerPage={itemsPerPage}
                    />
                </Card>

                {/* 3. Putusan Card */}
                <Card title="Putusan">
                    <div className="space-y-3 text-xs">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-gray-400 uppercase">Status Kelayakan</span>
                            <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${record.verdict === 'ACCEPT'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : record.verdict === 'CONDITIONAL'
                                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                        : record.verdict === 'REJECT'
                                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                            : 'bg-gray-50 text-gray-600 border border-gray-200'
                                    }`}
                            >
                                {record.verdict || 'PENDING'}
                            </span>
                        </div>
                        {record.verdict_notes && (
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded text-gray-600">
                                <p className="font-bold text-gray-700 mb-1">Catatan Putusan:</p>
                                {record.verdict_notes}
                            </div>
                        )}
                    </div>
                </Card>

                {/* 4. Pihak Otorisasi Card */}
                <Card title="Pihak Otorisasi">
                    <div className="space-y-3.5 text-xs text-gray-700">
                        <div>
                            <p className="font-bold text-primary mb-1">Pihak Pelaksana (Vendor)</p>
                            <p className="font-semibold text-gray-900">{app.vendor_company || '-'}</p>
                            <p className="text-gray-500 mt-0.5">{app.vendor_1_name} ({app.vendor_1_role})</p>
                        </div>
                        <div className="pt-2.5 border-t border-gray-100">
                            <p className="font-bold text-gray-900 mb-1">Tim Evaluasi (CME Team)</p>
                            <p className="font-semibold text-gray-900">{app.cme_company || '-'}</p>
                            <p className="text-gray-500 mt-0.5">{app.cme_1_name} ({app.cme_1_role})</p>
                        </div>
                    </div>
                </Card>

                {/* 4b. Riwayat Dokumen */}
                <Card title="Riwayat Dokumen">
                    <Timeline items={riwayatDokumen} />
                </Card>

                {/* 5. Dokumen Pendukung Grid (2x2 Layout on Desktop) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* BAL Card */}
                    <Card title="Berita Acara Lapangan (BAL)">
                        <div className="flex flex-col justify-between h-full space-y-4">
                            <div>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Dokumen resmi Berita Acara Lapangan yang digunakan untuk mencatat hasil audit fisik di lokasi site.
                                </p>
                                <div className="mt-3 flex items-center gap-2">
                                    <span className="text-xs font-semibold text-gray-400">Status:</span>
                                    {record.bal ? (
                                        <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                                            Selesai dibuat
                                        </span>
                                    ) : (
                                        <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-600 border border-gray-200">
                                            Belum dibuat
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                                {record.bal ? (
                                    <>
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowBalForm(true)}
                                            className="px-3 py-2"
                                        >
                                            <Pencil className="h-3.5 w-3.5 stroke-[1.5]" />
                                            Edit
                                        </Button>
                                        <button
                                            type="button"
                                            onClick={() => setDokumen({ judul: 'Berita Acara Lapangan (BAL)', src: `/print/atp_bal?id=${record.id}` })}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] sm:min-h-0 bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-strong text-xs font-bold uppercase rounded-lg transition"
                                        >
                                            <Printer className="h-3.5 w-3.5 stroke-[1.5]" />
                                            Cetak
                                        </button>
                                        <Button
                                            variant="danger"
                                            onClick={handleDeleteBal}
                                            className="px-3 py-2"
                                            processing={deletingBal}
                                        >
                                            <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" />
                                            Hapus
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        variant="primary"
                                        onClick={() => setShowBalForm(true)}
                                        className="w-full sm:w-auto"
                                    >
                                        <Plus className="h-3.5 w-3.5 stroke-[1.5]" />
                                        Buat BAL
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* BASTP Card */}
                    <Card title="BASTP / Handover">
                        <div className="flex flex-col justify-between h-full space-y-4">
                            <div>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    Berita Acara Serah Terima Pekerjaan (BASTP) untuk proses serah terima formal dengan pemberi kerja.
                                </p>
                                <div className="mt-3 flex items-center gap-2">
                                    <span className="text-xs font-semibold text-gray-400">Status:</span>
                                    {record.bastp ? (
                                        <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                                            Selesai dibuat
                                        </span>
                                    ) : (
                                        <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-600 border border-gray-200">
                                            Belum dibuat
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                                {record.bastp ? (
                                    <>
                                        <Button
                                            variant="outline"
                                            onClick={() => setShowBastpForm(true)}
                                            className="px-3 py-2"
                                        >
                                            <Pencil className="h-3.5 w-3.5 stroke-[1.5]" />
                                            Edit
                                        </Button>
                                        <button
                                            type="button"
                                            onClick={() => setDokumen({ judul: 'BASTP / Handover', src: `/print/atp_bastp?id=${record.id}` })}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] sm:min-h-0 bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-strong text-xs font-bold uppercase rounded-lg transition"
                                        >
                                            <Printer className="h-3.5 w-3.5 stroke-[1.5]" />
                                            Cetak
                                        </button>
                                        <Button
                                            variant="danger"
                                            onClick={handleDeleteBastp}
                                            className="px-3 py-2"
                                            processing={deletingBastp}
                                        >
                                            <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" />
                                            Hapus
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        variant="primary"
                                        onClick={() => setShowBastpForm(true)}
                                        className="w-full sm:w-auto"
                                    >
                                        <Plus className="h-3.5 w-3.5 stroke-[1.5]" />
                                        Buat BASTP
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* BAL DIALOG MODAL */}
            <ResponsiveModal isOpen={showBalForm} onClose={() => setShowBalForm(false)} title={record.bal ? 'Edit Berita Acara Lapangan (BAL)' : 'Buat Berita Acara Lapangan (BAL)'} size="max-w-2xl">
                <form onSubmit={handleSaveBal} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Nama Project" value={balForm.data.project} onChange={(e) => balForm.setData('project', e.target.value)} required error={balForm.errors.project} />
                        <Input label="Nomor PO" value={balForm.data.no_po} onChange={(e) => balForm.setData('no_po', e.target.value)} required error={balForm.errors.no_po} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Mulai Tanggal" type="date" value={balForm.data.tanggal_mulai} onChange={(e) => balForm.setData('tanggal_mulai', e.target.value)} required error={balForm.errors.tanggal_mulai} />
                        <Input label="Selesai Tanggal" type="date" value={balForm.data.tanggal} onChange={(e) => balForm.setData('tanggal', e.target.value)} required error={balForm.errors.tanggal} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Pelaksana Pekerjaan" value={balForm.data.pelaksana} onChange={(e) => balForm.setData('pelaksana', e.target.value)} required error={balForm.errors.pelaksana} />
                        <Input label="Lokasi / Site" value={balForm.data.lokasi} onChange={(e) => balForm.setData('lokasi', e.target.value)} required error={balForm.errors.lokasi} />
                        <Input label="Hasil Rekomendasi" value={balForm.data.hasil} onChange={(e) => balForm.setData('hasil', e.target.value)} required error={balForm.errors.hasil} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-3">
                        <div>
                            <h4 className="font-bold text-primary uppercase tracking-wider mb-2">Pihak I (Pelaksana)</h4>
                            <Input label="Nama Perusahaan" value={balForm.data.pihak1} onChange={(e) => balForm.setData('pihak1', e.target.value)} required error={balForm.errors.pihak1} />
                            <Input label="Nama Representative" value={balForm.data.nama1} onChange={(e) => balForm.setData('nama1', e.target.value)} required error={balForm.errors.nama1} className="mt-2" />
                            <Input label="Jabatan Representative" value={balForm.data.jabatan1} onChange={(e) => balForm.setData('jabatan1', e.target.value)} required error={balForm.errors.jabatan1} className="mt-2" />
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 uppercase tracking-wider mb-2">Pihak II (Pengawas)</h4>
                            <Input label="Nama Perusahaan" value={balForm.data.pihak2} onChange={(e) => balForm.setData('pihak2', e.target.value)} required error={balForm.errors.pihak2} />
                            <Input label="Nama Representative" value={balForm.data.nama2} onChange={(e) => balForm.setData('nama2', e.target.value)} required error={balForm.errors.nama2} className="mt-2" />
                            <Input label="Jabatan Representative" value={balForm.data.jabatan2} onChange={(e) => balForm.setData('jabatan2', e.target.value)} required error={balForm.errors.jabatan2} className="mt-2" />
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end border-t pt-3">
                        <Button type="submit" variant="primary" processing={balForm.processing}>Simpan BAL</Button>
                        <Button type="button" variant="outline" onClick={() => setShowBalForm(false)}>Batal</Button>
                    </div>
                </form>
            </ResponsiveModal>

            {/* BASTP DIALOG MODAL */}
            <ResponsiveModal isOpen={showBastpForm} onClose={() => setShowBastpForm(false)} title={record.bastp ? 'Edit BASTP (BA Serah Terima Pekerjaan)' : 'Buat BASTP (BA Serah Terima Pekerjaan)'} size="max-w-2xl">
                <form onSubmit={handleSaveBastp} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Nama Pihak I (Pelaksana)" value={bastpForm.data.p1_nama} onChange={(e) => bastpForm.setData('p1_nama', e.target.value)} required error={bastpForm.errors.p1_nama} />
                        <Input label="Alamat Pihak I" value={bastpForm.data.p1_alamat} onChange={(e) => bastpForm.setData('p1_alamat', e.target.value)} required error={bastpForm.errors.p1_alamat} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Nama Pihak II (Pemberi Kerja)" value={bastpForm.data.p2_nama} onChange={(e) => bastpForm.setData('p2_nama', e.target.value)} required error={bastpForm.errors.p2_nama} />
                        <Input label="Jabatan Pihak II" value={bastpForm.data.p2_jabatan} onChange={(e) => bastpForm.setData('p2_jabatan', e.target.value)} required error={bastpForm.errors.p2_jabatan} />
                    </div>
                    <div className="space-y-3">
                        <Input label="Alamat Pihak II" value={bastpForm.data.p2_alamat} onChange={(e) => bastpForm.setData('p2_alamat', e.target.value)} required error={bastpForm.errors.p2_alamat} />
                        <Input label="Nama Pekerjaan (BASTP)" value={bastpForm.data.pekerjaan} onChange={(e) => bastpForm.setData('pekerjaan', e.target.value)} required error={bastpForm.errors.pekerjaan} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-3">
                        <Input label="Mengetahui Pihak I (Nama/Jabatan)" value={bastpForm.data.mengetahui1} onChange={(e) => bastpForm.setData('mengetahui1', e.target.value)} required error={bastpForm.errors.mengetahui1} placeholder="Nama Pemeriksa I" />
                        <Input label="Mengetahui Pihak II (Nama/Jabatan)" value={bastpForm.data.mengetahui2} onChange={(e) => bastpForm.setData('mengetahui2', e.target.value)} required error={bastpForm.errors.mengetahui2} placeholder="Nama Pemeriksa II" />
                    </div>
                    <div className="flex gap-2 justify-end border-t pt-3">
                        <Button type="submit" variant="primary" processing={bastpForm.processing}>Simpan BASTP</Button>
                        <Button type="button" variant="outline" onClick={() => setShowBastpForm(false)}>Batal</Button>
                    </div>
                </form>
            </ResponsiveModal>

            <PhotoGallery
                photos={galeriFoto}
                startIndex={galeriIdx}
                onClose={() => setGaleriIdx(null)}
            />

            <DocumentPreview
                isOpen={!!dokumen}
                onClose={() => setDokumen(null)}
                judul={dokumen?.judul}
                src={dokumen?.src}
                jenis={dokumen?.jenis}
            />

            {/* Local Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
            />
        </>
    );
}


Detail.layout = page => <AppLayout children={page} />;
