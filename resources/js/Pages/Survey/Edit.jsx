import React, { useState, useEffect } from 'react';
import { Head, useForm, Link, router } from '@inertiajs/react';
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

export default function Edit({ survey, defaultTemplate }) {
    const [alertModal, setAlertModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });

    const { data, setData, post, processing, errors, setError, clearErrors } = useForm({
        nama_site: survey.nama_site || '',
        tanggal_survey: survey.tanggal_survey || '',
        nama_surveyor: survey.nama_surveyor || '',
        lokasi: survey.lokasi || '',
        latitude: survey.latitude || '-6.200000',
        longitude: survey.longitude || '106.816666',
        catatan_tambahan: survey.catatan_tambahan || '',
        items: {},
        photos: {},
    });

    const { adaDraft, waktuDraft, pulihkan, buang, terakhirDisimpan } = useDraft({ kunci: `survey_${survey.id}`, data });

    // Pemulihan hanya menulis ulang isian draft; nama field & alur kirim tidak berubah.
    const pulihkanDraft = () => pulihkan((kunci, nilai) => setData(kunci, nilai));

    // Populate checklist state with existing values from database
    useEffect(() => {
        const initialItems = {};
        const initialPhotos = {};

        // Tipe & opsi item dicari pada struktur 3 tingkat template berdasar nomor item.
        const cariTipe = (nomor) => {
            for (const kat of defaultTemplate || []) {
                const semua = [...(kat.items || []), ...(kat.subs || []).flatMap((sub) => sub.items || [])];
                const cocok = semua.find((it) => it.nomor === nomor);
                if (cocok) return { type: cocok.type, options: cocok.options || [] };
            }
            return { type: 'text', options: [] };
        };

        survey.items.forEach((item) => {
            const key = item.nomor_item;
            const { type, options } = cariTipe(item.nomor_item);

            initialItems[key] = {
                item_db_id: item.id,
                kategori: item.kategori,
                sub_kategori: item.sub_kategori || null,
                nomor: item.nomor_item,
                nama: item.nama_item,
                type: type,
                options: options,
                status: item.status_check,
                kondisi: item.kondisi_nilai,
                catatan: item.catatan || '',
            };

            const itemPhotos = survey.photos.filter((p) => p.item_id === item.id);
            initialPhotos[key] = itemPhotos.map((p) => ({
                id: p.id,
                path: p.file_path,
                url: p.file_url,
                name: p.file_path,
                isExisting: true,
            }));
        });

        setData((prev) => ({
            ...prev,
            items: initialItems,
            photos: initialPhotos,
        }));
    }, [survey, defaultTemplate]);

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
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingPayload, setPendingPayload] = useState(null);

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

        setData('photos', {
            ...data.photos,
            [key]: [...(data.photos[key] || []), ...uploadedFiles]
        });
    };

    /**
     * Hapus foto yang sudah tersimpan di server (bukan unggahan temp): baris
     * survey_photos + berkasnya dihapus lewat /foto/hapus, lalu kartu foto
     * dilepas dari daftar tanpa memuat ulang halaman.
     */
    const hapusFotoTersimpan = async (img) => {
        try {
            await axios.post('/foto/hapus', {
                source: 'survey',
                id: survey.id,
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

    const handleSubmit = (e) => {
        e.preventDefault();
        if (clearErrors) clearErrors();
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

        const payload = {};

        // 1. Basic details (only if changed)
        if (data.nama_site !== survey.nama_site) payload.nama_site = data.nama_site;
        if (data.tanggal_survey !== survey.tanggal_survey) payload.tanggal_survey = data.tanggal_survey;
        if (data.nama_surveyor !== survey.nama_surveyor) payload.nama_surveyor = data.nama_surveyor;
        if (data.lokasi !== survey.lokasi) payload.lokasi = data.lokasi;
        if (data.latitude !== survey.latitude) payload.latitude = data.latitude;
        if (data.longitude !== survey.longitude) payload.longitude = data.longitude;
        if (data.catatan_tambahan !== (survey.catatan_tambahan || '')) payload.catatan_tambahan = data.catatan_tambahan;

        // 2. Checklist items (only changed ones)
        const changedItems = {};
        Object.entries(data.items).forEach(([key, item]) => {
            const originalItem = survey.items.find(it => it.nomor_item === key);
            if (originalItem) {
                const isStatusChanged = item.status !== originalItem.status_check;
                const isKondisiChanged = item.kondisi !== originalItem.kondisi_nilai;
                const isCatatanChanged = item.catatan !== (originalItem.catatan || '');
                if (isStatusChanged || isKondisiChanged || isCatatanChanged) {
                    changedItems[key] = {
                        item_db_id: item.item_db_id,
                        sub_kategori: item.sub_kategori || null,
                        status: item.status,
                        kondisi: item.kondisi,
                        catatan: item.catatan,
                    };
                }
            }
        });
        if (Object.keys(changedItems).length > 0) {
            payload.items = changedItems;
        }

        // 3. Photo attachments (only if modified)
        const changedPhotos = {};
        const deletedPhotoIds = [];

        survey.items.forEach((item) => {
            const key = item.nomor_item;
            const originalItemPhotos = survey.photos.filter(p => p.item_id === item.id);
            const currentItemPhotos = data.photos[key] || [];

            const originalUrls = originalItemPhotos.map(p => p.file_url).sort();
            const currentUrls = currentItemPhotos.map(p => p.url).sort();

            const isPhotosChanged = JSON.stringify(originalUrls) !== JSON.stringify(currentUrls);
            if (isPhotosChanged) {
                changedPhotos[key] = currentItemPhotos;

                originalItemPhotos.forEach(op => {
                    if (!currentItemPhotos.some(cp => cp.id === op.id)) {
                        deletedPhotoIds.push(op.id);
                    }
                });
            }
        });

        if (Object.keys(changedPhotos).length > 0) {
            payload.photos = changedPhotos;
        }
        if (deletedPhotoIds.length > 0) {
            payload.deleted_photo_ids = deletedPhotoIds;
        }

        setPendingPayload(payload);
        setShowConfirm(true);
    };

    const confirmSubmit = () => {
        if (pendingPayload) {
            // Draft dihapus hanya setelah pengiriman berhasil; gagal kirim tetap tersimpan.
            router.post(`/survey/${survey.id}/edit`, pendingPayload, { onSuccess: buang });
        }
    };

    // Kelompokkan item per kategori, lalu per sub_kategori; item tanpa sub tampil langsung di bawah kategori.
    const groupedItems = {};
    Object.entries(data.items).forEach(([key, item]) => {
        if (!groupedItems[item.kategori]) {
            groupedItems[item.kategori] = { langsung: [], subs: [] };
        }
        const grup = groupedItems[item.kategori];

        if (item.sub_kategori) {
            let sub = grup.subs.find((s) => s.nama === item.sub_kategori);
            if (!sub) {
                sub = { nama: item.sub_kategori, items: [] };
                grup.subs.push(sub);
            }
            sub.items.push({ key, ...item });
        } else {
            grup.langsung.push({ key, ...item });
        }
    });

    // Kartu satu item: dipakai item langsung di bawah kategori maupun item di dalam sub.
    const gridItem = (daftar) => (
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 xl:grid-cols-2">
            {daftar.map((item) => {
                const key = item.key;
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

                            <div>
                                {/* Mobile: tombol OK/NG 44px agar nyaman disentuh */}
                                <div className="flex border border-gray-200 rounded overflow-hidden w-fit mt-2">
                                    <button
                                        type="button"
                                        onClick={() => handleItemChange(key, 'status', 'checked')}
                                        className={`h-11 px-4 sm:h-9 sm:px-3 text-xs font-bold transition ${item.status === 'checked'
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-surface text-gray-400 hover:bg-gray-50'
                                            }`}
                                    >
                                        OK
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleItemChange(key, 'status', 'cross')}
                                        className={`h-11 px-4 sm:h-9 sm:px-3 text-xs font-bold transition ${item.status === 'cross'
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
                                        value={item.kondisi || ''}
                                        onChange={(e) => handleItemChange(key, 'kondisi', e.target.value)}
                                        className="w-full h-11 sm:h-9 border-gray-300 rounded-md text-xs p-1.5 bg-surface focus:border-primary focus:ring focus:ring-primary/20 outline-none"
                                    >
                                        <option value="">Pilih...</option>
                                        {item.options && item.options.map((opt, oIdx) => (
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
                                    placeholder="Kondisi lapangan"
                                    className="text-xs p-1.5 h-11 sm:h-auto"
                                    value={item.kondisi || ''}
                                    onChange={(e) => handleItemChange(key, 'kondisi', e.target.value)}
                                />
                            )}

                            <div>
                                <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">
                                    Tambah/Kelola Foto
                                </label>
                                <ImageUpload
                                    compact={true}
                                    multiple={true}
                                    value={data.photos[key] || []}
                                    onHapusTersimpan={hapusFotoTersimpan}
                                    onChange={(files) => setData('photos', {
                                        ...data.photos,
                                        [key]: files
                                    })}
                                />
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
            <Head title={`Edit Survey - ${survey.nama_site}`} />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Survey', href: '/survey' },
                { label: survey.nama_site || `Survey #${survey.id}`, href: `/survey/${survey.id}` },
                { label: 'Edit Laporan' }
            ]} />

            <div className="mb-6 flex items-center gap-3">
                <Link
                    href={`/survey/${survey.id}`}
                    className="inline-flex items-center justify-center p-2 rounded-lg border border-gray-300 bg-surface text-gray-500 hover:bg-gray-50 hover:text-black transition shrink-0"
                >
                    <ArrowLeft className="h-4 w-4 stroke-[1.5]" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines">
                        Edit Laporan Survey
                    </h1>
                    <p className="text-sm text-gray-500 font-headlines mt-1">
                        Sesuaikan checklist site ODC, rincian koordinat, dan tambahkan foto verifikasi baru.
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
                {/* 1. SITE INFO */}
                <Card title="Informasi Site &amp; Koordinat">
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
                                    value={data.nama_surveyor}
                                    onChange={(e) => setData('nama_surveyor', e.target.value)}
                                    error={errors.nama_surveyor}
                                    required
                                />
                            </div>

                            <Input
                                label="Alamat / Deskripsi Lokasi"
                                type="text"
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

                {/* 2. DYNAMIC CHECKLIST EDITING */}
                {/* Mobile: kategori dibungkus Collapsible agar daftar panjang bisa dilipat */}
                {Object.entries(groupedItems).map(([kat, grup]) => {
                    const semuaItem = [...grup.langsung, ...grup.subs.flatMap((sub) => sub.items)];
                    const terisi = semuaItem.filter((item) => item.status).length;
                    return (
                        <Collapsible
                            key={kat}
                            judul={kat}
                            meta={`${semuaItem.length} item`}
                            penghitung={`${terisi}/${semuaItem.length}`}
                            tingkat={0}
                        >
                            <div className="space-y-3">
                                {grup.langsung.length > 0 && gridItem(grup.langsung)}
                                {grup.subs.map((sub, sIdx) => {
                                    const terisiSub = sub.items.filter((item) => item.status).length;
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
                        placeholder="Catatan tambahan..."
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
                        Simpan Perubahan
                    </Button>
                    <Link
                        href={`/survey/${survey.id}`}
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

            <ConfirmationModal
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={confirmSubmit}
                title="Konfirmasi Perubahan"
                message="Apakah Anda yakin ingin menyimpan perubahan laporan survey ini?"
                type="warning"
                confirmText="Ya, Simpan"
            />
        </>
    );
}


Edit.layout = page => <AppLayout children={page} />;
