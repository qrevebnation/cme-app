import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/Card';
import Input from '../../Components/Input';
import Select from '../../Components/Select';
import Button from '../../Components/Button';
import ConfirmationModal from '../../Components/ConfirmationModal';
import ImageUpload from '../../Components/ImageUpload';
import Breadcrumbs from '../../Components/Breadcrumbs';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

/** Kategori baris rincian: dari relasi barang, atau dipotong dari nama lama ("Kategori Tipe"). */
function kategoriBaris(detail) {
    if (detail.barang?.kategori) return detail.barang.kategori;

    const nama = (detail.nama_barang || '').trim();
    const tipe = (detail.tipe_barang || '').trim();
    if (tipe && nama.endsWith(tipe)) return nama.slice(0, -tipe.length).trim();

    return nama;
}

export default function KeluarEdit({ transaction, items = [], categories = [] }) {
    const [fotoTersimpan, setFotoTersimpan] = useState(
        (transaction.media_urls || []).map((url) => {
            const nama = decodeURIComponent(url.split('/').pop() || '');
            return { id: null, path: nama, url, name: nama, isExisting: true };
        }),
    );
    const [fotoBaru, setFotoBaru] = useState([]);
    const [showHapus, setShowHapus] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        tanggal: transaction.tanggal || '',
        judul: transaction.judul || '',
        pengambil: transaction.pengambil || '',
        jabatan: transaction.jabatan || '',
        lokasi_tujuan: transaction.lokasi_tujuan || '',
        keperluan: transaction.keperluan || '',
        proyek: transaction.proyek || '',
        disetujui: transaction.disetujui || '',
        keterangan: transaction.keterangan || '',
        items: (transaction.details || []).map((detail) => ({
            kategori: kategoriBaris(detail),
            tipe: detail.tipe_barang || '',
            jumlah: detail.jumlah,
        })),
        foto: [],
    });

    /** Daftar foto digabung: yang tersimpan di server + unggahan temp yang belum disimpan. */
    const daftarFoto = [...fotoTersimpan, ...fotoBaru];

    const ubahFoto = (files) => {
        setFotoTersimpan(files.filter((berkas) => berkas.isExisting));
        const baru = files.filter((berkas) => !berkas.isExisting);
        setFotoBaru(baru);
        setData('foto', baru.map(({ path, url, name }) => ({ path, url, name })));
    };

    /** Hapus foto tersimpan: berkas + entri kolom foto dihapus di server. */
    const hapusFotoTersimpan = async (img) => {
        try {
            await axios.post('/foto/hapus', {
                source: 'gudang_keluar',
                id: transaction.id,
                file: img.path,
            });
            return true;
        } catch (err) {
            alert(err.response?.data?.message || 'Foto tidak dapat dihapus. Coba lagi.');
            return false;
        }
    };

    const tambahBaris = () =>
        setData('items', [...data.items, { kategori: '', tipe: '', jumlah: '' }]);

    const ubahBaris = (idx, patch) =>
        setData('items', data.items.map((baris, i) => (i === idx ? { ...baris, ...patch } : baris)));

    const hapusBaris = (idx) =>
        setData('items', data.items.filter((_, i) => i !== idx));

    const kirim = (e) => {
        e.preventDefault();
        post(`/gudang/keluar/${transaction.id}/edit`);
    };

    const hapusTransaksi = () => router.delete(`/gudang/keluar/${transaction.id}`);

    return (
        <>
            <Head title={`Edit Barang Keluar ${transaction.no_form} - Web CME`} />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Inventory', href: '/gudang' },
                { label: 'Riwayat Transaksi', href: '/gudang/history' },
                { label: `Edit ${transaction.no_form}` },
            ]} />

            <div className="mb-6 flex items-center gap-3">
                <Link
                    href="/gudang/history"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-gray-300 bg-surface p-2 text-gray-500 transition hover:bg-gray-50 hover:text-black sm:min-h-0 sm:min-w-0"
                >
                    <ArrowLeft className="h-4 w-4 stroke-[1.5]" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines">
                        Edit Barang Keluar
                    </h1>
                    <p className="text-sm text-gray-500 font-headlines mt-1">
                        Perbaiki header, rincian barang, dan foto transaksi. Perubahan jumlah ikut menyesuaikan stok.
                    </p>
                </div>
            </div>

            <form onSubmit={kirim} className="space-y-6 text-xs font-body">
                <Card title="Informasi Transaksi">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Input label="No. Form" value={transaction.no_form} readOnly disabled />
                        <Input
                            label="Tanggal Rilis"
                            type="date"
                            value={data.tanggal}
                            onChange={(e) => setData('tanggal', e.target.value)}
                            error={errors.tanggal}
                            required
                        />
                        <Input
                            label="Judul Pekerjaan / Proyek"
                            value={data.judul}
                            onChange={(e) => setData('judul', e.target.value)}
                            error={errors.judul}
                        />
                        <Input
                            label="Keperluan"
                            value={data.keperluan}
                            onChange={(e) => setData('keperluan', e.target.value)}
                            error={errors.keperluan}
                        />
                        <Input
                            label="Nama Pengambil / Koordinator"
                            value={data.pengambil}
                            onChange={(e) => setData('pengambil', e.target.value)}
                            error={errors.pengambil}
                            required
                        />
                        <Input
                            label="Jabatan Pengambil"
                            value={data.jabatan}
                            onChange={(e) => setData('jabatan', e.target.value)}
                            error={errors.jabatan}
                        />
                        <Input
                            label="Site Tujuan / Delivery"
                            value={data.lokasi_tujuan}
                            onChange={(e) => setData('lokasi_tujuan', e.target.value)}
                            error={errors.lokasi_tujuan}
                            required
                        />
                        <Input
                            label="Disetujui / Mengetahui"
                            value={data.disetujui}
                            onChange={(e) => setData('disetujui', e.target.value)}
                            error={errors.disetujui}
                        />
                        <Input
                            label="Proyek"
                            value={data.proyek}
                            onChange={(e) => setData('proyek', e.target.value)}
                            error={errors.proyek}
                        />
                        <div>
                            <label className="block font-medium text-xs text-gray-700 mb-1">Keterangan / Memo</label>
                            <textarea
                                value={data.keterangan}
                                onChange={(e) => setData('keterangan', e.target.value)}
                                className="w-full border border-gray-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                            />
                        </div>
                    </div>
                </Card>

                <Card
                    title="Rincian Barang Keluar"
                    headerActions={
                        <Button type="button" onClick={tambahBaris} variant="outline" className="h-11 sm:h-9 gap-1.5">
                            <Plus className="h-3.5 w-3.5" /> Tambah Baris
                        </Button>
                    }
                >
                    {errors.items && <p className="mb-2 text-red-500">{errors.items}</p>}

                    {data.items.length === 0 ? (
                        <p className="py-6 text-center text-gray-400">Belum ada barang pada transaksi ini.</p>
                    ) : (
                        <div className="space-y-3">
                            {data.items.map((baris, idx) => {
                                const tipeKategori = [...new Set(
                                    items
                                        .filter((it) => it.kategori === baris.kategori && it.tipe)
                                        .map((it) => it.tipe),
                                )];
                                const cocok = items.find((it) => it.kategori === baris.kategori && it.tipe === baris.tipe);
                                const tersedia = cocok ? cocok.stok : 0;
                                const lewatStok = baris.jumlah !== '' && parseInt(baris.jumlah, 10) > tersedia;

                                return (
                                    <div key={idx} className="grid grid-cols-1 items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 md:grid-cols-4">
                                        <Select
                                            label="Kategori"
                                            value={baris.kategori}
                                            onChange={(e) => ubahBaris(idx, { kategori: e.target.value, tipe: '', jumlah: '' })}
                                            options={categories}
                                            placeholder="Pilih Kategori..."
                                            required
                                        />
                                        <Select
                                            label="Tipe / Spesifikasi"
                                            value={baris.tipe}
                                            onChange={(e) => ubahBaris(idx, { tipe: e.target.value, jumlah: '' })}
                                            options={tipeKategori}
                                            placeholder={baris.kategori ? 'Pilih Tipe...' : 'Pilih Kategori'}
                                            disabled={!baris.kategori}
                                            required
                                        />
                                        <div>
                                            <Input
                                                label="Jumlah"
                                                type="number"
                                                min="1"
                                                value={baris.jumlah}
                                                onChange={(e) => ubahBaris(idx, { jumlah: e.target.value })}
                                                placeholder={cocok ? `Tersedia: ${tersedia}` : 'Jumlah keluar'}
                                                disabled={!baris.kategori || !baris.tipe}
                                                required
                                                className={lewatStok ? 'border-red-500 text-red-600 focus:ring-red-500' : ''}
                                            />
                                            {lewatStok && (
                                                <p className="mt-1 text-[10px] font-semibold text-red-500">Jumlah melebihi stok tersedia!</p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => hapusBaris(idx)}
                                            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 hover:text-red-700 sm:h-9 sm:w-9"
                                            title="Hapus Baris"
                                            aria-label="Hapus Baris"
                                        >
                                            <Trash2 className="h-4 w-4 stroke-[1.5]" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>

                <Card title="Foto Transaksi">
                    <ImageUpload
                        compact={true}
                        multiple={true}
                        value={daftarFoto}
                        onHapusTersimpan={hapusFotoTersimpan}
                        onChange={ubahFoto}
                    />
                    <p className="mt-2 text-[10px] text-gray-400">
                        Foto lama dihapus langsung dari server; foto baru ikut tersimpan saat menekan Simpan.
                    </p>
                </Card>

                <div className="flex flex-wrap gap-2">
                    <Button type="submit" variant="primary" processing={processing} className="h-11 sm:h-9 gap-1.5">
                        Simpan
                    </Button>
                    <Link
                        href="/gudang/history"
                        className="inline-flex h-11 sm:h-9 items-center justify-center rounded-md border border-gray-300 bg-surface px-4 text-xs font-semibold uppercase tracking-widest text-gray-700 transition hover:bg-gray-50"
                    >
                        Batal
                    </Link>
                    <Button type="button" variant="danger" onClick={() => setShowHapus(true)} className="h-11 sm:h-9 gap-1.5">
                        <Trash2 className="h-4 w-4 stroke-[1.5]" /> Hapus
                    </Button>
                </div>
            </form>

            <ConfirmationModal
                isOpen={showHapus}
                onClose={() => setShowHapus(false)}
                onConfirm={hapusTransaksi}
                title="Hapus Transaksi"
                message={`Transaksi ${transaction.no_form} beserta seluruh rinciannya akan dihapus dan stok barang dikembalikan. Lanjutkan?`}
                type="danger"
                confirmText="Ya, Hapus"
            />
        </>
    );
}

KeluarEdit.layout = page => <AppLayout children={page} />;
