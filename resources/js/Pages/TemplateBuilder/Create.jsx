import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/Card';
import Input from '../../Components/Input';
import Button from '../../Components/Button';
import Breadcrumbs from '../../Components/Breadcrumbs';
import FieldsBuilder from './Components/FieldsBuilder';
import { Sliders, Plus, ArrowLeft, Eye, CheckCircle2, FileText, Layers, CornerDownRight } from 'lucide-react';

export default function Create({ initialRows = [] }) {
    const [showPreview, setShowPreview] = useState(false);

    const defaultStarterRows = initialRows.length > 0 ? initialRows : [
        {
            id: 'field_' + Date.now() + '_1',
            label: 'Panjang total pondasi',
            type: 'text',
            standard: 'Sesuai gambar ±3m',
            tool: 'Roll meter',
            required: true,
            options: [],
        },
        {
            id: 'field_' + Date.now() + '_2',
            label: 'Tahanan grounding',
            type: 'number',
            standard: '≤5Ω',
            tool: 'Earth Tester',
            required: true,
            options: [],
        },
        {
            id: 'field_' + Date.now() + '_3',
            label: 'Kondisi fisik kerangkeng',
            type: 'select',
            standard: 'Bebas karat & las rapi',
            tool: 'Visual inspection',
            required: true,
            options: ['Baik', 'Cukup', 'Kurang'],
        },
    ];

    const { data, setData, post, processing, errors } = useForm({
        title: '',
        fields: defaultStarterRows,
    });

    const handleAddRow = () => {
        const newRow = {
            id: 'field_' + Date.now() + '_' + (data.fields.length + 1),
            label: '',
            type: 'text',
            standard: '',
            tool: '',
            required: true,
            options: [],
        };
        setData('fields', [...data.fields, newRow]);
    };

    // Baris judul hanya menyimpan teks kategori/sub-kategori.
    const handleAddJudul = (jenis) => {
        const newRow = {
            id: `${jenis}_${Date.now()}_${data.fields.length + 1}`,
            jenis,
            label: '',
            type: 'judul',
            standard: '',
            tool: '',
            required: false,
            options: [],
        };
        setData('fields', [...data.fields, newRow]);
    };

    const handleRemoveRow = (index) => {
        if (data.fields.length <= 1) return;
        const updated = data.fields.filter((_, idx) => idx !== index);
        setData('fields', updated);
    };

    const handleRowChange = (index, updatedRow) => {
        const updated = [...data.fields];
        updated[index] = updatedRow;
        setData('fields', updated);
    };

    const handleMoveUp = (index) => {
        if (index === 0) return;
        const updated = [...data.fields];
        const temp = updated[index - 1];
        updated[index - 1] = updated[index];
        updated[index] = temp;
        setData('fields', updated);
    };

    const handleMoveDown = (index) => {
        if (index === data.fields.length - 1) return;
        const updated = [...data.fields];
        const temp = updated[index + 1];
        updated[index + 1] = updated[index];
        updated[index] = temp;
        setData('fields', updated);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post('/template/baru');
    };

    const parameterCount = data.fields.filter((row) => row.type !== 'judul').length;
    const judulCount = data.fields.length - parameterCount;

    return (
        <>
            <Head title="Buat Template Form ATP - Web CME" />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Template ATP', href: '/template' },
                { label: 'Buat Baru' }
            ]} />

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines flex items-center gap-2.5">
                        <Sliders className="h-6 w-6 text-primary stroke-[1.5]" />
                        Buat Template Form ATP Baru
                    </h1>
                    <p className="text-sm text-gray-500 font-headlines mt-1">
                        Definisikan parameter checkpoint dinamis menggunakan row-based repeater.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => setShowPreview(!showPreview)}
                        className="inline-flex h-11 sm:h-9 items-center justify-center gap-1.5 px-3.5 border border-gray-300 bg-surface hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg transition shadow-xs"
                    >
                        <Eye className="h-4 w-4 stroke-[1.5]" />
                        {showPreview ? 'Sembunyikan Pratinjau' : 'Pratinjau Checklist'}
                    </button>
                    <Link
                        href="/template"
                        className="inline-flex h-11 sm:h-9 items-center justify-center gap-1.5 px-3.5 border border-gray-300 bg-surface hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg transition shadow-xs"
                    >
                        <ArrowLeft className="h-4 w-4 stroke-[1.5]" />
                        Kembali
                    </Link>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* 1. TEMPLATE METADATA */}
                <Card title="Informasi Template">
                    <div className="max-w-2xl space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Judul / Nama Template <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="text"
                                placeholder="Contoh: Checklist Standar Site Rooftop CME 2026"
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                                error={errors.title}
                                className="text-sm font-medium"
                                required
                            />
                            <p className="text-[11px] text-gray-400 mt-1">
                                Nama template ini akan muncul pada pilihan dropdown saat membuat form ATP baru di <code className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-600">/atp/baru</code>.
                            </p>
                        </div>
                    </div>
                </Card>

                {/* 2. REPEATER CHECKPOINT PARAMETERS */}
                <Card
                    title="Daftar Parameter Checkpoint ATP"
                    headerActions={
                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                            {parameterCount} Parameter{judulCount > 0 ? ` • ${judulCount} Kategori/Sub` : ''}
                        </span>
                    }
                >
                    {errors.fields && (
                        <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
                            {errors.fields}
                        </div>
                    )}

                    <div className="space-y-4">
                        <FieldsBuilder
                            rows={data.fields}
                            onChange={handleRowChange}
                            onRemove={handleRemoveRow}
                            onMoveUp={handleMoveUp}
                            onMoveDown={handleMoveDown}
                        />
                    </div>

                    {/* Tombol tambah bertumpuk penuh di ponsel, kembali sejajar di sm ke atas. */}
                    <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col sm:flex-row flex-wrap justify-center gap-2.5">
                        <button
                            type="button"
                            onClick={handleAddRow}
                            className="inline-flex h-11 sm:h-9 w-full sm:w-auto items-center justify-center gap-2 px-5 bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-strong text-xs font-bold uppercase tracking-wider rounded-xl transition border border-primary/20"
                        >
                            <Plus className="h-4 w-4 stroke-[2]" />
                            Tambah Baris Parameter
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAddJudul('seksi')}
                            className="inline-flex h-11 sm:h-9 w-full sm:w-auto items-center justify-center gap-2 px-5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition border border-slate-900"
                        >
                            <Layers className="h-4 w-4 stroke-[2]" />
                            Tambah Kategori
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAddJudul('sub')}
                            className="inline-flex h-11 sm:h-9 w-full sm:w-auto items-center justify-center gap-2 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl transition border border-slate-300"
                        >
                            <CornerDownRight className="h-4 w-4 stroke-[2]" />
                            Tambah Sub-kategori
                        </button>
                    </div>
                </Card>

                {/* 3. LIVE PREVIEW DRAWER/SECTION */}
                {showPreview && (
                    <Card title="Pratinjau Tampilan pada Form Checkpoint ATP">
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                            <p className="text-xs text-gray-500 italic mb-2">
                                Berikut simulasi bagaimana parameter di atas akan dirender di dalam form <code className="font-mono text-primary font-semibold">Checkpoint Parameter ATP</code>:
                            </p>
                            <div className="space-y-3">
                                {data.fields.map((f, i) => {
                                    if (f.type === 'judul') {
                                        const isSeksi = f.jenis !== 'sub';
                                        return (
                                            <div
                                                key={i}
                                                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg border ${isSeksi ? 'bg-slate-800 border-slate-900 text-white' : 'bg-slate-100 border-slate-300 text-slate-700'}`}
                                            >
                                                <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                                                    {isSeksi ? 'Seksi' : 'Sub'}
                                                </span>
                                                <span className="text-xs font-bold">{f.label || `(Judul ${i + 1})`}</span>
                                            </div>
                                        );
                                    }

                                    return (
                                    <div key={i} className="p-3.5 bg-surface border border-gray-200 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="space-y-1 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-xs text-gray-900">{f.label || `(Parameter ${i + 1})`}</span>
                                                {f.required && (
                                                    <span className="text-[9px] text-red-600 bg-red-50 px-1 py-0.2 rounded font-bold uppercase">Wajib</span>
                                                )}
                                            </div>
                                            <div className="flex gap-4 text-[10px] text-gray-400">
                                                <span>Standar: <code className="font-mono text-gray-600">{f.standard || '-'}</code></span>
                                                <span>Alat: <code className="font-mono text-gray-600">{f.tool || '-'}</code></span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                            {/* Status buttons mock */}
                                            <div className="flex w-fit border border-gray-200 rounded text-[11px] font-bold overflow-hidden">
                                                <span className="px-2.5 py-1 bg-emerald-500 text-white">OK</span>
                                                <span className="px-2.5 py-1 bg-surface text-gray-400">NG</span>
                                                <span className="px-2.5 py-1 bg-surface text-gray-400">NA</span>
                                            </div>

                                            {/* Dynamic input preview */}
                                            {f.type === 'select' ? (
                                                <select disabled className="text-xs p-1.5 rounded border-gray-200 bg-gray-50 text-gray-500 w-full sm:w-36">
                                                    <option>-- Pilih Hasil --</option>
                                                    {Array.isArray(f.options) && f.options.map((opt, oIdx) => (
                                                        <option key={oIdx}>{opt}</option>
                                                    ))}
                                                </select>
                                            ) : f.type === 'photo' ? (
                                                <div className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-semibold w-fit">
                                                    📷 Upload Foto
                                                </div>
                                            ) : f.type === 'file' ? (
                                                <div className="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-semibold w-fit">
                                                    📄 Upload Dokumen
                                                </div>
                                            ) : (
                                                <input
                                                    disabled
                                                    placeholder={f.type === 'number' ? 'Hasil (Angka)' : 'Hasil Pengukuran'}
                                                    className="text-xs p-1.5 rounded border border-gray-200 bg-gray-50 text-gray-400 w-full sm:w-36"
                                                />
                                            )}

                                            <input
                                                disabled
                                                placeholder="Catatan Audit"
                                                className="text-xs p-1.5 rounded border border-gray-200 bg-gray-50 text-gray-400 w-full sm:w-36"
                                            />
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </div>
                    </Card>
                )}

                {/* SUBMIT BUTTONS */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                    <Link
                        href="/template"
                        className="inline-flex h-11 sm:h-9 items-center justify-center px-4 border border-gray-300 bg-surface hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg transition"
                    >
                        Batal
                    </Link>
                    <Button
                        type="submit"
                        disabled={processing}
                        className="h-11 sm:h-9 px-6 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-2"
                    >
                        {processing ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Menyimpan Template...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4 stroke-[2]" />
                                Simpan Template Form
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </>
    );
}

Create.layout = (page) => <AppLayout children={page} />;
