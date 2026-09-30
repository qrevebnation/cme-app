import React, { useState } from 'react';
import { Trash2, ChevronUp, ChevronDown, Plus, X } from 'lucide-react';
import Input from '../../../Components/Input';

// Tombol geser/hapus baris: sasaran sentuh 44 px di ponsel, ikon tetap kecil
// di layar >= sm supaya header baris tidak membengkak.
export function RowActions({ index, total, onMoveUp, onMoveDown, onRemove }) {
    const dasar = 'inline-flex h-11 w-11 items-center justify-center rounded transition disabled:opacity-30 disabled:cursor-not-allowed sm:h-7 sm:w-7';
    const geser = 'text-gray-400 hover:text-gray-700 hover:bg-gray-100';
    const hapus = 'text-gray-400 hover:text-red-600 hover:bg-red-50';

    return (
        <div className="flex items-center justify-end gap-1 sm:justify-start">
            <button
                type="button"
                onClick={() => onMoveUp(index)}
                disabled={index === 0}
                title="Geser ke Atas"
                className={`${dasar} ${geser}`}
            >
                <ChevronUp className="h-4 w-4 stroke-[1.5]" />
            </button>
            <button
                type="button"
                onClick={() => onMoveDown(index)}
                disabled={index === total - 1}
                title="Geser ke Bawah"
                className={`${dasar} ${geser}`}
            >
                <ChevronDown className="h-4 w-4 stroke-[1.5]" />
            </button>
            <div className="mx-1 h-4 w-[1px] bg-gray-200" />
            <button
                type="button"
                onClick={() => onRemove(index)}
                disabled={total <= 1}
                title="Hapus Baris"
                className={`${dasar} ${hapus}`}
            >
                <Trash2 className="h-4 w-4 stroke-[1.5]" />
            </button>
        </div>
    );
}

// Isi baris judul kategori/sub-kategori: hanya teks judul yang bisa diedit.
// Dipakai sebagai isi Collapsible supaya judul bisa dilipat dari halaman pembangun.
export function JudulFields({ index, row, onChange }) {
    const isSeksi = row.jenis !== 'sub';

    const handleFieldChange = (field, value) => {
        onChange(index, { ...row, [field]: value });
    };

    return (
        <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
                Judul {isSeksi ? 'Kategori' : 'Sub-kategori'} <span className="text-red-500">*</span>
            </label>
            <Input
                type="text"
                placeholder={isSeksi ? 'Contoh: I. PONDASI BETON' : 'Contoh: A. Dimensi & Geometri'}
                value={row.label}
                onChange={(e) => handleFieldChange('label', e.target.value)}
                className="text-xs font-semibold"
                required
            />
            <p className="text-[11px] text-gray-500 mt-1.5">
                Baris ini menjadi pengelompokan pada form checklist ATP dan tidak dihitung sebagai parameter penilaian.
            </p>
        </div>
    );
}

