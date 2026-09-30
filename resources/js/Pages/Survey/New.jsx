import React, { useState, useEffect, useRef } from 'react';
import { Head, useForm, Link, router } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/Card';
import Collapsible from '../../Components/Collapsible';
import Input from '../../Components/Input';
import Button from '../../Components/Button';
import Alert from '../../Components/Alert';
import ConfirmationModal from '../../Components/ConfirmationModal';
import PhotoDropzone from '../../Components/PhotoDropzone';
import CameraCapture from '../../Components/CameraCapture';
import Breadcrumbs from '../../Components/Breadcrumbs';
import SiteMap from '../../Components/SiteMap';
import { ArrowLeft } from 'lucide-react';
import { useDraft, DraftBar } from '../../lib/useDraft';

const MAX_FOTO_ITEM = 4;

export default function New({ defaultTemplate, templates = [], selectedTemplateId = null }) {
    const [alertModal, setAlertModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    // Pratinjau berkas per item: berkas diunggah ke temp lebih dulu, lalu disimpan
    // sebagai { path, url, name } di data.photos[key] agar kontrak kirim tetap sama.
    const berkasItemRef = useRef({});
    const unggahanRef = useRef(new Map());
    const [berkasItem, setBerkasItem] = useState({});
    const [unggahAktif, setUnggahAktif] = useState({});

    const { data, setData, post, processing, errors, setError, clearErrors } = useForm({
        nama_site: '',
        tanggal_survey: new Date().toISOString().split('T')[0],
        nama_surveyor: '',
        lokasi: '',
        latitude: '-6.200000',
        longitude: '106.816666',
        catatan_tambahan: '',
        items: {}, // Form item checkpoints
        photos: {}, // Photos files array mapped by template item key
    });

    const { adaDraft, waktuDraft, pulihkan, buang, terakhirDisimpan } = useDraft({ kunci: 'survey_baru', data });

    // Pemulihan hanya menulis ulang isian draft; nama field & alur kirim tidak berubah.
    const pulihkanDraft = () => pulihkan((kunci, nilai) => setData(kunci, nilai));

    // Checklist dibangun dari struktur 3 tingkat template: kategori -> sub-kategori -> item.
    useEffect(() => {
        const initialItems = {};
        (defaultTemplate || []).forEach((kat) => {
            const semuaItem = [
                ...(kat.items || []),
                ...(kat.subs || []).flatMap((sub) => sub.items || []),
            ];
            semuaItem.forEach((item) => {
                initialItems[item.kunci] = {
                    kategori: kat.nama,
                    nomor: item.nomor,
                    nama: item.nama,
                    type: item.type,
                    options: item.options,
                    sub_kategori: item.sub_kategori,
                    status: '',
                    kondisi: '',
                    catatan: '',
                };
            });
        });
        setData('items', initialItems);
    }, [defaultTemplate]);

    const ubahKoordinat = (latBaru, lngBaru) =>
        setData((prev) => ({ ...prev, latitude: Number(latBaru).toFixed(6), longitude: Number(lngBaru).toFixed(6) }));

    const handleItemChange = (key, field, val) => {
        setData('items', {
            ...data.items,
            [key]: {
                ...data.items[key],
                [field]: val,
            },
        });
    };

    // Susun ulang data.photos[key] dari daftar berkas yang masih tersisa, sehingga
    // berkas yang dihapus dari pratinjau ikut hilang dari data kirim.
    const sinkronkanFotoItem = (key) => {
        const daftar = berkasItemRef.current[key] || [];
        setData((prev) => ({
            ...prev,
            photos: {
                ...prev.photos,
                [key]: daftar.map((file) => unggahanRef.current.get(file)).filter(Boolean),
            },
        }));
    };

    const handleFileChange = async (key, files) => {
        const daftar = files.slice(0, MAX_FOTO_ITEM);
        berkasItemRef.current = { ...berkasItemRef.current, [key]: daftar };
        setBerkasItem((prev) => ({ ...prev, [key]: daftar }));
        sinkronkanFotoItem(key);

        const tambahan = daftar.filter((file) => !unggahanRef.current.has(file));
        if (tambahan.length === 0) return;

        setUnggahAktif((prev) => ({ ...prev, [key]: true }));

        for (const file of tambahan) {
            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await axios.post('/api/upload-temp', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                unggahanRef.current.set(file, {
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

        setUnggahAktif((prev) => ({ ...prev, [key]: false }));
        sinkronkanFotoItem(key);
    };

    // Hasil jepretan kamera masuk ke daftar berkas item yang sama.
    const handleKameraItem = (key, file) => {
        handleFileChange(key, [...(berkasItemRef.current[key] || []), file]);
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
        if (!data.tanggal_survey) {
            newErrors.tanggal_survey = 'Tanggal survey wajib diisi.';
            hasError = true;
        }
        if (!data.nama_surveyor) {
            newErrors.nama_surveyor = 'Nama surveyor wajib diisi.';
            hasError = true;
        }

        if (hasError) {
            setError(newErrors);
            setAlertModal({
                isOpen: true,
                title: 'Validasi Gagal',
                message: 'Silakan lengkapi field wajib: nama site, tanggal survey, dan nama surveyor.',
                type: 'danger'
            });
            return;
        }

        // Draft dihapus hanya setelah pengiriman berhasil; gagal kirim tetap tersimpan.
        post('/survey/baru', { onSuccess: buang });
    };

    // Kartu satu item: dipakai item langsung di bawah kategori maupun item di dalam sub.
    const gridItem = (daftar) => (
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 xl:grid-cols-2">
            {daftar.map((item) => {
                const key = item.kunci;
                const state = data.items[key] || {};
                return (
                    <div key={key} className="p-3 border border-gray-100 rounded-lg bg-gray-50/50 flex flex-col md:flex-row md:items-start gap-3">
                        <div className="min-w-0 flex-grow space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="bg-text text-bg font-mono text-[10px] px-1.5 py-0.5 rounded font-bold">
                                    {item.nomor}
                                </span>
                                <span className="font-semibold text-sm text-gray-800">
                                    {item.nama}
                                </span>
                            </div>
                            {/* Checklist check controls depending on type */}
                            <div>
                                {/* Mobile: tombol OK/NG 44px agar nyaman disentuh */}
                                <div className="flex border border-gray-200 rounded overflow-hidden w-fit mt-2">
                                    <button
                                        type="button"
                                        onClick={() => handleItemChange(key, 'status', 'checked')}
                                        className={`h-11 px-4 sm:h-9 sm:px-3 text-xs font-bold transition ${state.status === 'checked'
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-surface text-gray-400 hover:bg-gray-50'
                                            }`}
                                    >
                                        OK
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleItemChange(key, 'status', 'cross')}
                                        className={`h-11 px-4 sm:h-9 sm:px-3 text-xs font-bold transition ${state.status === 'cross'
                                            ? 'bg-red-500 text-white'
                                            : 'bg-surface text-gray-400 hover:bg-gray-50'
                                            }`}
                                    >
                                        NG
                                    </button>
                                </div>
                                {errors[`items.${key}.status`] && (
                                    <p className="text-red-500 text-[10px] mt-1">{errors[`items.${key}.status`]}</p>
                                )}
                            </div>
                        </div>

                        <div className="w-full md:w-72 xl:w-64 space-y-2.5">
                            {item.type === 'select' ? (
                                <div className="w-full">
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Pilihan Nilai</label>
                                    {/* Mobile: select ditinggikan agar mudah disentuh */}
                                    <select
                                        value={state.kondisi || ''}
                                        onChange={(e) => handleItemChange(key, 'kondisi', e.target.value)}
                                        className="w-full h-11 sm:h-9 border-gray-300 rounded-md text-xs p-1.5 bg-surface focus:border-primary focus:ring focus:ring-primary/20 outline-none"
                                    >
                                        <option value="">Pilih...</option>
                                        {(item.options || []).map((opt, oIdx) => (
                                            <option key={oIdx} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                    {errors[`items.${key}.kondisi`] && (
                                        <p className="text-red-500 text-[10px] mt-1">{errors[`items.${key}.kondisi`]}</p>
                                    )}
                                </div>
                            ) : (
                                <Input
                                    label="Catatan Kondisi"
                                    placeholder="Kondisi riil lapangan"
                                    className="text-xs p-1.5 h-11 sm:h-auto"
                                    value={state.kondisi || ''}
                                    onChange={(e) => handleItemChange(key, 'kondisi', e.target.value)}
                                />
                            )}

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-[10px] font-semibold text-gray-500 uppercase">
                                        Foto Item (maks {MAX_FOTO_ITEM})
                                    </label>
                                    {unggahAktif[key] && (
                                        <span className="text-[10px] text-gray-400">Mengunggah...</span>
                                    )}
                                </div>
                                <PhotoDropzone
                                    files={berkasItem[key] || []}
                                    onChange={(files) => handleFileChange(key, files)}
                                    maxFiles={MAX_FOTO_ITEM}
                                    label=""
                                    hint="Tarik foto ke sini atau klik untuk memilih"
                                />
                                <div className="mt-1.5">
                                    <CameraCapture
                                        onCapture={(file) => handleKameraItem(key, file)}
                                        disabled={(berkasItem[key] || []).length >= MAX_FOTO_ITEM}
                                    />
                                </div>
                                {errors[`photos.${key}`] && (
                                    <p className="text-red-500 text-[10px] mt-1">{errors[`photos.${key}`]}</p>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    return (
        <>
            <Head title="Survey Baru - Web CME" />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Survey', href: '/survey' },
                { label: 'Survey Baru' }
            ]} />

            <div className="mb-6 flex items-center gap-3">
                <Link
                    href="/survey"
                    className="inline-flex items-center justify-center p-2 rounded-lg border border-gray-300 bg-surface text-gray-500 hover:bg-gray-50 hover:text-black transition shrink-0"
                >
                    <ArrowLeft className="h-4 w-4 stroke-[1.5]" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines">
                        Survey Baru
                    </h1>
                    <p className="text-sm text-gray-500 font-headlines mt-1">
                        Input site checklist, koordinat lokasi, dan foto manual instruksi.
                    </p>
                </div>
            </div>

            {/* Bilah kecil di atas form: draft lama ditawarkan, bukan diterapkan otomatis */}
            <DraftBar
                adaDraft={adaDraft}
                waktuDraft={waktuDraft}
                onPulihkan={pulihkanDraft}
                onBuang={buang}
            />

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* 1. INFORMASI SITE */}
                <Card title="Informasi Site &amp; Koordinat">
                    {templates.length > 0 && (
                        <div className="mb-6 max-w-md">
                            <label className="block font-medium text-xs text-gray-700 mb-1">
                                Template Checklist
                            </label>
                            <select
                                value={selectedTemplateId ? String(selectedTemplateId) : 'default'}
                                onChange={(e) => {
                                    const nilai = e.target.value;
                                    router.get(
                                        '/survey/baru',
                                        nilai === 'default' ? {} : { template: nilai },
                                        { preserveScroll: true, preserveState: false },
                                    );
                                }}
                                className="w-full h-11 sm:h-auto border-border rounded-md shadow-sm text-sm p-2 bg-surface focus:border-primary focus:ring focus:ring-primary/20 outline-none transition"
                            >
                                <option value="default">Template bawaan</option>
                                {templates.map((tpl) => (
                                    <option key={tpl.id} value={tpl.id}>
                                        {tpl.title}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                Mengganti template akan menyusun ulang daftar item checklist di bawah.
                            </p>
                        </div>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <Input
                                label="Nama Site"
                                type="text"
                                placeholder="Masukkan nama site/lokasi"
                                value={data.nama_site}
                                onChange={(e) => setData('nama_site', e.target.value)}
                                error={errors.nama_site}
                                required
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Tanggal Survey"
                                    type="date"
                                    value={data.tanggal_survey}
                                    onChange={(e) => setData('tanggal_survey', e.target.value)}
                                    error={errors.tanggal_survey}
                                    required
                                />
                                <Input
                                    label="Nama Surveyor"
                                    type="text"
                                    placeholder="Nama penanggung jawab"
                                    value={data.nama_surveyor}
                                    onChange={(e) => setData('nama_surveyor', e.target.value)}
                                    error={errors.nama_surveyor}
                                    required
                                />
                            </div>

                            <Input
                                label="Alamat / Deskripsi Lokasi"
                                type="text"
                                placeholder="Alamat lengkap lokasi site"
                                value={data.lokasi}
                                onChange={(e) => setData('lokasi', e.target.value)}
                                error={errors.lokasi}
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

                        <SiteMap lat={Number(data.latitude)} lng={Number(data.longitude)} onChange={ubahKoordinat} height={280} />
                    </div>
                </Card>

                {/* 2. DYNAMIC CHECKLIST MODULE */}
                {/* Mobile: kategori dibungkus Collapsible agar daftar panjang bisa dilipat */}
                {defaultTemplate.map((kat) => {
                    const semuaItem = [
                        ...(kat.items || []),
                        ...(kat.subs || []).flatMap((sub) => sub.items || []),
                    ];
                    const terisi = semuaItem.filter((item) => data.items[item.kunci]?.status).length;
                    return (
                        <Collapsible
                            key={kat.nama}
                            judul={kat.nama}
                            meta={`${semuaItem.length} item`}
                            penghitung={`${terisi}/${semuaItem.length}`}
                            tingkat={0}
                        >
                            <div className="space-y-3">
                                {kat.items?.length > 0 && gridItem(kat.items)}
                                {(kat.subs || []).map((sub, sIdx) => {
                                    const terisiSub = sub.items.filter((item) => data.items[item.kunci]?.status).length;
                                    return (
                                        <Collapsible
                                            key={`${sub.nama}-${sIdx}`}
                                            judul={sub.nama}
                                            meta={`${sub.items.length} item`}
                                            penghitung={`${terisiSub}/${sub.items.length}`}
                                            tingkat={1}
                                        >
                                            {gridItem(sub.items)}
                                        </Collapsible>
                                    );
                                })}
                            </div>
                        </Collapsible>
                    );
                })}

                {/* 3. ADDITIONAL REMARKS */}
                <Card title="Catatan Tambahan">
                    <textarea
                        placeholder="Catatan tambahan hasil pemeriksaan lapangan..."
                        value={data.catatan_tambahan}
                        onChange={(e) => setData('catatan_tambahan', e.target.value)}
                        className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:border-primary focus:ring focus:ring-primary/20 outline-none min-h-[100px]"
                    />
                </Card>

                {/* Indikator draft sejajar tombol simpan agar tidak menggeser tombol. */}
                <div className="flex items-center gap-4">
                    <Button
                        type="submit"
                        variant="secondary"
                        className="px-8 py-3 text-xs uppercase tracking-wider font-bold"
                        processing={processing}
                    >
                        Simpan Laporan
                    </Button>
                    <Link
                        href="/survey"
                        className="inline-flex items-center justify-center px-6 py-2 border border-gray-300 rounded-md font-semibold text-xs text-gray-700 uppercase tracking-widest bg-surface hover:bg-gray-50 transition"
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
        </>
    );
}


New.layout = page => <AppLayout children={page} />;
