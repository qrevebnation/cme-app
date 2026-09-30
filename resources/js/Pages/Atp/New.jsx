import React, { useState, useEffect, useMemo } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/Card';
import Collapsible from '../../Components/Collapsible';
import Input from '../../Components/Input';
import Button from '../../Components/Button';
import Stepper from '../../Components/Stepper';
import SiteMap from '../../Components/SiteMap';
import ConfirmationModal from '../../Components/ConfirmationModal';
import ImageUpload from '../../Components/ImageUpload';
import Breadcrumbs from '../../Components/Breadcrumbs';
import { ArrowLeft, Sliders, Layers } from 'lucide-react';
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

export default function New({ defaultTemplate = [], templates = [] }) {
    const [alertModal, setAlertModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });
    const [showConfirm, setShowConfirm] = useState(false);

    // Selected template state ('default' or template ID)
    const initialTemplateId = templates.length > 0 ? String(templates[0].id) : 'default';
    const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId);

    const { data, setData, post, processing, errors, setError, clearErrors } = useForm({
        template_id: initialTemplateId !== 'default' ? parseInt(initialTemplateId) : null,
        nama_site: '',
        tanggal: new Date().toISOString().split('T')[0],
        region: '',
        latitude: '-6.200000',
        longitude: '106.816666',
        no_po: '',
        hasil_json: {
            items: {},
            hasil: {},
            catatan: {},
            itemNames: {},
            itemStds: {},
            itemTools: {},
            itemTypes: {},
            approval: {
                vendor_company: '',
                vendor_1_role: '',
                vendor_1_name: '',
                cme_company: '',
                cme_1_role: '',
                cme_1_name: '',
            },
        },
        verdict: '',
        verdict_notes: '',
        fotos_item: {}, // File uploads mapped by item key
    });

    const { adaDraft, waktuDraft, pulihkan, buang, terakhirDisimpan } = useDraft({ kunci: 'atp_baru', data });

    // Pemulihan hanya menulis ulang isian draft; nama field & alur kirim tidak berubah.
    const pulihkanDraft = () => pulihkan((kunci, nilai) => setData(kunci, nilai));

    // Populate checklist details on template loads or template change
    useEffect(() => {
        const initialItems = {};
        const initialHasil = {};
        const initialCatatan = {};
        const names = {};
        const stds = {};
        const tools = {};
        const types = {};

        if (selectedTemplateId !== 'default') {
            const currentTpl = templates.find(t => String(t.id) === String(selectedTemplateId));
            if (currentTpl && Array.isArray(currentTpl.fields)) {
                currentTpl.fields.forEach((field) => {
                    // Baris kategori/sub-kategori hanya judul, tidak menjadi item penilaian.
                    if (field.type === 'judul') return;

                    const key = field.id;
                    initialItems[key] = '';
                    initialHasil[key] = '';
                    initialCatatan[key] = '';
                    names[key] = field.label;
                    stds[key] = field.standard || '';
                    tools[key] = field.tool || '';
                    types[key] = field.type || 'text';
                });
            }
        } else if (Array.isArray(defaultTemplate)) {
            defaultTemplate.forEach((item) => {
                if (item.ty === 'it') {
                    const key = item._id;
                    initialItems[key] = '';
                    initialHasil[key] = '';
                    initialCatatan[key] = '';
                    names[key] = item.d[0];
                    stds[key] = item.d[1];
                    tools[key] = item.d[2];
                    types[key] = 'text';
                }
            });
        }

        setData((prev) => ({
            ...prev,
            template_id: selectedTemplateId !== 'default' ? parseInt(selectedTemplateId) : null,
            hasil_json: {
                ...prev.hasil_json,
                items: initialItems,
                hasil: initialHasil,
                catatan: initialCatatan,
                itemNames: names,
                itemStds: stds,
                itemTools: tools,
                itemTypes: types,
            },
            fotos_item: {},
        }));
    }, [selectedTemplateId, templates, defaultTemplate]);

    // Handle template selector dropdown change
    const handleTemplateChange = (e) => {
        const val = e.target.value;
        setSelectedTemplateId(val);
    };

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
                message: 'Silakan lengkapi semua field yang wajib diisi.',
                type: 'danger'
            });
            return;
        }

        setShowConfirm(true);
    };

    const confirmSubmit = () => {
        setShowConfirm(false);
        // Draft dihapus hanya setelah pengiriman berhasil; gagal kirim tetap tersimpan.
        post('/atp/baru', { onSuccess: buang });
    };

    const progress = getProgress();
    const activeTemplate = templates.find(t => String(t.id) === String(selectedTemplateId));
    const activeFields = activeTemplate ? activeTemplate.fields : null;

    const [bagianAktif, setBagianAktif] = useState(null);

    // Daftar kategori/sub-kategori template aktif, untuk navigasi cepat di samping form.
    const bagian = useMemo(() => {
        if (activeFields) {
            return activeFields
                .filter((f) => f.jenis === 'seksi' || f.jenis === 'sub')
                .map((f) => ({ id: f.id, label: f.label, jenis: f.jenis }));
        }

        // Template bawaan (format lama) tetap punya seksi & sub-kategori.
        return (defaultTemplate || [])
            .map((item, idx) => {
                if (item?.ty === 'sec' || item?.ty === 'sub') {
                    return { id: `legacy_${idx}`, label: item.tx, jenis: item.ty === 'sec' ? 'seksi' : 'sub' };
                }
                return null;
            })
            .filter(Boolean);
    }, [activeFields, defaultTemplate]);

    // Pohon tampilan checklist (kategori → sub-kategori → item) agar tiap bagian
    // bisa dilipat. Id tetap sama dengan daftar `bagian` supaya Stepper masih
    // bisa menggulir ke bagian yang dipilih.
    const pohonChecklist = useMemo(() => {
        if (activeFields) {
            return susunPohon(activeFields.map((f) => (
                f.jenis === 'seksi' || f.jenis === 'sub'
                    ? { jenis: f.jenis, id: f.id, label: f.label }
                    : { jenis: 'item', key: f.id, field: f }
            )));
        }

        // Template bawaan (format lama) memakai penanda ty: sec/sub/it.
        return susunPohon((defaultTemplate || []).flatMap((item, idx) => {
            if (item?.ty === 'sec' || item?.ty === 'sub') {
                return [{ jenis: item.ty === 'sec' ? 'seksi' : 'sub', id: `legacy_${idx}`, label: item.tx }];
            }
            if (item?.ty === 'it') {
                return [{ jenis: 'item', key: item._id, item }];
            }
            return [];
        }));
    }, [activeFields, defaultTemplate]);

    // Jumlah item yang sudah dinilai / total item pada satu bagian. Fungsi murni,
    // hanya membaca state form.
    const hitungBagian = (node) => {
        if (node.jenis === 'item') {
            return { total: 1, terisi: (data.hasil_json?.items?.[node.key] ?? '') !== '' ? 1 : 0 };
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
            return node.field ? renderItemDinamis(node.field) : renderItemLama(node.item);
        }

        const { total, terisi } = hitungBagian(node);

        return (
            <div key={node.id} id={node.id} className="scroll-mt-24">
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

    // Baris item template dinamis (format baru).
    const renderItemDinamis = (field) => {
        const key = field.id;
        const checkVal = data.hasil_json?.items?.[key] ?? '';
        const hasilVal = data.hasil_json?.hasil?.[key] ?? '';
        const catatanVal = data.hasil_json?.catatan?.[key] ?? '';
        const isNA = checkVal === 'NA';

        return (
            <div
                key={key}
                className="flex flex-col gap-2 border border-gray-100 rounded-xl bg-surface px-3 py-1.5 transition hover:bg-gray-50/40"
            >
                {/* PARAMETER INFO */}
                <div className="flex-grow space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900">{field.label}</span>
                        {field.required && (
                            <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.2 rounded border border-red-100 uppercase">
                                Wajib
                            </span>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-[10px] text-gray-400">
                        {field.standard && (
                            <span>Standar: <code className="font-mono text-gray-600 font-semibold">{field.standard}</code></span>
                        )}
                        {field.tool && (
                            <span>Alat: <code className="font-mono text-gray-600 font-semibold">{field.tool}</code></span>
                        )}
                    </div>
                </div>

                {/* ACTIONS & DYNAMIC WIDGETS */}
                <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                        {/* OK / NG / NA TOGGLE BUTTONS */}
                        <div>
                            <div className="flex border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
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
                                            : 'bg-surface text-gray-500 hover:bg-gray-50'
                                            }`}
                                    >
                                        {st}
                                    </button>
                                ))}
                            </div>
                            {errors[`hasil_json.items.${key}`] && (
                                <p className="text-red-500 text-[10px] mt-1 font-medium">{errors[`hasil_json.items.${key}`]}</p>
                            )}
                        </div>

                        {/* DYNAMIC MEASUREMENT INPUT WIDGET */}
                        {/* Mobile: input penuh di ponsel agar tidak melebar keluar layar */}
                        {field.type === 'select' ? (
                            <select
                                disabled={isNA}
                                value={hasilVal}
                                onChange={(e) => handleTextChange('hasil', key, e.target.value)}
                                aria-label="Hasil pengukuran"
                                className={`text-xs p-1.5 w-full sm:w-36 rounded-lg border-gray-300 shadow-2xs focus:border-primary focus:ring-primary transition-all ${isNA ? 'opacity-40 bg-gray-100 cursor-not-allowed select-none' : 'bg-surface text-gray-800'}`}
                            >
                                <option value="">-- Pilih Hasil --</option>
                                {Array.isArray(field.options) && field.options.map((opt, optI) => (
                                    <option key={optI} value={opt}>{opt}</option>
                                ))}
                            </select>
                        ) : field.type === 'number' ? (
                            <div className="w-full sm:w-32">
                                <Input
                                    type="number"
                                    placeholder="Hasil (Angka)"
                                    className={`text-xs p-1.5 transition-all ${isNA ? 'opacity-40 bg-gray-100 cursor-not-allowed select-none' : ''}`}
                                    value={hasilVal}
                                    onChange={(e) => handleTextChange('hasil', key, e.target.value)}
                                    disabled={isNA}
                                />
                            </div>
                        ) : (
                            <div className="w-full sm:w-32">
                                <Input
                                    type="text"
                                    placeholder="Hasil Pengukuran"
                                    className={`text-xs p-1.5 transition-all ${isNA ? 'opacity-40 bg-gray-100 cursor-not-allowed select-none' : ''}`}
                                    value={hasilVal}
                                    onChange={(e) => handleTextChange('hasil', key, e.target.value)}
                                    disabled={isNA}
                                />
                            </div>
                        )}

                        {/* CATATAN AUDIT */}
                        <div className="w-full sm:w-40">
                            <Input
                                type="text"
                                placeholder="Catatan Audit"
                                className={`text-xs p-1.5 transition-all ${isNA ? 'opacity-40 bg-gray-100 cursor-not-allowed select-none' : ''}`}
                                value={catatanVal}
                                onChange={(e) => handleTextChange('catatan', key, e.target.value)}
                                disabled={isNA}
                            />
                        </div>

                        {/* FOTO DOKUMENTASI UPLOAD */}
                        <div className="w-full sm:w-40">
                            <div className={`transition-all ${isNA ? 'opacity-40 pointer-events-none cursor-not-allowed select-none' : ''}`}>
                                <ImageUpload
                                    compact={true}
                                    multiple={true}
                                    value={data.fotos_item[key] || []}
                                    onChange={(files) => setData('fotos_item', {
                                        ...data.fotos_item,
                                        [key]: files
                                    })}
                                />
                            </div>
                            {errors[`fotos_item.${key}`] && (
                                <p className="text-red-500 text-[10px] mt-1 font-medium">{errors[`fotos_item.${key}`]}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Baris item template bawaan (format lama, penanda ty/it).
    const renderItemLama = (item) => {
        const key = item._id;
        const checkVal = data.hasil_json?.items?.[key] ?? '';
        const hasilVal = data.hasil_json?.hasil?.[key] ?? '';
        const catatanVal = data.hasil_json?.catatan?.[key] ?? '';
        const isNA = checkVal === 'NA';

        return (
            <div key={key} className="flex flex-col gap-2 border-b border-gray-100 px-3 py-1.5 hover:bg-gray-50/20">
                <div className="flex-grow space-y-1">
                    <span className="font-bold text-sm text-gray-800">{item.d[0]}</span>
                    <div className="flex flex-wrap gap-4 text-[10px] text-gray-400">
                        <span>Standar: <code className="font-mono">{item.d[1]}</code></span>
                        <span>Alat: <code className="font-mono">{item.d[2]}</code></span>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
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
                                className={`text-xs p-1.5 transition-all ${isNA ? 'opacity-40 bg-gray-100 cursor-not-allowed select-none' : ''}`}
                                value={hasilVal}
                                onChange={(e) => handleTextChange('hasil', key, e.target.value)}
                                disabled={isNA}
                            />
                        </div>

                        <div className="w-full sm:w-44">
                            <Input
                                placeholder="Catatan Audit"
                                className={`text-xs p-1.5 transition-all ${isNA ? 'opacity-40 bg-gray-100 cursor-not-allowed select-none' : ''}`}
                                value={catatanVal}
                                onChange={(e) => handleTextChange('catatan', key, e.target.value)}
                                disabled={isNA}
                            />
                        </div>

                        <div className="w-full sm:w-40">
                            <div className={`transition-all ${isNA ? 'opacity-40 pointer-events-none cursor-not-allowed select-none' : ''}`}>
                                <ImageUpload
                                    compact={true}
                                    multiple={true}
                                    value={data.fotos_item[key] || []}
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

    const lompatKeBagian = (id) => {
        setBagianAktif(id);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <>
            <Head title="ATP Baru - Web CME" />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'ATP Check', href: '/atp' },
                { label: 'ATP Baru' }
            ]} />

            <div className="mb-6 flex items-center gap-3">
                <Link
                    href="/atp"
                    aria-label="Kembali ke daftar ATP"
                    className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-lg border border-gray-300 bg-surface text-gray-500 hover:bg-gray-50 hover:text-black transition shrink-0"
                >
                    <ArrowLeft className="h-4 w-4 stroke-[1.5]" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines">
                        Acceptance Test Procedure (ATP) Baru
                    </h1>
                    <p className="text-sm text-gray-500 font-headlines mt-1">
                        Input site checklist, putusan kelayakan, dan foto verifikasi.
                    </p>
                </div>
            </div>

            {/* PROGRESS BAR */}
            {/* Mobile: progres persentase hanya untuk ponsel; di layar besar sudah ada Stepper di kolom kanan */}
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
                {/* 1. SITE DETAILS (STATIC) */}
                <Card title="Informasi Site &amp; PO">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <Input
                                label="Nama Site"
                                type="text"
                                placeholder="Masukkan nama site"
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
                                    placeholder="Masukkan nomor PO"
                                    value={data.no_po}
                                    onChange={(e) => setData('no_po', e.target.value)}
                                    error={errors.no_po}
                                    required
                                />
                            </div>

                            <Input
                                label="Deskripsi Wilayah / Region"
                                type="text"
                                placeholder="Masukkan Region"
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

                        <SiteMap lat={Number(data.latitude)} lng={Number(data.longitude)} onChange={ubahKoordinat} height={280} />
                    </div>
                </Card>

                {/* 2. DYNAMIC ATP CHECKLIST (DYNAMIC TEMPLATE BUILDER SCOPE) */}
                <Card
                    title="Checkpoint Parameter ATP"
                    headerActions={
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <Sliders className="h-4 w-4 text-primary stroke-[1.5]" />
                            <label
                                htmlFor="template-atp"
                                className="text-xs font-semibold text-gray-700 select-none"
                            >
                                Template:
                            </label>
                            {/* Mobile: select dibatasi lebar induknya agar tidak mendorong halaman melebar */}
                            <select
                                id="template-atp"
                                value={selectedTemplateId}
                                onChange={handleTemplateChange}
                                className="text-xs font-semibold rounded-lg border-gray-300 focus:border-primary focus:ring-primary py-1.5 px-3 min-h-[44px] sm:min-h-0 bg-surface text-gray-800 shadow-2xs max-w-full min-w-0"
                            >
                                {templates.map((tpl) => (
                                    <option key={tpl.id} value={tpl.id}>
                                        {tpl.title} ({tpl.fields?.length || 0} parameter)
                                    </option>
                                ))}
                                <option value="default">Template Standar Default</option>
                            </select>
                        </div>
                    }
                >
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_14rem]">
                        <div className="min-w-0 space-y-4">
                            {pohonChecklist.map(renderSimpul)}
                        </div>

                        <div className="hidden lg:block">
                            <div className="sticky top-20">
                                <Stepper
                                    items={bagian}
                                    aktifId={bagianAktif}
                                    onPilih={lompatKeBagian}
                                    progres={{ selesai: progress.checked, total: progress.total }}
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* 3. SIGNATURE APPROVAL METADATA (STATIC) */}
                <Card title="Tanda Tangan &amp; Otorisasi">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* VENDOR */}
                        <div className="space-y-3 p-4 border border-gray-150 rounded-lg">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-primary">Pihak Pelaksana (Vendor)</h4>
                            <Input
                                label="Perusahaan Vendor"
                                value={data.hasil_json.approval.vendor_company || ''}
                                onChange={(e) => handleApprovalChange('vendor_company', e.target.value)}
                                placeholder="PT. Pelaksana Pekerjaan"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    label="Nama Representative"
                                    value={data.hasil_json.approval.vendor_1_name || ''}
                                    onChange={(e) => handleApprovalChange('vendor_1_name', e.target.value)}
                                    placeholder="Nama perwakilan"
                                />
                                <Input
                                    label="Jabatan"
                                    value={data.hasil_json.approval.vendor_1_role || ''}
                                    onChange={(e) => handleApprovalChange('vendor_1_role', e.target.value)}
                                    placeholder="CME Inspector"
                                />
                            </div>
                        </div>

                        {/* CME TIM */}
                        <div className="space-y-3 p-4 border border-gray-150 rounded-lg">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-gray-900">Tim Evaluasi (CME Team)</h4>
                            <Input
                                label="Perusahaan CME"
                                value={data.hasil_json.approval.cme_company || ''}
                                onChange={(e) => handleApprovalChange('cme_company', e.target.value)}
                                placeholder="PT. Integrasi Jaringan Ekosistem"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    label="Nama Representative"
                                    value={data.hasil_json.approval.cme_1_name || ''}
                                    onChange={(e) => handleApprovalChange('cme_1_name', e.target.value)}
                                    placeholder="Nama evaluator"
                                />
                                <Input
                                    label="Jabatan"
                                    value={data.hasil_json.approval.cme_1_role || ''}
                                    onChange={(e) => handleApprovalChange('cme_1_role', e.target.value)}
                                    placeholder="CME Auditor"
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* 4. PUTUSAN AUDIT (STATIC) */}
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
                            placeholder="Catatan atau syarat putusan kelayakan..."
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
                        Simpan Laporan
                    </Button>
                    <Link
                        href="/atp"
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
                title="Konfirmasi Laporan ATP"
                message="Apakah Anda yakin ingin menyimpan laporan ATP baru ini?"
                type="warning"
                confirmText="Ya, Simpan"
            />
        </>
    );
}

New.layout = page => <AppLayout children={page} />;
