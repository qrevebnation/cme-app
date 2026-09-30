import React, { useState, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/Card';
import Table from '../../Components/Table';
import PhotoGallery from '../../Components/PhotoGallery';
import SiteMap from '../../Components/SiteMap';
import Search, { filterData } from '../../Components/Search';
import Pagination from '../../Components/Pagination';
import Breadcrumbs from '../../Components/Breadcrumbs';
import CompactList from '../../Components/CompactList';
import ConfirmationModal from '../../Components/ConfirmationModal';
import DocumentPreview from '../../Components/DocumentPreview';
import { ArrowLeft, FileSpreadsheet, FileText, Trash2 } from 'lucide-react';

function CategoryTableCard({ category, items, survey, bukaGaleri }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const handleSearchChange = (query) => {
        setSearchQuery(query);
        setCurrentPage(1);
    };

    const filteredItems = filterData(items, searchQuery);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Item dikelompokkan per sub_kategori mengikuti urutan barisnya; item tanpa sub
    // tampil tanpa judul kelompok. Hasil pencarian & paginasi tetap satu alur.
    const kelompok = [];
    paginatedItems.forEach((it) => {
        const nama = it.sub_kategori || null;
        const terakhir = kelompok[kelompok.length - 1];
        if (terakhir && terakhir.nama === nama) {
            terakhir.items.push(it);
        } else {
            kelompok.push({ nama, items: [it] });
        }
    });
    if (kelompok.length === 0) {
        kelompok.push({ nama: null, items: [] });
    }

    // Label + warna badge status dipakai tabel (md ke atas) dan daftar ponsel supaya seragam.
    const statusBadge = (status) =>
        status === 'checked'
            ? { label: 'OK', kelas: 'bg-emerald-50 text-emerald-700 border border-emerald-200' }
            : status === 'cross'
                ? { label: 'NG', kelas: 'bg-rose-50 text-rose-700 border border-rose-200' }
                : { label: '-', kelas: 'bg-gray-50 text-gray-400' };

    return (
        <Card title={category}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3 mb-4">
                <Search value={searchQuery} onChange={handleSearchChange} />
            </div>
            {/* Mobile: daftar satu baris per checkpoint agar tabel 5 kolom tidak perlu digeser */}
            <div className="lg:hidden">
                {kelompok.map((grup, idx) => (
                    <div key={`${grup.nama || 'tanpa-sub'}-${idx}`}>
                        {grup.nama && (
                            <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                {grup.nama}
                            </p>
                        )}
                        <CompactList
                            rows={grup.items}
                            kunci={(it) => it.id}
                            judul={(it) => it.nama_item}
                            meta={(it) => [it.kondisi_nilai, it.catatan && `Catatan: ${it.catatan}`]}
                            nuansa={(it) => (
                                <span
                                    className={`inline-flex shrink-0 rounded px-2 py-0.5 text-[10px] font-black uppercase ${statusBadge(it.status_check).kelas}`}
                                >
                                    {statusBadge(it.status_check).label}
                                </span>
                            )}
                            aksi={(it) => {
                                const itemPhotos = survey.photos.filter(p => p.item_id === it.id);
                                return (
                                    itemPhotos.length > 0 && (
                                        // Thumbnail kecil dibungkus sasaran sentuh 44 px; dibatasi lebarnya agar baris tidak melebar
                                        <div className="flex max-w-[45vw] flex-wrap justify-end gap-1">
                                            {itemPhotos.map((photo) => (
                                                <button
                                                    key={photo.id}
                                                    type="button"
                                                    onClick={() => bukaGaleri(photo)}
                                                    aria-label={`Pratinjau foto ${it.nama_item}`}
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
                                );
                            }}
                            kosong="Tidak ada data checkpoint"
                        />
                    </div>
                ))}
            </div>

            {/* Desktop: tabel lama tetap dipakai dari lg ke atas */}
            <div className="hidden lg:block">
                <Table headers={['No', 'Nama Checkpoint', 'Status', 'Catatan Kondisi', 'Dokumentasi']}>
                    {paginatedItems.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-gray-400 font-medium">
                                Tidak ada data checkpoint
                            </td>
                        </tr>
                    ) : (
                        kelompok.map((grup, grupIdx) => (
                            <React.Fragment key={`${grup.nama || 'tanpa-sub'}-${grupIdx}`}>
                                {grup.nama && (
                                    <tr className="bg-gray-50/60">
                                        <td colSpan={5} className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                            {grup.nama}
                                        </td>
                                    </tr>
                                )}
                                {grup.items.map((it) => {
                                    const itemPhotos = survey.photos.filter(p => p.item_id === it.id);
                                    const badge = statusBadge(it.status_check);
                                    return (
                                        <tr key={it.id} className="hover:bg-gray-50/50">
                                            <td className="px-4 py-3 font-mono font-bold text-xs text-center text-gray-400">
                                                {it.nomor_item}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-gray-900">{it.nama_item}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-black ${badge.kelas}`}>
                                                    {badge.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 whitespace-pre-wrap text-sm">
                                                {it.kondisi_nilai || '-'}
                                                {it.catatan && (
                                                    <div className="text-[10px] text-gray-400 mt-1 italic">
                                                        Catatan: {it.catatan}
                                                    </div>
                                                )}
                                            </td>
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
                                                                alt={it.nama_item}
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
                                })}
                            </React.Fragment>
                        ))
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
    );
}

export default function Detail({ survey }) {
    const { auth } = usePage().props;
    const [galeriIdx, setGaleriIdx] = useState(null);
    const [konfirmasiHapus, setKonfirmasiHapus] = useState(false);
    // Dokumen yang sedang dipratinjau di dalam aplikasi: null = modal tertutup.
    const [dokumen, setDokumen] = useState(null);
    // admin & project_manager bebas menghapus; peran lain hanya survey dengan created_by miliknya.
    const bolehHapus = ['admin', 'project_manager'].includes(auth?.user?.role)
        || (auth?.user?.id != null && survey.created_by === auth.user.id);
    // Galeri: satu daftar supaya panah prev/next jelajah semua foto checkpoint.
    const galeriFoto = (survey.photos || []).map((p) => ({
        src: p.file_url,
        nama: p.file_url?.split('/').pop() || '',
    }));
    const bukaGaleri = (photo) => {
        const idx = galeriFoto.findIndex((g) => g.src === (typeof photo === 'string' ? photo : photo.file_url));
        setGaleriIdx(idx >= 0 ? idx : 0);
    };
    // Tanggal awal 0000-00-00 (#74) tampil sebagai strip, bukan tanggal rusak.
    const tampilTanggal = (nilai) => (!nilai || String(nilai).startsWith('0000') ? '-' : nilai);
    // Redirect pasca-simpan ?cetak=<dok>: buka modal cetak lalu bersihkan param.
    useEffect(() => {
        const param = new URLSearchParams(window.location.search).get('cetak');
        if (param === 'print_survey') {
            setDokumen({ judul: 'Laporan Survey (A4)', src: `/print/print_survey?id=${survey.id}` });
            const url = new URL(window.location.href);
            url.searchParams.delete('cetak');
            window.history.replaceState({}, '', url.toString());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Group items by category
    const groupedItems = {};
    survey.items.forEach((item) => {
        if (!groupedItems[item.kategori]) {
            groupedItems[item.kategori] = [];
        }
        groupedItems[item.kategori].push(item);
    });

    return (
        <>
            <Head title={`Survey ${survey.nama_site} - Web CME`} />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Survey', href: '/survey' },
                { label: survey.nama_site || `Survey #${survey.id}` }
            ]} />

            {/* Mobile: header boleh melipat agar klaster tombol turun baris, tidak melebar di 390 px */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
                <Link
                    href="/survey"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-300 bg-surface text-gray-500 hover:bg-gray-50 hover:text-black transition shrink-0 sm:h-9 sm:w-9"
                >
                    <ArrowLeft className="h-4 w-4 stroke-[1.5]" />
                </Link>
                <div className="min-w-0 flex-grow">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines">
                        Detail Survey
                    </h1>
                    <p className="text-sm text-gray-500 font-headlines mt-1">
                        Laporan teknis site {survey.nama_site} terdaftar.
                    </p>
                </div>
                {/* Mobile: klaster aksi vertikal penuh; desktop baris. Tanpa strip overflow-x-auto. */}
                <div className="mt-1 flex w-full flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <Link
                        href={`/survey/${survey.id}/edit`}
                        className="inline-flex h-11 w-full items-center justify-center px-4 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-lg transition sm:h-9 sm:w-auto"
                    >
                        Edit
                    </Link>
                    {/* Pratinjau internal: dokumen cetak tampil di modal, tab baru tetap tersedia dari sana */}
                    <button
                        type="button"
                        onClick={() => setDokumen({ judul: 'Laporan Survey (A4)', src: `/print/print_survey?id=${survey.id}` })}
                        className="inline-flex h-11 w-full items-center justify-center px-4 bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-strong text-xs font-bold uppercase tracking-wider rounded-lg transition sm:h-9 sm:w-auto"
                    >
                        Cetak (A4)
                    </button>
                    {/* CSV/Markdown bukan HTML: tautan tetap mengunduh berkas seperti sebelumnya,
                        pratinjau hanya menyediakan tombol "Buka di tab" (tanpa iframe). */}
                    <a
                        href={`/ekspor/survey?id=${survey.id}`}
                        onClick={() => setDokumen({ judul: 'Ekspor CSV Survey', src: `/ekspor/survey?id=${survey.id}`, jenis: 'unduhan' })}
                        title="Ekspor CSV"
                        className="inline-flex h-11 w-full items-center justify-center gap-1.5 px-4 border border-gray-300 bg-surface text-gray-600 hover:bg-gray-50 hover:text-black text-xs font-bold uppercase tracking-wider rounded-lg transition sm:h-9 sm:w-auto"
                    >
                        <FileSpreadsheet className="h-4 w-4 stroke-[1.5]" />
                        CSV
                    </a>
                    <a
                        href={`/ekspor/survey?id=${survey.id}&format=md`}
                        onClick={() => setDokumen({ judul: 'Ekspor Markdown Survey', src: `/ekspor/survey?id=${survey.id}&format=md`, jenis: 'unduhan' })}
                        title="Ekspor Markdown"
                        className="inline-flex h-11 w-full items-center justify-center gap-1.5 px-4 border border-gray-300 bg-surface text-gray-600 hover:bg-gray-50 hover:text-black text-xs font-bold uppercase tracking-wider rounded-lg transition sm:h-9 sm:w-auto"
                    >
                        <FileText className="h-4 w-4 stroke-[1.5]" />
                        Markdown
                    </a>
                    {/* Hapus tampil hanya bila peran/pemilik survey mengizinkan */}
                    {bolehHapus && (
                        <button
                            type="button"
                            onClick={() => setKonfirmasiHapus(true)}
                            className="inline-flex h-11 w-full items-center justify-center gap-1.5 px-4 border border-ng/40 bg-surface text-ng hover:bg-ng/10 text-xs font-bold uppercase tracking-wider rounded-lg transition sm:h-9 sm:w-auto"
                        >
                            <Trash2 className="h-4 w-4 stroke-[1.5]" />
                            Hapus
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-6">
                {/* 1. INFORMASI LOKASI (Moved above the checklists) */}
                <Card title="Informasi Lokasi">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Tanggal Survey</p>
                                    <p className="text-sm font-bold text-gray-900 mt-0.5">{tampilTanggal(survey.tanggal_survey)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Nama Surveyor</p>
                                    <p className="text-sm font-bold text-gray-900 mt-0.5">{survey.nama_surveyor}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase">Lokasi / Alamat</p>
                                <p className="text-sm font-bold text-gray-900 mt-0.5">{survey.lokasi || '-'}</p>
                            </div>

                            {survey.latitude && (
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Peta Koordinat</p>
                                    <code className="text-xs bg-gray-100 px-2.5 py-0.5 rounded text-gray-500 font-mono inline-block mt-1">
                                        {survey.latitude}, {survey.longitude}
                                    </code>
                                </div>
                            )}
                        </div>

                        {survey.latitude && (
                            <div className="w-full max-w-full overflow-hidden z-10">
                                <SiteMap lat={survey.latitude} lng={survey.longitude} height={200} />
                            </div>
                        )}
                    </div>
                </Card>

                {/* 2. CHECKLIST REPORT DETAIL */}
                <div className="space-y-6">
                    {Object.entries(groupedItems).map(([category, items]) => (
                        <CategoryTableCard
                            key={category}
                            category={category}
                            items={items}
                            survey={survey}
                            bukaGaleri={bukaGaleri}
                        />
                    ))}

                    {survey.catatan_tambahan && (
                        <Card title="Catatan Tambahan">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {survey.catatan_tambahan}
                            </p>
                        </Card>
                    )}
                </div>
            </div>

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

            <ConfirmationModal
                isOpen={konfirmasiHapus}
                onClose={() => setKonfirmasiHapus(false)}
                onConfirm={() => router.delete(`/survey/${survey.id}`)}
                title="Hapus Survey"
                message={`Data survey site ${survey.nama_site} beserta seluruh checkpoint dan fotonya akan dihapus permanen. Lanjutkan?`}
                type="danger"
                confirmText="Ya, Hapus"
            />
        </>
    );
}

Detail.layout = page => <AppLayout children={page} />;
