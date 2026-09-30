import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/Card';
import Table from '../../Components/Table';
import CompactList from '../../Components/CompactList';
import Search, { filterData } from '../../Components/Search';
import Pagination from '../../Components/Pagination';
import PhotoGallery from '../../Components/PhotoGallery';
import DocumentPreview from '../../Components/DocumentPreview';
import { FileText, Image as ImageIcon, Download, Eye, Edit, Trash2 } from 'lucide-react';

export default function KeluarDetail({ transaction }) {
    const photos = transaction.media_urls || [];
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showHapus, setShowHapus] = useState(false);
    // Dokumen yang sedang dipratinjau di dalam aplikasi: null = modal tertutup.
    const [dokumen, setDokumen] = useState(null);

    // Galeri: PDF tetap pratinjau iframe Modal; gambar pakai PhotoGallery (panah/counter/unduh).
    const [pdfUrl, setPdfUrl] = useState(null);
    const [galeriIdx, setGaleriIdx] = useState(null);
    const gambar = photos.filter((url) => !url.toLowerCase().endsWith('.pdf'));
    const galeriFoto = gambar.map((url) => ({ src: url, nama: url.split('/').pop() || '' }));
    const triggerPreview = (url) => {
        if (url.toLowerCase().endsWith('.pdf')) {
            setPdfUrl(url);
            return;
        }
        const idx = gambar.findIndex((g) => g === url);
        setGaleriIdx(idx >= 0 ? idx : 0);
    };

    const filteredDetails = filterData(transaction.details, searchQuery);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredDetails.length / itemsPerPage);
    const paginatedDetails = filteredDetails.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <>
            <Head title={`Detail Keluar ${transaction.no_form} - Web CME`} />

            {/* flex-wrap: judul dan tombol bertumpuk di 390 px, sejajar di desktop */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines">
                        Detail Barang Keluar
                    </h1>
                    <p className="text-sm text-gray-500 font-headlines mt-1">
                        Surat jalan penyerahan &bull; Form: {transaction.no_form}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        href={`/gudang/keluar/${transaction.id}/edit`}
                        className="inline-flex h-11 sm:h-9 items-center justify-center gap-1.5 px-3 rounded-lg border border-gray-300 bg-surface text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-black transition"
                    >
                        <Edit className="h-3.5 w-3.5 stroke-[1.5]" />
                        Edit
                    </Link>
                    <button
                        type="button"
                        onClick={() => setShowHapus(true)}
                        className="inline-flex h-11 sm:h-9 items-center justify-center gap-1.5 px-3 rounded-lg border border-transparent bg-ng text-ng-foreground text-xs font-semibold hover:bg-ng/90 transition"
                    >
                        <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" />
                        Hapus
                    </button>
                    {/* Pratinjau internal: dokumen cetak tampil di modal, tab baru tetap tersedia dari sana */}
                    <button
                        type="button"
                        onClick={() => setDokumen({ judul: `Dokumen Barang Keluar ${transaction.no_form}`, src: `/print/gudang_keluar_print?id=${transaction.id}` })}
                        className="inline-flex h-11 sm:h-9 items-center justify-center gap-1.5 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition"
                    >
                        Cetak PDF
                    </button>
                    <Link
                        href="/gudang/history"
                        className="inline-flex h-11 sm:h-9 items-center justify-center gap-1.5 px-3 rounded-lg border border-gray-300 bg-surface text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-black transition"
                    >
                        &larr; Riwayat
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Items lists */}
                <div className="lg:col-span-2 space-y-6">
                    <Card title="Rincian Barang Diserahkan">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3 mb-4">
                            <Search value={searchQuery} onChange={handleSearchChange} />
                        </div>

                        <div className="hidden lg:block">
                            <Table headers={['No', 'Spesifikasi Barang', 'Kategori', 'Tipe / Model', 'Kuantitas Rilis', 'Satuan']}>
                            {paginatedDetails.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400 font-medium">
                                        Tidak ada rincian barang diserahkan.
                                    </td>
                                </tr>
                            ) : (
                                paginatedDetails.map((row, idx) => (
                                    <tr key={row.id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-3 text-center font-bold text-gray-400">
                                            {(currentPage - 1) * itemsPerPage + idx + 1}
                                        </td>
                                        <td className="px-6 py-3 font-bold text-gray-900">{row.nama_barang}</td>
                                        <td className="px-6 py-3 text-center text-gray-500 font-medium">{row.barang?.kategori || '-'}</td>
                                        <td className="px-6 py-3 text-center text-gray-600 font-mono text-xs">{row.tipe_barang || '-'}</td>
                                        <td className="px-6 py-3 text-center font-black text-gray-800">{row.jumlah}</td>
                                        <td className="px-6 py-3 text-center text-gray-500">{row.satuan}</td>
                                    </tr>
                                ))
                            )}
                        </Table>
                        </div>

                        {/* 390 px: tabel diganti daftar rapat satu baris agar tidak ada geser horizontal */}
                        <div className="lg:hidden">
                            <CompactList
                                rows={paginatedDetails}
                                kunci={(row) => row.id}
                                judul={(row) => row.nama_barang}
                                meta={(row) => [`${row.jumlah} ${row.satuan}`, row.barang?.kategori, row.tipe_barang]}
                                kosong="Tidak ada rincian barang diserahkan."
                            />
                        </div>

                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            totalItems={filteredDetails.length}
                            itemsPerPage={itemsPerPage}
                        />
                    </Card>
                </div>

                {/* Metadata details */}
                <div className="space-y-6">
                    <Card title="Metadata Pengeluaran">
                        <div className="space-y-4 text-xs text-gray-700">
                            <div>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase">Judul Pekerjaan</p>
                                <p className="text-sm font-bold text-gray-900 mt-0.5">{transaction.judul || '-'}</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Tanggal Rilis</p>
                                    <p className="font-bold text-gray-900 mt-0.5">{transaction.tanggal}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Site Penerima</p>
                                    <p className="font-bold text-gray-900 mt-0.5">{transaction.lokasi_tujuan}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Pengambil</p>
                                    <p className="font-bold text-gray-900 mt-0.5">{transaction.pengambil}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Jabatan</p>
                                    <p className="font-bold text-gray-900 mt-0.5">{transaction.jabatan || '-'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Keperluan Proyek</p>
                                    <p className="font-bold text-gray-900 mt-0.5">{transaction.proyek || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Disetujui Oleh</p>
                                    <p className="font-bold text-gray-900 mt-0.5">{transaction.disetujui || '-'}</p>
                                </div>
                            </div>

                            {transaction.keterangan && (
                                <div className="pt-3 border-t border-gray-100">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Catatan / Memo</p>
                                    <p className="text-gray-700 mt-1 whitespace-pre-wrap">{transaction.keterangan}</p>
                                </div>
                            )}

                            {photos.length > 0 && (
                                <div className="pt-3 border-t border-gray-100 space-y-2">
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Lampiran Dokumen</p>
                                    <div className="space-y-2">
                                        {photos.map((ph, idx) => {
                                            const filename = ph.split('/').pop() || 'Download File';
                                            return (
                                                <div key={idx} className="flex items-center justify-between p-2 bg-surface rounded border border-gray-200">
                                                    <span className="truncate max-w-[130px] font-mono text-[10px] text-gray-600" title={filename}>
                                                        {filename}
                                                    </span>
                                                    <a
                                                        href={ph}
                                                        download
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary dark:text-primary-strong hover:bg-primary hover:text-primary-foreground rounded text-[10px] font-bold transition"
                                                    >
                                                        <Download className="w-3.5 h-3.5 stroke-[1.5]" />
                                                        Download
                                                    </a>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* PHOTOS */}
                    {photos.length > 0 && (
                        <Card title="Bukti Rilis / Surat Jalan">
                            <div className="space-y-3">
                                {photos.map((ph, idx) => {
                                    const filename = ph.split('/').pop() || 'document';
                                    const isPdf = ph.toLowerCase().endsWith('.pdf');
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => triggerPreview(ph)}
                                            className="border border-gray-200 rounded-lg p-3 bg-surface hover:bg-gray-50/50 cursor-pointer transition flex items-center gap-3 group"
                                        >
                                            <div className={`p-2 rounded-lg flex-shrink-0 ${isPdf ? 'bg-red-50 text-red-600' : 'bg-primary/10 text-primary dark:text-primary-strong'}`}>
                                                {isPdf ? (
                                                    <FileText className="w-6 h-6 stroke-[1.5]" />
                                                ) : (
                                                    <ImageIcon className="w-6 h-6 stroke-[1.5]" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-grow">
                                                <p className="text-xs font-bold text-gray-900 truncate" title={filename}>
                                                    {filename}
                                                </p>
                                                <p className="text-[10px] text-gray-400 font-semibold uppercase mt-0.5 flex items-center gap-1">
                                                    <Eye className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary transition" />
                                                    Klik untuk Preview
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            {/* PDF tetap pratinjau iframe Modal; gambar lewat PhotoGallery */}
            <Modal
                isOpen={pdfUrl !== null}
                onClose={() => setPdfUrl(null)}
                title="Preview Dokumen"
                size="max-w-4xl"
            >
                <div className="flex justify-center items-center w-full bg-gray-50/50 rounded-lg p-2 min-h-[50vh]">
                    <iframe
                        src={pdfUrl}
                        className="w-full h-[60vh] md:h-[75vh] border-0 rounded-lg shadow-sm"
                        title="PDF Preview"
                    />
                </div>
            </Modal>
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
                isOpen={showHapus}
                onClose={() => setShowHapus(false)}
                onConfirm={() => router.delete(`/gudang/keluar/${transaction.id}`)}
                title="Hapus Transaksi"
                message={`Transaksi ${transaction.no_form} beserta seluruh rinciannya akan dihapus dan stok barang dikembalikan. Lanjutkan?`}
                type="danger"
                confirmText="Ya, Hapus"
            />
        </>
    );
}

KeluarDetail.layout = page => <AppLayout children={page} />;
