import React, { useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/Card';
import Input from '../../Components/Input';
import Select from '../../Components/Select';
import Button from '../../Components/Button';
import Breadcrumbs from '../../Components/Breadcrumbs';
import ConfirmationModal from '../../Components/ConfirmationModal';
import DocumentPreview from '../../Components/DocumentPreview';
import { ArrowLeft, CheckCircle2, Printer, Trash2, Undo2 } from 'lucide-react';

function DetailRow({ label, value }) {
    return (
        <div className="flex flex-col gap-0.5 py-2 border-b border-gray-100 last:border-b-0">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
            <span className="text-sm text-gray-800 font-body">{value || '-'}</span>
        </div>
    );
}

export default function Show({ loan, tool, kondisiList = [], defaults = {}, canDelete = false }) {
    const [showDelete, setShowDelete] = useState(false);
    const [dokumen, setDokumen] = useState(null);

    const { data, setData, post, processing, errors } = useForm({
        tgl_kembali: defaults.tgl_kembali || new Date().toISOString().split('T')[0],
        kondisi_kembali: kondisiList[0] || 'Baik',
        catatan: '',
    });

    const sudahKembali = loan.status === 'kembali';

    const handleKembalikan = (e) => {
        e.preventDefault();
        post(`/tools/${loan.id}/kembali`);
    };

    const confirmDelete = () => {
        router.delete(`/tools/${loan.id}`, {
            onFinish: () => setShowDelete(false),
        });
    };

    return (
        <>
            <Head title={`Peminjaman ${loan.no_form} - Web CME`} />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Inventory', href: '/gudang' },
                { label: 'Peminjaman Tools', href: '/tools' },
                { label: loan.no_form }
            ]} />

            <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <Link
                        href="/tools"
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-surface text-gray-500 hover:bg-gray-50 hover:text-black transition sm:h-9 sm:w-9"
                    >
                        <ArrowLeft className="h-4 w-4 stroke-[1.5]" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines">
                            Detail Peminjaman Tool
                        </h1>
                        <p className="text-sm text-gray-500 font-headlines mt-1 font-mono">{loan.no_form}</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setDokumen({ judul: `Dokumen Peminjaman Tools ${loan.no_form}`, src: `/print/tool_loan_print?id=${loan.id}` })}
                        className="inline-flex h-11 items-center gap-1.5 px-4 py-2 bg-surface border border-border text-text hover:text-primary hover:border-primary text-xs font-bold uppercase rounded-lg transition shadow-sm sm:h-9"
                    >
                        <Printer className="h-4 w-4 stroke-[1.5]" />
                        Cetak PDF
                    </button>
                    {canDelete && (
                        <Button variant="danger" onClick={() => setShowDelete(true)} className="h-11 gap-1.5 sm:h-9">
                            <Trash2 className="h-4 w-4 stroke-[1.5]" />
                            Hapus
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="Informasi Peminjaman" className="lg:col-span-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                        <DetailRow label="No. Form" value={loan.no_form} />
                        <DetailRow label="Status" value={loan.status_label} />
                        <DetailRow label="Tool" value={loan.tipe} />
                        <DetailRow label="Kategori" value={loan.kategori} />
                        <DetailRow label="Jumlah" value={`${loan.jumlah} unit`} />
                        <DetailRow label="Peminjam" value={loan.peminjam} />
                        <DetailRow label="Yang Mengetahui" value={loan.mengetahui} />
                        <DetailRow label="Lokasi / Proyek" value={loan.lokasi} />
                        <DetailRow label="Tanggal Pinjam" value={loan.tgl_pinjam} />
                        <DetailRow label="Rencana Kembali" value={loan.rencana_kembali} />
                        <DetailRow label="Keperluan" value={loan.keperluan} />
                        <DetailRow label="Dicatat" value={loan.created_at} />
                        {sudahKembali && (
                            <>
                                <DetailRow label="Tanggal Kembali" value={loan.tgl_kembali} />
                                <DetailRow label="Kondisi Kembali" value={loan.kondisi_kembali} />
                                <div className="sm:col-span-2">
                                    <DetailRow label="Catatan" value={loan.catatan} />
                                </div>
                            </>
                        )}
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card title="Ketersediaan Tool">
                        {tool ? (
                            <div className="space-y-2 text-sm font-body">
                                <div className="font-bold text-gray-900">{tool.tipe}</div>
                                <div className="text-[11px] text-gray-400 uppercase tracking-widest">{tool.kategori}</div>
                                <div className="flex justify-between pt-2 border-t border-gray-100">
                                    <span className="text-gray-500">Stok gudang</span>
                                    <span className="font-semibold text-gray-800">{tool.stok} unit</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Sedang dipinjam</span>
                                    <span className="font-semibold text-gray-800">{tool.dipinjam} unit</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Tersedia</span>
                                    <span className="font-black text-primary">{tool.tersedia} unit</span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400">Data tool tidak ditemukan di gudang.</p>
                        )}
                    </Card>

                    {sudahKembali ? (
                        <Card title="Pengembalian">
                            <div className="flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-400 font-body">
                                <CheckCircle2 className="h-4 w-4 stroke-[1.75] mt-0.5 shrink-0" />
                                <div>
                                    <div className="font-semibold">Tool sudah dikembalikan</div>
                                    <div className="text-[11px] text-gray-500 mt-0.5">
                                        {loan.tgl_kembali} · kondisi {loan.kondisi_kembali || '-'}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <Card title="Form Pengembalian">
                            <form onSubmit={handleKembalikan} className="space-y-3">
                                <Input
                                    type="date"
                                    label="Tanggal Kembali"
                                    value={data.tgl_kembali}
                                    onChange={(e) => setData('tgl_kembali', e.target.value)}
                                    error={errors.tgl_kembali}
                                    required
                                />
                                <Select
                                    label="Kondisi"
                                    value={data.kondisi_kembali}
                                    onChange={(e) => setData('kondisi_kembali', e.target.value)}
                                    options={kondisiList}
                                    placeholder="Pilih kondisi..."
                                    error={errors.kondisi_kembali}
                                />
                                <div>
                                    <label className="block font-medium text-xs text-gray-700 mb-1">Catatan</label>
                                    <textarea
                                        rows={3}
                                        value={data.catatan}
                                        onChange={(e) => setData('catatan', e.target.value)}
                                        className={`w-full border-border rounded-md shadow-sm text-sm p-2 bg-surface focus:border-primary focus:ring focus:ring-primary/20 outline-none transition ${errors.catatan ? 'border-red-500' : ''}`}
                                    />
                                    {errors.catatan && <p className="text-red-500 text-xs mt-1">{errors.catatan}</p>}
                                </div>
                                <Button type="submit" variant="primary" processing={processing} className="h-11 w-full gap-1.5 sm:h-auto">
                                    <Undo2 className="h-4 w-4 stroke-[1.5]" />
                                    Simpan Pengembalian
                                </Button>
                            </form>
                        </Card>
                    )}
                </div>
            </div>

            <DocumentPreview
                isOpen={!!dokumen}
                onClose={() => setDokumen(null)}
                judul={dokumen?.judul}
                src={dokumen?.src}
            />

            <ConfirmationModal
                isOpen={showDelete}
                onClose={() => setShowDelete(false)}
                onConfirm={confirmDelete}
                type="danger"
                title="Hapus transaksi ini?"
                message="Data peminjaman akan dihapus permanen dan tidak dapat dikembalikan."
                confirmText="Ya, Hapus"
            />
        </>
    );
}

Show.layout = page => <AppLayout children={page} />;
