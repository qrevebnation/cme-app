import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Breadcrumbs from '../../Components/Breadcrumbs';
import Card from '../../Components/Card';
import Table from '../../Components/Table';
import CompactList from '../../Components/CompactList';
import ConfirmationModal from '../../Components/ConfirmationModal';
import DocumentPreview from '../../Components/DocumentPreview';
import { ArrowLeft, FileSpreadsheet, FileText } from 'lucide-react';

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function tanggalIndonesia(ymd) {
    if (!ymd) return '-';
    const [y, m, d] = String(ymd).split('-');
    const bulan = BULAN[parseInt(m, 10) - 1];
    return bulan ? `${parseInt(d, 10)} ${bulan} ${y}` : ymd;
}

function Baris({ label, nilai }) {
    return (
        <div className="text-sm">
            <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold block">{label}</span>
            <span className="text-gray-800">{nilai || '-'}</span>
        </div>
    );
}

function TandaTangan({ judul, nama, jabatan, url }) {
    return (
        <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">{judul}</p>
            <div className="h-20 flex items-end justify-center border-b border-border pb-1">
                {url ? (
                    <img src={url} alt={`Tanda tangan ${judul}`} className="max-h-20 object-contain" />
                ) : (
                    <span className="text-xs text-gray-500">(belum ada tanda tangan)</span>
                )}
            </div>
            <p className="mt-2 text-sm font-semibold text-gray-800">{nama || '-'}</p>
            <p className="text-xs text-gray-500">{jabatan || '-'}</p>
        </div>
    );
}

