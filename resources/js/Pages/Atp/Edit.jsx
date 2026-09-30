import React, { useState } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/Card';
import Collapsible from '../../Components/Collapsible';
import Input from '../../Components/Input';
import Button from '../../Components/Button';
import ConfirmationModal from '../../Components/ConfirmationModal';
import ImageUpload from '../../Components/ImageUpload';
import Breadcrumbs from '../../Components/Breadcrumbs';
import SiteMap from '../../Components/SiteMap';
import { ArrowLeft } from 'lucide-react';
import { useDraft, DraftBar } from '../../lib/useDraft';

// Susun baris datar checklist (kategori, sub-kategori, parameter) menjadi pohon
// agar tiap bagian bisa dilipat. Fungsi murni, tidak menyentuh state form.
function susunPohon(baris) {
    const pohon = [];
    let seksi = null;
    let sub = null;

    baris.forEach((b) => {
        if (b.jenis === 'seksi') {
            seksi = { ...b, anak: [] };
            sub = null;
            pohon.push(seksi);
        } else if (b.jenis === 'sub') {
            sub = { ...b, anak: [] };
            (seksi ? seksi.anak : pohon).push(sub);
        } else if (sub) {
            sub.anak.push(b);
        } else if (seksi) {
            seksi.anak.push(b);
        } else {
            pohon.push(b);
        }
    });

    return pohon;
}