export default function RowItem({
    index,
    total,
    row,
    onChange,
    onRemove,
    onMoveUp,
    onMoveDown,
}) {
    const [newOption, setNewOption] = useState('');

    const handleFieldChange = (field, value) => {
        onChange(index, { ...row, [field]: value });
    };

    const handleAddOption = () => {
        const trimmed = newOption.trim();
        if (!trimmed) return;
        const currentOptions = Array.isArray(row.options) ? row.options : [];
        if (!currentOptions.includes(trimmed)) {
            onChange(index, {
                ...row,
                options: [...currentOptions, trimmed],
            });
        }
        setNewOption('');
    };

    const handleRemoveOption = (optIndex) => {
        const currentOptions = Array.isArray(row.options) ? row.options : [];
        onChange(index, {
            ...row,
            options: currentOptions.filter((_, idx) => idx !== optIndex),
        });
    };

    const typeBadges = {
        text: { label: 'Teks Bebas', color: 'bg-blue-50 text-blue-700 border-blue-200' },
        number: { label: 'Angka / Numerik', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        select: { label: 'Pilihan (Dropdown)', color: 'bg-purple-50 text-purple-700 border-purple-200' },
        photo: { label: 'Foto / Gambar', color: 'bg-amber-50 text-amber-700 border-amber-200' },
        file: { label: 'File / Dokumen', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    };

    // Baris judul kategori/sub-kategori dirender lewat Collapsible di
    // FieldsBuilder, jadi komponen ini hanya menangani baris parameter.
    return (
        <div className="p-4 bg-surface border border-gray-200 rounded-xl shadow-xs hover:border-gray-300 transition duration-150 relative group">
            {/* TOP BAR: INDEX, TYPE BADGE, MOVE & DELETE
                Di ponsel badge turun ke baris sendiri supaya tidak ada geser horizontal. */}
            <div className="flex flex-col gap-2 pb-3 mb-3 border-b border-gray-100 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-700 font-bold text-xs font-mono">
                        {index + 1}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${typeBadges[row.type]?.color || 'bg-gray-50 text-gray-600'}`}>
                        {typeBadges[row.type]?.label || row.type}
                    </span>
                    {row.required ? (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 uppercase tracking-wide">
                            Wajib
                        </span>
                    ) : (
                        <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 uppercase tracking-wide">
                            Opsional
                        </span>
                    )}
                </div>

                <RowActions
                    index={index}
                    total={total}
                    onMoveUp={onMoveUp}
                    onMoveDown={onMoveDown}
                    onRemove={onRemove}
                />
            </div>

            {/* FORM FIELDS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                {/* 1. PARAMETER LABEL (Col 1-5) */}
                <div className="md:col-span-5">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Nama Parameter / Checkpoint <span className="text-red-500">*</span>
                    </label>
                    <Input
                        type="text"
                        placeholder="Contoh: Tahanan Grounding / Pondasi Beton"
                        value={row.label}
                        onChange={(e) => handleFieldChange('label', e.target.value)}
                        className="text-xs"
                        required
                    />
                </div>

                {/* 2. INPUT TYPE (Col 6-8) */}
                <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Tipe Input Widget <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={row.type}
                        onChange={(e) => handleFieldChange('type', e.target.value)}
                        className="w-full text-xs rounded-lg border-gray-300 shadow-xs focus:border-primary focus:ring-primary h-10 px-2.5 bg-surface text-gray-800"
                    >
                        <option value="text">Teks (Pengukuran)</option>
                        <option value="number">Angka (Numerik)</option>
                        <option value="select">Pilihan (Dropdown)</option>
                        <option value="photo">Upload Foto</option>
                        <option value="file">Upload File / Dokumen</option>
                    </select>
                </div>

                {/* 3. STANDARD (Col 9-10) */}
                <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Standar Spesifikasi
                    </label>
                    <Input
                        type="text"
                        placeholder="Contoh: ≤5Ω, ±3mm"
                        value={row.standard || ''}
                        onChange={(e) => handleFieldChange('standard', e.target.value)}
                        className="text-xs font-mono"
                    />
                </div>

                {/* 4. MEASUREMENT TOOL (Col 11-12) */}
                <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Alat Ukur
                    </label>
                    <Input
                        type="text"
                        placeholder="Contoh: Earth Tester"
                        value={row.tool || ''}
                        onChange={(e) => handleFieldChange('tool', e.target.value)}
                        className="text-xs"
                    />
                </div>
            </div>

            {/* CONDITIONAL: OPTIONS BUILDER (IF TYPE === SELECT) */}
            {row.type === 'select' && (
                <div className="mt-3.5 pt-3 border-t border-gray-100 bg-gray-50/50 p-3 rounded-lg">
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                        Pilihan Dropdown (Options)
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {Array.isArray(row.options) && row.options.length > 0 ? (
                            row.options.map((opt, optIdx) => (
                                <span
                                    key={optIdx}
                                    className="inline-flex items-center gap-1 bg-surface px-2 py-0.5 rounded border border-purple-200 text-purple-800 text-xs font-medium shadow-2xs"
                                >
                                    {opt}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveOption(optIdx)}
                                        title="Hapus pilihan"
                                        className="inline-flex h-11 w-11 items-center justify-center text-gray-400 hover:text-red-600 rounded-full sm:h-5 sm:w-5"
                                    >
                                        <X className="h-3 w-3 stroke-[2]" />
                                    </button>
                                </span>
                            ))
                        ) : (
                            <span className="text-xs text-gray-400 italic">Belum ada pilihan. Tambahkan opsi di bawah ini.</span>
                        )}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:max-w-sm">
                        <Input
                            type="text"
                            placeholder="Ketik opsi (e.g. Sesuai Standar)"
                            value={newOption}
                            onChange={(e) => setNewOption(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddOption();
                                }
                            }}
                            className="text-xs h-11 sm:h-8"
                        />
                        <button
                            type="button"
                            onClick={handleAddOption}
                            className="inline-flex h-11 items-center justify-center gap-1 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition shadow-xs sm:h-8"
                        >
                            <Plus className="h-3 w-3 stroke-[2]" /> Tambah
                        </button>
                    </div>
                </div>
            )}

            {/* BOTTOM TOGGLE: REQUIRED CHECKBOX */}
            <div className="mt-3 pt-2.5 border-t border-gray-100 flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none text-gray-700 font-medium">
                    <input
                        type="checkbox"
                        checked={row.required !== false}
                        onChange={(e) => handleFieldChange('required', e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>Wajib diisi & diverifikasi saat audit checklist ATP</span>
                </label>
                <span className="truncate text-[11px] text-gray-400 font-mono">
                    ID: {row.id}
                </span>
            </div>
        </div>
    );
}