export default function Show({ record }) {
    const { props } = usePage();
    const user = props.auth?.user;
    const canManage = user && ['admin', 'project_manager'].includes(user.role);

    const [konfirmasi, setKonfirmasi] = useState(false);
    // Dokumen yang sedang dipratinjau di dalam aplikasi: null = modal tertutup.
    const [dokumen, setDokumen] = useState(null);

    const hapus = () => {
        router.delete(`/material-request/${record.id}`, {
            onFinish: () => setKonfirmasi(false),
        });
    };

    return (
        <>
            <Head title={`${record.no_pengajuan || record.no_form} - Web CME`} />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Permintaan Barang', href: '/material-request' },
                { label: record.no_pengajuan || record.no_form },
            ]} />

            <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <Link
                        href="/material-request"
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-gray-500 hover:bg-gray-50 hover:text-black transition sm:h-9 sm:w-9"
                    >
                        <ArrowLeft className="h-4 w-4 stroke-[1.5]" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines">
                            Detail Permintaan Barang
                        </h1>
                        <p className="text-sm text-gray-500 font-headlines">
                            {record.no_pengajuan || record.no_form}
                        </p>
                    </div>
                </div>
                {canManage && (
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href={`/material-request/${record.id}/edit`}
                            className="inline-flex h-11 items-center px-4 bg-surface border border-border rounded-md font-semibold text-xs text-gray-700 uppercase tracking-widest hover:bg-gray-50 transition sm:h-9"
                        >
                            Edit
                        </Link>
                        {/* Pratinjau internal: dokumen cetak tampil di modal, tab baru tetap tersedia dari sana */}
                        <button
                            type="button"
                            onClick={() => setDokumen({ judul: 'Cetak Permintaan Barang', src: `/print/material_request_print?id=${record.id}` })}
                            className="inline-flex h-11 items-center px-4 bg-primary border border-transparent rounded-md font-semibold text-xs text-primary-foreground uppercase tracking-widest hover:bg-primary/90 transition sm:h-9"
                        >
                            Cetak PDF
                        </button>
                        {/* CSV/Markdown bukan HTML: tautan tetap mengunduh berkas seperti sebelumnya,
                            pratinjau hanya menyediakan tombol "Buka di tab" (tanpa iframe). */}
                        <a
                            href={`/ekspor/material-request?id=${record.id}`}
                            onClick={() => setDokumen({ judul: 'Ekspor CSV Permintaan Barang', src: `/ekspor/material-request?id=${record.id}`, jenis: 'unduhan' })}
                            title="Ekspor CSV"
                            className="inline-flex h-11 items-center gap-1.5 px-4 bg-surface border border-border rounded-md font-semibold text-xs text-gray-700 uppercase tracking-widest hover:bg-gray-50 transition sm:h-9"
                        >
                            <FileSpreadsheet className="h-4 w-4 stroke-[1.5]" />
                            CSV
                        </a>
                        <a
                            href={`/ekspor/material-request?id=${record.id}&type=md`}
                            onClick={() => setDokumen({ judul: 'Ekspor Markdown Permintaan Barang', src: `/ekspor/material-request?id=${record.id}&type=md`, jenis: 'unduhan' })}
                            title="Ekspor Markdown"
                            className="inline-flex h-11 items-center gap-1.5 px-4 bg-surface border border-border rounded-md font-semibold text-xs text-gray-700 uppercase tracking-widest hover:bg-gray-50 transition sm:h-9"
                        >
                            <FileText className="h-4 w-4 stroke-[1.5]" />
                            Markdown
                        </a>
                        <button
                            type="button"
                            onClick={() => setKonfirmasi(true)}
                            className="inline-flex h-11 items-center px-4 bg-surface border border-border rounded-md font-semibold text-xs text-ng uppercase tracking-widest hover:bg-red-50 hover:border-red-300 transition sm:h-9"
                        >
                            Hapus
                        </button>
                    </div>
                )}
            </div>

            <div className="space-y-6">
                <Card title={record.no_pengajuan || record.no_form}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Baris label="Tanggal" nilai={tanggalIndonesia(record.tanggal)} />
                        <Baris label="No. Form" nilai={record.no_form} />
                        <Baris label="Nomer Referensi" nilai={record.no_referensi} />
                        <Baris label="Kontrak/Mitra" nilai={record.kontrak_mitra} />
                        <Baris label="Stasiun/Site" nilai={record.stasiun_site} />
                        <Baris label="Homepass" nilai={record.homepass} />
                        <Baris label="PIC" nilai={record.pic} />
                        <Baris label="No. Telp" nilai={record.no_telp} />
                        <Baris label="Desa/Kel" nilai={record.desa_kel} />
                        <Baris label="Kecamatan" nilai={record.kecamatan} />
                        <Baris label="Kab/Kota" nilai={record.kab_kota} />
                        <Baris label="Provinsi" nilai={record.provinsi} />
                        <div className="sm:col-span-2 lg:col-span-4">
                            <Baris label="Alamat" nilai={record.alamat} />
                        </div>
                    </div>
                </Card>

                <Card title="Permintaan Barang">
                    <div className="hidden lg:block">
                        <Table headers={['No', 'Deskripsi', 'Satuan', 'Jml']}>
                            {record.details?.length ? (
                                record.details.map((item, index) => (
                                    <tr key={item.id ?? index} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-3 text-center font-bold text-gray-400">{index + 1}</td>
                                        <td className="px-6 py-3 text-gray-800">{item.nama_material}</td>
                                        <td className="px-6 py-3 text-center text-gray-600">{item.uom}</td>
                                        <td className="px-6 py-3 text-center text-gray-700">{item.qty}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-6 text-center text-gray-400">
                                        (tidak ada item)
                                    </td>
                                </tr>
                            )}
                        </Table>
                    </div>

                    <div className="lg:hidden">
                        <CompactList
                            rows={record.details ?? []}
                            kunci={item => item.id ?? item.no_urut}
                            judul={item => item.nama_material}
                            meta={item => [`${item.qty ?? ''} ${item.uom ?? ''}`.trim()]}
                            kosong="(tidak ada item)"
                        />
                    </div>
                </Card>

                {record.reason && (
                    <Card title="Alasan">
                        <p className="text-sm text-gray-700 whitespace-pre-line">{record.reason}</p>
                    </Card>
                )}

                {record.remarks && (
                    <Card title="Catatan">
                        <p className="text-sm text-gray-700 whitespace-pre-line">{record.remarks}</p>
                    </Card>
                )}

                <Card title="Tanda Tangan">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <TandaTangan
                            judul="Requestor"
                            nama={record.requestor}
                            jabatan={record.requestor_jabatan}
                            url={record.ttd_requestor_url}
                        />
                        <TandaTangan
                            judul="Review"
                            nama={record.review_nama}
                            jabatan={record.review_jabatan}
                            url={record.ttd_review_url}
                        />
                        <TandaTangan
                            judul="Approve"
                            nama={record.approve_nama}
                            jabatan={record.approve_jabatan}
                            url={record.ttd_approve_url}
                        />
                    </div>
                </Card>
            </div>

            <DocumentPreview
                isOpen={!!dokumen}
                onClose={() => setDokumen(null)}
                judul={dokumen?.judul}
                src={dokumen?.src}
                jenis={dokumen?.jenis}
            />

            <ConfirmationModal
                isOpen={konfirmasi}
                onClose={() => setKonfirmasi(false)}
                onConfirm={hapus}
                title="Hapus Permintaan Barang"
                message="Data yang dihapus tidak bisa dikembalikan. Header dan seluruh baris material akan ikut terhapus."
                type="danger"
                confirmText="Ya, Hapus"
            />
        </>
    );
}

Show.layout = page => <AppLayout children={page} />;