export default function Edit({ record, fotos_item }) {
    const [alertModal, setAlertModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });
    const [showConfirm, setShowConfirm] = useState(false);
    const { data, setData, post, processing, errors, setError, clearErrors } = useForm({
        nama_site: record.nama_site || '',
        tanggal: record.tanggal || '',
        region: record.region || '',
        latitude: record.latitude || '-6.200000',
        longitude: record.longitude || '106.816666',
        no_po: record.no_po || '',
        hasil_json: record.hasil_json || {
            items: {},
            hasil: {},
            catatan: {},
            itemNames: {},
            itemStds: {},
            itemTools: {},
            approval: {
                vendor_company: '',
                vendor_1_role: '',
                vendor_1_name: '',
                cme_company: '',
                cme_1_role: '',
                cme_1_name: '',
            },
        },
        verdict: record.verdict || '',
        verdict_notes: record.verdict_notes || '',
        // Foto tersimpan dari server (bukan unggahan temp) dikirim controller edit.
        fotos_item: fotos_item || {},
    });

    const { adaDraft, waktuDraft, pulihkan, buang, terakhirDisimpan } = useDraft({ kunci: `atp_${record.id}`, data });

    // Pemulihan hanya menulis ulang isian draft; nama field & alur kirim tidak berubah.
    const pulihkanDraft = () => pulihkan((kunci, nilai) => setData(kunci, nilai));

    const ubahKoordinat = (latBaru, lngBaru) =>
        setData((prev) => ({ ...prev, latitude: Number(latBaru).toFixed(6), longitude: Number(lngBaru).toFixed(6) }));

    const handleCheckChange = (key, val) => {
        const nextItems = {
            ...data.hasil_json.items,
            [key]: val,
        };
        const nextHasil = { ...data.hasil_json.hasil };
        const nextCatatan = { ...data.hasil_json.catatan };
        const nextFotos = { ...data.fotos_item };

        if (val === 'NA') {
            nextHasil[key] = '';
            nextCatatan[key] = 'Not Available';
            nextFotos[key] = [];
        }

        setData((prev) => ({
            ...prev,
            hasil_json: {
                ...prev.hasil_json,
                items: nextItems,
                hasil: nextHasil,
                catatan: nextCatatan,
            },
            fotos_item: nextFotos,
        }));
    };

    const handleTextChange = (field, key, val) => {
        setData('hasil_json', {
            ...data.hasil_json,
            [field]: {
                ...data.hasil_json[field],
                [key]: val,
            },
        });
    };

    const handleApprovalChange = (field, val) => {
        setData('hasil_json', {
            ...data.hasil_json,
            approval: {
                ...data.hasil_json.approval,
                [field]: val,
            },
        });
    };

    const handleFileChange = async (key, files) => {
        const fileList = Array.from(files);
        const uploadedFiles = [];

        for (const file of fileList) {
            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await axios.post('/api/upload-temp', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                uploadedFiles.push({
                    path: response.data.path,
                    url: response.data.url,
                    name: file.name
                });
            } catch (err) {
                const msg = err.response?.data?.message || err.response?.data?.errors?.image?.[0] || 'Gagal mengunggah foto.';
                setAlertModal({
                    isOpen: true,
                    title: 'Validasi Gambar Gagal',
                    message: msg,
                    type: 'danger'
                });
            }
        }

        setData('fotos_item', {
            ...data.fotos_item,
            [key]: [...(data.fotos_item[key] || []), ...uploadedFiles]
        });
    };

    /**
     * Hapus foto ATP yang sudah tersimpan: baris atp_photos + berkasnya dihapus
     * lewat /foto/hapus, lalu kartu foto dilepas dari daftar tanpa muat ulang.
     */
    const hapusFotoTersimpan = async (img) => {
        try {
            await axios.post('/foto/hapus', {
                source: 'atp',
                id: record.id,
                photo_id: img.id,
            });
            return true;
        } catch (err) {
            setAlertModal({
                isOpen: true,
                title: 'Gagal Hapus Foto',
                message: err.response?.data?.message || 'Foto tidak dapat dihapus. Coba lagi.',
                type: 'danger',
            });
            return false;
        }
    };

    // Calculate checks progress percentage
    const getProgress = () => {
        if (!data.hasil_json?.items) return { pct: 0, total: 0, checked: 0 };
        const keys = Object.keys(data.hasil_json.items);
        const total = keys.length;
        if (total === 0) return { pct: 0, total: 0, checked: 0 };

        const checked = keys.filter(k => data.hasil_json.items[k] !== '').length;
        const pct = Math.round((checked / total) * 100);
        return { pct, total, checked };
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        clearErrors();

        let hasError = false;
        const newErrors = {};

        if (!data.nama_site) {
            newErrors.nama_site = 'Nama site wajib diisi.';
            hasError = true;
        }
        if (!data.tanggal) {
            newErrors.tanggal = 'Tanggal pemeriksaan wajib diisi.';
            hasError = true;
        }
        if (!data.no_po) {
            newErrors.no_po = 'Nomor PO / SPK wajib diisi.';
            hasError = true;
        }

        if (hasError) {
            setError(newErrors);
            setAlertModal({
                isOpen: true,
                title: 'Validasi Gagal',
                message: 'Silakan lengkapi field wajib: nama site, tanggal pemeriksaan, dan nomor PO / SPK.',
                type: 'danger'
            });
            return;
        }

        setShowConfirm(true);
    };

    const confirmSubmit = () => {
        setShowConfirm(false);
        // Draft dihapus hanya setelah pengiriman berhasil; gagal kirim tetap tersimpan.
        post(`/atp/${record.id}/edit`, { onSuccess: buang });
    };

    const progress = getProgress();
    const app = data.hasil_json?.approval || {};
    const itemNames = data.hasil_json?.itemNames || {};
    const itemStds = data.hasil_json?.itemStds || {};
    const itemTools = data.hasil_json?.itemTools || {};
    const itemVals = data.hasil_json?.items || {};
    const itemHasil = data.hasil_json?.hasil || {};
    const itemCatatan = data.hasil_json?.catatan || {};

    // Pohon tampilan checklist. Record lama menyimpan salinan baris template di
    // hasil_json.template sehingga kategori/sub-nya bisa dilipat; record baru yang
    // tidak menyimpannya tampil sebagai daftar datar seperti sebelumnya.
    const pohonChecklist = (() => {
        const rows = [];
        const terpakai = new Set();
        const templateRows = Array.isArray(data.hasil_json?.template) ? data.hasil_json.template : [];

        templateRows.forEach((row, idx) => {
            if (!row) return;
            if (row.ty === 'sec' || row.ty === 'sub') {
                rows.push({ jenis: row.ty === 'sec' ? 'seksi' : 'sub', id: `tpl_${idx}`, label: row.tx });
            } else if (row.ty === 'it' && itemNames[row._id] !== undefined) {
                terpakai.add(row._id);
                rows.push({ jenis: 'item', key: row._id });
            }
        });

        Object.keys(itemNames).forEach((key) => {
            if (!terpakai.has(key)) rows.push({ jenis: 'item', key });
        });

        return susunPohon(rows);
    })();

    // Jumlah item yang sudah dinilai / total item pada satu bagian. Fungsi murni,
    // hanya membaca state form.
    const hitungBagian = (node) => {
        if (node.jenis === 'item') {
            return { total: 1, terisi: (itemVals[node.key] ?? '') !== '' ? 1 : 0 };
        }
        return node.anak.reduce((acc, anak) => {
            const hasil = hitungBagian(anak);
            return { total: acc.total + hasil.total, terisi: acc.terisi + hasil.terisi };
        }, { total: 0, terisi: 0 });
    };

    // Daftar item di dalam satu bagian. Dua kolom pada layar ≥1280 px supaya
    // baris pendek tidak memakai lebar penuh; bagian yang isinya sub-kategori
    // tetap satu kolom agar grid tidak bersarang jadi terlalu sempit, dan item
    // tunggal dibiarkan selebar penuh daripada menyisakan setengah kolom kosong.
    const kelasIsiBagian = (node) =>
        node.anak.length > 1 && node.anak.every((anak) => anak.jenis === 'item')
            ? 'grid grid-cols-1 gap-x-6 gap-y-1 xl:grid-cols-2'
            : 'space-y-2';

    // Render satu simpul pohon. Fungsi biasa (bukan komponen) supaya state
    // Collapsible tidak ikut direset tiap nilai form berubah.
    const renderSimpul = (node) => {
        if (node.jenis === 'item') {
            return renderItem(node.key);
        }

        const { total, terisi } = hitungBagian(node);

        return (
            <div key={node.id} id={node.id}>
                {/* Mobile: kategori & sub-kategori dilipat agar daftar panjang tetap ringkas */}
                <Collapsible
                    judul={node.label}
                    meta={`${total} parameter`}
                    penghitung={`${terisi}/${total}`}
                    tingkat={node.jenis === 'seksi' ? 0 : 1}
                >
                    <div className={kelasIsiBagian(node)}>{node.anak.map(renderSimpul)}</div>
                </Collapsible>
            </div>
        );
    };

    // Baris item penilaian; label di atas input pada ponsel.
    const renderItem = (key) => {
        const name = itemNames[key];
        const checkVal = itemVals[key] || '';
        const hasilVal = itemHasil[key] || '';
        const catatanVal = itemCatatan[key] || '';

        return (
            <div key={key} className="flex flex-col gap-2 border-b border-gray-100 px-3 py-1.5 hover:bg-gray-50/20">
                <div className="flex-grow space-y-1">
                    <span className="font-bold text-sm text-gray-800">{name}</span>
                    <div className="flex flex-wrap gap-4 text-[10px] text-gray-400">
                        <span>Standar: <code className="font-mono">{itemStds[key]}</code></span>
                        <span>Alat: <code className="font-mono">{itemTools[key]}</code></span>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Results OK/NG/NA toggles */}
                        <div>
                            <div className="flex border border-gray-200 rounded overflow-hidden">
                                {['OK', 'NG', 'NA'].map((st) => (
                                    <button
                                        key={st}
                                        type="button"
                                        onClick={() => handleCheckChange(key, st)}
                                        /* Mobile: tinggi 44px supaya nyaman disentuh */
                                        className={`h-11 px-4 sm:h-9 sm:px-3 text-xs font-bold transition ${checkVal === st
                                            ? st === 'OK'
                                                ? 'bg-emerald-500 text-white'
                                                : st === 'NG'
                                                    ? 'bg-red-500 text-white'
                                                    : 'bg-amber-500 text-amber-950'
                                            : 'bg-surface text-gray-400 hover:bg-gray-50'
                                            }`}
                                    >
                                        {st}
                                    </button>
                                ))}
                            </div>
                            {errors[`hasil_json.items.${key}`] && (
                                <p className="text-red-500 text-[10px] mt-1">{errors[`hasil_json.items.${key}`]}</p>
                            )}
                        </div>

                        {/* Mobile: input penuh di ponsel agar tidak melebar keluar layar */}
                        <div className="w-full sm:w-32">
                            <Input
                                placeholder="Hasil Pengukuran"
                                className={`text-xs p-1.5 transition-all ${checkVal === 'NA' ? 'opacity-40 bg-gray-100 cursor-not-allowed select-none' : ''}`}
                                value={hasilVal}
                                onChange={(e) => handleTextChange('hasil', key, e.target.value)}
                                disabled={checkVal === 'NA'}
                            />
                        </div>

                        <div className="w-full sm:w-44">
                            <Input
                                placeholder="Catatan Audit"
                                className={`text-xs p-1.5 transition-all ${checkVal === 'NA' ? 'opacity-40 bg-gray-100 cursor-not-allowed select-none' : ''}`}
                                value={catatanVal}
                                onChange={(e) => handleTextChange('catatan', key, e.target.value)}
                                disabled={checkVal === 'NA'}
                            />
                        </div>

                        <div className="w-full sm:w-40">
                            <div className={`transition-all ${checkVal === 'NA' ? 'opacity-40 pointer-events-none cursor-not-allowed select-none' : ''}`}>
                                <ImageUpload
                                    compact={true}
                                    multiple={true}
                                    value={data.fotos_item[key] || []}
                                    onHapusTersimpan={hapusFotoTersimpan}
                                    onChange={(files) => setData('fotos_item', {
                                        ...data.fotos_item,
                                        [key]: files
                                    })}
                                />
                            </div>
                            {errors[`fotos_item.${key}`] && (
                                <p className="text-red-500 text-[10px] mt-1">{errors[`fotos_item.${key}`]}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <Head title={`Edit ATP - ${record.nama_site}`} />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'ATP Check', href: '/atp' },
                { label: record.nama_site || `ATP #${record.id}`, href: `/atp/${record.id}` },
                { label: 'Edit Laporan' }
            ]} />

            <div className="mb-6 flex items-center gap-3">
                <Link
                    href={`/atp/${record.id}`}
                    className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-lg border border-gray-300 bg-surface text-gray-500 hover:bg-gray-50 hover:text-black transition shrink-0"
                >
                    <ArrowLeft className="h-4 w-4 stroke-[1.5]" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines">
                        Edit Laporan ATP
                    </h1>
                    <p className="text-sm text-gray-500 font-headlines mt-1">
                        Sesuaikan checklist, putusan kelayakan, dan foto verifikasi.
                    </p>
                </div>
            </div>

            {/* PROGRESS BAR */}
            {/* Mobile: progres persentase hanya untuk ponsel, desktop memakai tampilan tabel penuh */}
            <div className="lg:hidden bg-surface border border-gray-200 rounded-lg p-4 mb-6 shadow-sm flex items-center gap-4 sticky top-14 z-30">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Progress Checks:</span>
                <div className="flex-grow h-3 bg-gray-100 rounded-full overflow-hidden min-w-0">
                    <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${progress.pct}%` }}
                    />
                </div>
                <span className="text-sm font-black text-primary font-headlines">{progress.pct}%</span>
                <span className="text-xs text-gray-400">
                    ({progress.checked}/{progress.total} item diperiksa)
                </span>
            </div>

            {/* Bilah kecil di atas form: draft lama ditawarkan, bukan diterapkan otomatis */}
            <DraftBar
                adaDraft={adaDraft}
                waktuDraft={waktuDraft}
                onPulihkan={pulihkanDraft}
                onBuang={buang}
            />

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* 1. SITE INFO */}
                <Card title="Informasi Site &amp; PO">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <Input
                                label="Nama Site"
                                type="text"
                                value={data.nama_site}
                                onChange={(e) => setData('nama_site', e.target.value)}
                                error={errors.nama_site}
                                required
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Tanggal Pemeriksaan"
                                    type="date"
                                    value={data.tanggal}
                                    onChange={(e) => setData('tanggal', e.target.value)}
                                    error={errors.tanggal}
                                    required
                                />
                                <Input
                                    label="Nomor PO / SPK"
                                    type="text"
                                    value={data.no_po}
                                    onChange={(e) => setData('no_po', e.target.value)}
                                    error={errors.no_po}
                                    required
                                />
                            </div>

                            <Input
                                label="Deskripsi Wilayah / Region"
                                type="text"
                                value={data.region}
                                onChange={(e) => setData('region', e.target.value)}
                                error={errors.region}
                            />

                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    label="Latitude"
                                    type="text"
                                    value={data.latitude}
                                    readOnly
                                />
                                <Input
                                    label="Longitude"
                                    type="text"
                                    value={data.longitude}
                                    readOnly
                                />
                            </div>
                        </div>

                        {/* MAP CONTAINER */}
                        <SiteMap lat={Number(data.latitude)} lng={Number(data.longitude)} onChange={ubahKoordinat} height={280} />
                    </div>
                </Card>

                {/* 2. DYNAMIC ATP CHECKLIST */}
                <Card title="Checkpoint Parameter ATP">
                    <div className="space-y-6">
                        {pohonChecklist.map(renderSimpul)}
                    </div>
                </Card>

                {/* 3. APPROVAL METADATA */}
                <Card title="Tanda Tangan &amp; Otorisasi">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* VENDOR */}
                        <div className="space-y-3 p-4 border border-gray-150 rounded-lg">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Pihak Pelaksana (Vendor)</h4>
                            <Input
                                label="Perusahaan Vendor"
                                value={app.vendor_company || ''}
                                onChange={(e) => handleApprovalChange('vendor_company', e.target.value)}
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    label="Nama Representative"
                                    value={app.vendor_1_name || ''}
                                    onChange={(e) => handleApprovalChange('vendor_1_name', e.target.value)}
                                />
                                <Input
                                    label="Jabatan"
                                    value={app.vendor_1_role || ''}
                                    onChange={(e) => handleApprovalChange('vendor_1_role', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* CME TIM */}
                        <div className="space-y-3 p-4 border border-gray-150 rounded-lg">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-gray-900">Tim Evaluasi (CME Team)</h4>
                            <Input
                                label="Perusahaan CME"
                                value={app.cme_company || ''}
                                onChange={(e) => handleApprovalChange('cme_company', e.target.value)}
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    label="Nama Representative"
                                    value={app.cme_1_name || ''}
                                    onChange={(e) => handleApprovalChange('cme_1_name', e.target.value)}
                                />
                                <Input
                                    label="Jabatan"
                                    value={app.cme_1_role || ''}
                                    onChange={(e) => handleApprovalChange('cme_1_role', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* 4. PUTUSAN */}
                <Card title="Hasil Putusan Audit">
                    <div className="space-y-4">
                        <div>
                            <label className="block font-medium text-xs text-gray-700 mb-2">Putusan Kelayakan</label>
                            <div className="flex gap-2">
                                {['ACCEPT', 'CONDITIONAL', 'REJECT'].map((v) => (
                                    <button
                                        key={v}
                                        type="button"
                                        onClick={() => setData('verdict', v)}
                                        className={`px-4 py-2 min-h-[44px] sm:min-h-0 border rounded-md font-bold text-xs uppercase tracking-wider transition ${data.verdict === v
                                            ? v === 'ACCEPT'
                                                ? 'bg-emerald-500 border-transparent text-white'
                                                : v === 'CONDITIONAL'
                                                    ? 'bg-amber-500 border-transparent text-amber-950'
                                                    : 'bg-red-500 border-transparent text-white'
                                            : 'bg-surface border-gray-300 text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <textarea
                            placeholder="Catatan putusan..."
                            value={data.verdict_notes}
                            onChange={(e) => setData('verdict_notes', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:border-primary focus:ring focus:ring-primary/20 outline-none min-h-[80px]"
                        />
                    </div>
                </Card>

                {/* Indikator draft sejajar tombol simpan agar tidak menggeser tombol. */}
                <div className="flex items-center gap-4">
                    <Button
                        type="submit"
                        variant="secondary"
                        className="px-8 py-3 text-xs uppercase tracking-wider font-bold"
                        processing={processing}
                    >
                        Simpan Perubahan
                    </Button>
                    <Link
                        href={`/atp/${record.id}`}
                        className="inline-flex items-center justify-center px-6 py-2 min-h-[44px] sm:min-h-0 border border-gray-300 rounded-md font-semibold text-xs text-gray-700 uppercase tracking-widest bg-surface hover:bg-gray-50 transition"
                    >
                        Batal
                    </Link>
                    {/* Indikator kecil setelah penyimpanan otomatis pertama */}
                    {terakhirDisimpan && (
                        <span className="self-center text-[11px] text-gray-400">
                            Draft tersimpan {terakhirDisimpan}
                        </span>
                    )}
                </div>
            </form>

            <ConfirmationModal
                isOpen={alertModal.isOpen}
                onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
                title={alertModal.title}
                message={alertModal.message}
                type={alertModal.type}
            />

            <ConfirmationModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={confirmSubmit}
                title="Konfirmasi Perubahan ATP"
                message="Apakah Anda yakin ingin menyimpan perubahan laporan ATP ini?"
                type="warning"
                confirmText="Ya, Simpan"
            />
        </>
    );
}

Edit.layout = page => <AppLayout children={page} />;
