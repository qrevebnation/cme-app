import React, { useMemo, useState } from 'react';
import { Link, useForm } from '@inertiajs/react';
import Card from '../../../Components/Card';
import Table from '../../../Components/Table';
import Input from '../../../Components/Input';
import StatefulButton from '../../../Components/StatefulButton';
import Cascader from '../../../Components/Cascader';
import { PlusCircle, Trash2 } from 'lucide-react';

const KELAS_INPUT = 'w-full border-border rounded-md shadow-sm text-sm p-2 focus:border-primary focus:ring focus:ring-primary/20 outline-none transition bg-surface';

/** Baris material kosong yang dipakai saat form baru dibuka. */
const barisKosong = () => ({ nama_material: '', uom: 'Pcs', qty: 1 });

export default function MaterialRequestForm({
    record = null,
    uomList = [],
    barangList = [],
    defaultTtd = {},
    defaultRequestor = '',
    tanggalHariIni = '',
    submitUrl,
    submitLabel = 'Simpan',
}) {
    const [pratinjau, setPratinjau] = useState({ ttd_requestor: null, ttd_review: null, ttd_approve: null });
    const [peringatan, setPeringatan] = useState('');
    const [statusSimpan, setStatusSimpan] = useState('idle');

    const pohonBarang = useMemo(() => {
        const perKategori = new Map();
        for (const b of barangList) {
            const kat = b.kategori || 'Tanpa kategori';
            const tipe = b.tipe || 'Tanpa tipe';
            if (!perKategori.has(kat)) perKategori.set(kat, new Map());
            const perTipe = perKategori.get(kat);
            if (!perTipe.has(tipe)) perTipe.set(tipe, []);
            perTipe.get(tipe).push({
                value: b.nama,
                label: b.nama,
                description: [b.merek, b.satuan].filter(Boolean).join(' · '),
                meta: { satuan: b.satuan, kategori: b.kategori, tipe: b.tipe },
            });
        }
        return [...perKategori].map(([kat, perTipe]) => ({
            value: kat,
            label: kat,
            children: [...perTipe].map(([tipe, item]) => ({ value: tipe, label: tipe, children: item })),
        }));
    }, [barangList]);

    const { data, setData, post, processing, errors, transform } = useForm({
        tanggal: record?.tanggal || tanggalHariIni,
        no_referensi: record?.no_referensi || '',
        kontrak_mitra: record?.kontrak_mitra || '',
        stasiun_site: record?.stasiun_site || '',
        alamat: record?.alamat || '',
        desa_kel: record?.desa_kel || '',
        kecamatan: record?.kecamatan || '',
        kab_kota: record?.kab_kota || '',
        provinsi: record?.provinsi || '',
        pic: record?.pic || '',
        no_telp: record?.no_telp || '',
        reason: record?.reason || '',
        homepass: record?.homepass || '',
        remarks: record?.remarks || '',
        requestor: record?.requestor || defaultRequestor,
        requestor_jabatan: record?.requestor_jabatan || '',
        review_nama: record?.review_nama || defaultTtd.review_nama || '',
        review_jabatan: record?.review_jabatan || defaultTtd.review_jabatan || '',
        approve_nama: record?.approve_nama || defaultTtd.approve_nama || '',
        approve_jabatan: record?.approve_jabatan || defaultTtd.approve_jabatan || '',
        ttd_requestor: null,
        ttd_review: null,
        ttd_approve: null,
        hapus_ttd_requestor: false,
        hapus_ttd_review: false,
        hapus_ttd_approve: false,
        items: record?.details?.length
            ? record.details.map(d => ({
                nama_material: d.nama_material || '',
                uom: d.uom || 'Pcs',
                qty: d.qty || 1,
            }))
            : [barisKosong()],
    });

    // Status tombol simpan bergantung pada proses pengiriman form di atas.
    const statusTombol = processing ? 'loading' : statusSimpan;

    const ubahItem = (index, field, nilai) => {
        const berikut = [...data.items];
        berikut[index] = { ...berikut[index], [field]: nilai };
        setData('items', berikut);
    };

    const tambahBaris = () => setData('items', [...data.items, barisKosong()]);

    const hapusBaris = (index) => {
        if (data.items.length <= 1) return;
        setData('items', data.items.filter((_, i) => i !== index));
    };

    // Satu handler dipakai tabel desktop dan tumpukan input ponsel supaya perilakunya tidak bisa berbeda.
    const pilihMaterial = (index) => (nama, meta) => {
        const berikut = [...data.items];
        berikut[index] = {
            ...berikut[index],
            nama_material: nama,
            // Bila dipilih dari stok gudang, satuan ikut disesuaikan.
            ...(meta?.satuan ? { uom: meta.satuan } : {}),
        };
        setData('items', berikut);
    };

    /** Tombol hapus baris: sasaran sentuh 44 px di ponsel, kembali rapat di desktop. */
    const tombolHapus = (index) => (
        <button
            type="button"
            onClick={() => hapusBaris(index)}
            disabled={data.items.length <= 1}
            title="Hapus baris"
            aria-label={`Hapus baris ${index + 1}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-ng hover:bg-ng/10 hover:text-ng/70 disabled:opacity-30 transition sm:h-9 sm:w-9"
        >
            <Trash2 className="h-4 w-4 stroke-[1.5]" />
        </button>
    );

    const pilihTtd = (field, file) => {
        setData(field, file);
        if (!file) {
            setPratinjau(p => ({ ...p, [field]: null }));
            return;
        }
        const pembaca = new FileReader();
        pembaca.onload = e => setPratinjau(p => ({ ...p, [field]: e.target.result }));
        pembaca.readAsDataURL(file);
    };

    const kirim = (e) => {
        e.preventDefault();

        const terisi = data.items
            .map(item => ({ ...item, nama_material: (item.nama_material || '').trim() }))
            .filter(item => item.nama_material !== '');

        if (terisi.length === 0) {
            setPeringatan('Minimal 1 baris material (Description) harus diisi.');
            setStatusSimpan('gagal');
            return;
        }

        setPeringatan('');
        // Baris kosong dibuang sebelum dikirim (aturan sama seperti aplikasi lama).
        transform(isi => ({ ...isi, items: terisi }));
        post(submitUrl, {
            forceFormData: true,
            preserveScroll: true,
            onStart: () => setStatusSimpan('idle'),
            onSuccess: (halaman) => {
                const flash = halaman?.props?.flash;
                setStatusSimpan(flash?.error || flash?.warning ? 'gagal' : 'sukses');
            },
            onError: () => setStatusSimpan('gagal'),
        });
    };

    const blokTtd = (field, label, adaLama) => (
        <div className="md:col-span-3">
            <label className="block font-medium text-xs text-gray-700 mb-1">
                {label} <span className="text-gray-400">(gambar, opsional)</span>
            </label>
            <div className="flex flex-wrap items-center gap-3">
                {adaLama && !pratinjau[field] && (
                    <>
                        <img
                            src={record[`${field}_url`]}
                            alt={label}
                            className="max-h-16 border border-border rounded-md bg-surface p-1"
                        />
                        <label className="flex items-center gap-1 text-xs text-ng">
                            <input
                                type="checkbox"
                                checked={data[`hapus_${field}`]}
                                onChange={e => setData(`hapus_${field}`, e.target.checked)}
                            />
                            hapus tanda tangan lama
                        </label>
                    </>
                )}
                <input
                    type="file"
                    accept="image/*"
                    className="block text-xs text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-primary/10 file:text-primary dark:text-primary-strong file:text-xs file:font-semibold"
                    onChange={e => pilihTtd(field, e.target.files?.[0] || null)}
                />
                {pratinjau[field] && (
                    <img src={pratinjau[field]} alt={`Pratinjau ${label}`} className="max-h-16 border border-border rounded-md bg-white p-1" />
                )}
            </div>
            {errors[field] && <p className="text-red-500 text-xs mt-1">{errors[field]}</p>}
        </div>
    );

    return (
        <form onSubmit={kirim} className="space-y-6">
            <Card title="Informasi Permintaan">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                        type="date"
                        label="Tanggal *"
                        value={data.tanggal}
                        onChange={e => setData('tanggal', e.target.value)}
                        error={errors.tanggal}
                        required
                    />
                    <Input
                        label="Stasiun/Site *"
                        value={data.stasiun_site}
                        onChange={e => setData('stasiun_site', e.target.value)}
                        error={errors.stasiun_site}
                        required
                    />
                    <Input
                        label="Kontrak/Mitra"
                        value={data.kontrak_mitra}
                        onChange={e => setData('kontrak_mitra', e.target.value)}
                        error={errors.kontrak_mitra}
                    />
                    <Input
                        label="Nomer Referensi"
                        value={data.no_referensi}
                        onChange={e => setData('no_referensi', e.target.value)}
                        error={errors.no_referensi}
                    />
                    <Input
                        label="Homepass"
                        value={data.homepass}
                        onChange={e => setData('homepass', e.target.value)}
                        error={errors.homepass}
                    />
                    <Input
                        label="No. Telp"
                        value={data.no_telp}
                        onChange={e => setData('no_telp', e.target.value)}
                        error={errors.no_telp}
                    />
                    <Input
                        label="PIC"
                        value={data.pic}
                        onChange={e => setData('pic', e.target.value)}
                        error={errors.pic}
                    />
                    <Input
                        label="Desa/Kel"
                        value={data.desa_kel}
                        onChange={e => setData('desa_kel', e.target.value)}
                        error={errors.desa_kel}
                    />
                    <Input
                        label="Kecamatan"
                        value={data.kecamatan}
                        onChange={e => setData('kecamatan', e.target.value)}
                        error={errors.kecamatan}
                    />
                    <Input
                        label="Kab/Kota"
                        value={data.kab_kota}
                        onChange={e => setData('kab_kota', e.target.value)}
                        error={errors.kab_kota}
                    />
                    <Input
                        label="Provinsi"
                        value={data.provinsi}
                        onChange={e => setData('provinsi', e.target.value)}
                        error={errors.provinsi}
                    />
                    <div className="md:col-span-3">
                        <Input
                            label="Alamat"
                            value={data.alamat}
                            onChange={e => setData('alamat', e.target.value)}
                            error={errors.alamat}
                        />
                    </div>
                    <div className="md:col-span-3">
                        <label className="block font-medium text-xs text-gray-700 mb-1">Reason *</label>
                        <textarea
                            rows={2}
                            className={`${KELAS_INPUT} ${errors.reason ? 'border-red-500' : ''}`}
                            value={data.reason}
                            onChange={e => setData('reason', e.target.value)}
                            required
                        />
                        {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason}</p>}
                    </div>
                </div>
            </Card>

            <Card
                title="Material Request"
                headerActions={
                    <button
                        type="button"
                        onClick={tambahBaris}
                        className="inline-flex h-11 items-center gap-1 px-2 text-xs font-bold text-primary hover:text-primary/80 uppercase tracking-wider transition sm:h-9 sm:px-0"
                    >
                        <PlusCircle className="h-4 w-4 stroke-[1.5]" />
                        Tambah Baris
                    </button>
                }
            >
                {/* Tabel hanya untuk layar >=768 px; di ponsel barisnya jadi tumpukan label+input. */}
                <div className="hidden md:block">
                    <Table headers={['No', 'Description', 'UoM', 'Qty', '']}>
                        {data.items.map((item, index) => (
                            <tr key={index}>
                                <td className="px-4 py-3 text-center font-bold text-gray-400">{index + 1}</td>
                                <td className="px-4 py-3">
                                    <Cascader
                                        tree={pohonBarang}
                                        value={item.nama_material}
                                        onChange={pilihMaterial(index)}
                                        allowCustom
                                        placeholder="Pilih / ketik nama material"
                                        kosongTeks='Barang tidak ada di stok, pilih opsi "Gunakan".'
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <input
                                        type="text"
                                        list="uomList"
                                        className={KELAS_INPUT}
                                        value={item.uom}
                                        onChange={e => ubahItem(index, 'uom', e.target.value)}
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <input
                                        type="number"
                                        min="1"
                                        className={KELAS_INPUT}
                                        value={item.qty}
                                        onChange={e => ubahItem(index, 'qty', e.target.value)}
                                    />
                                </td>
                                <td className="px-4 py-3 text-center">{tombolHapus(index)}</td>
                            </tr>
                        ))}
                    </Table>
                </div>

                <div className="space-y-3 md:hidden">
                    {data.items.map((item, index) => (
                        <div key={index} className="rounded-lg border border-border p-3 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Baris {index + 1}</span>
                                {tombolHapus(index)}
                            </div>
                            {/* Label di atas input supaya lebar kolom tabel tidak perlu digeser di 390 px. */}
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                                <label className="text-xs font-medium text-gray-700 sm:w-24">Description</label>
                                <div className="sm:flex-1">
                                    <Cascader
                                        tree={pohonBarang}
                                        value={item.nama_material}
                                        onChange={pilihMaterial(index)}
                                        allowCustom
                                        placeholder="Pilih / ketik nama material"
                                        kosongTeks='Barang tidak ada di stok, pilih opsi "Gunakan".'
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                                <label className="text-xs font-medium text-gray-700 sm:w-24">UoM</label>
                                <input
                                    type="text"
                                    list="uomList"
                                    className={`${KELAS_INPUT} sm:w-32`}
                                    value={item.uom}
                                    onChange={e => ubahItem(index, 'uom', e.target.value)}
                                />
                            </div>
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                                <label className="text-xs font-medium text-gray-700 sm:w-24">Qty</label>
                                <input
                                    type="number"
                                    min="1"
                                    className={`${KELAS_INPUT} sm:w-32`}
                                    value={item.qty}
                                    onChange={e => ubahItem(index, 'qty', e.target.value)}
                                />
                            </div>
                        </div>
                    ))}
                </div>
                <datalist id="uomList">
                    {uomList.map(u => <option key={u} value={u} />)}
                </datalist>
                {errors.items && <p className="text-red-500 text-xs mt-2">{errors.items}</p>}
                {peringatan && <p className="text-red-500 text-xs mt-2">{peringatan}</p>}

                <div className="mt-4">
                    <label className="block font-medium text-xs text-gray-700 mb-1">Remarks</label>
                    <textarea
                        rows={2}
                        className={KELAS_INPUT}
                        value={data.remarks}
                        onChange={e => setData('remarks', e.target.value)}
                    />
                </div>
            </Card>

            <Card title="Tanda Tangan">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                        label="Requestor"
                        value={data.requestor}
                        onChange={e => setData('requestor', e.target.value)}
                        error={errors.requestor}
                    />
                    <Input
                        label="Jabatan Requestor"
                        value={data.requestor_jabatan}
                        onChange={e => setData('requestor_jabatan', e.target.value)}
                        error={errors.requestor_jabatan}
                    />
                    <div className="hidden md:block" />
                    {blokTtd('ttd_requestor', 'Tanda Tangan Digital (Requestor)', !!record?.ttd_requestor_url)}

                    <Input
                        label="Review"
                        value={data.review_nama}
                        onChange={e => setData('review_nama', e.target.value)}
                        error={errors.review_nama}
                    />
                    <Input
                        label="Jabatan Review"
                        value={data.review_jabatan}
                        onChange={e => setData('review_jabatan', e.target.value)}
                        error={errors.review_jabatan}
                    />
                    <div className="hidden md:block" />
                    {blokTtd('ttd_review', 'Tanda Tangan Digital (Review)', !!record?.ttd_review_url)}

                    <Input
                        label="Approve"
                        value={data.approve_nama}
                        onChange={e => setData('approve_nama', e.target.value)}
                        error={errors.approve_nama}
                    />
                    <Input
                        label="Jabatan Approve"
                        value={data.approve_jabatan}
                        onChange={e => setData('approve_jabatan', e.target.value)}
                        error={errors.approve_jabatan}
                    />
                    <div className="hidden md:block" />
                    {blokTtd('ttd_approve', 'Tanda Tangan Digital (Approve)', !!record?.ttd_approve_url)}
                </div>
            </Card>

            <div className="flex flex-wrap items-center gap-3">
                <StatefulButton type="submit" status={statusTombol} className="h-11 sm:h-auto">
                    {submitLabel}
                </StatefulButton>
                <Link
                    href={record ? `/material-request/${record.id}` : '/material-request'}
                    className="inline-flex h-11 items-center justify-center px-4 py-2 bg-surface border border-border rounded-md font-semibold text-xs text-gray-700 uppercase tracking-widest hover:bg-gray-50 transition sm:h-auto"
                >
                    Batal
                </Link>
            </div>
        </form>
    );
}
