import React, { useState } from 'react';
import { Trash2, ChevronUp, ChevronDown, Plus, X } from 'lucide-react';
import Input from '../../../Components/Input';

export default function ItemRow({
    index,
    total,
    item,
    onChange,
    onRemove,
    onMoveUp,
    onMoveDown,
    bolehNaik = index > 0,
    bolehTurun = index < total - 1,
}) {
    const [newOption, setNewOption] = useState('');

    const patch = (field, value) => onChange(index, { ...item, [field]: value });

    const options = Array.isArray(item.opsi) ? item.opsi : [];

    const labelTipe = { text: 'Teks Bebas', select: 'Pilihan (Dropdown)', multi: 'Pilihan Ganda', photo: 'Foto' };
    const tipe = item.tipe || 'text';
    const tipeLuar = ['text', 'select'].includes(tipe) ? [] : [tipe];

    const handleAddOption = () => {
        const trimmed = newOption.trim();
        if (!trimmed || options.includes(trimmed)) {
            setNewOption('');
            return;
        }
        patch('opsi', [...options, trimmed]);
        setNewOption('');
    };

    const handleRemoveOption = (optIndex) => {
        patch('opsi', options.filter((_, idx) => idx !== optIndex));
    };

    return (
        <div className="p-3.5 bg-surface border border-gray-200 rounded-xl shadow-xs hover:border-gray-300 transition">
            {/* Di ponsel tiap kolom bertumpuk penuh supaya tidak ada geser horizontal. */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start">
                <div className="w-full sm:w-20 sm:shrink-0">
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">No.</label>
                    <Input
                        type="text"
                        value={item.nomor || ''}
                        onChange={(e) => patch('nomor', e.target.value)}
                        placeholder="1.1"
                        className="text-xs font-mono text-center"
                    />
                </div>

                <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                        Nama Item <span className="text-red-500">*</span>
                    </label>
                    <Input
                        type="text"
                        value={item.nama || ''}
                        onChange={(e) => patch('nama', e.target.value)}
                        placeholder="Contoh: Sumber Listrik PLN"
                        className="text-xs"
                        required
                    />
                </div>

                <div className="w-full sm:w-40 sm:shrink-0">
                    <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                        Tipe <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={tipe}
                        onChange={(e) => patch('tipe', e.target.value)}
                        className="w-full text-xs rounded-lg border-gray-300 shadow-xs focus:border-primary focus:ring-primary h-11 sm:h-9 px-2.5 bg-surface text-gray-800"
                    >
                        <option value="text">Teks Bebas</option>
                        <option value="select">Pilihan (Dropdown)</option>
                        {/* Tipe lama di luar kendali editor (mis. "multi") tetap
                            ditampilkan agar tidak berubah sendiri saat disimpan. */}
                        {tipeLuar.map((nilai) => (
                            <option key={nilai} value={nilai}>{labelTipe[nilai] || nilai}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center justify-end gap-1 sm:pt-5">
                    <button
                        type="button"
                        onClick={() => onMoveUp(index)}
                        disabled={!bolehNaik}
                        title="Geser ke Atas"
                        className="inline-flex h-11 w-11 items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 rounded transition sm:h-7 sm:w-7"
                    >
                        <ChevronUp className="h-4 w-4 stroke-[1.5]" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onMoveDown(index)}
                        disabled={!bolehTurun}
                        title="Geser ke Bawah"
                        className="inline-flex h-11 w-11 items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 rounded transition sm:h-7 sm:w-7"
                    >
                        <ChevronDown className="h-4 w-4 stroke-[1.5]" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onRemove(index)}
                        disabled={total <= 1}
                        title="Hapus Item"
                        className="inline-flex h-11 w-11 items-center justify-center text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-50 rounded transition sm:h-7 sm:w-7"
                    >
                        <Trash2 className="h-4 w-4 stroke-[1.5]" />
                    </button>
                </div>
            </div>

            {item.tipe === 'select' && (
                <div className="mt-3 pt-3 border-t border-gray-100 bg-gray-50/60 p-3 rounded-lg">
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">
                        Pilihan Dropdown
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {options.length > 0 ? (
                            options.map((opt, optIdx) => (
                                <span
                                    key={optIdx}
                                    className="inline-flex items-center gap-1 bg-surface px-2 py-0.5 rounded border border-purple-200 text-purple-800 text-xs font-medium"
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
                            <span className="text-xs text-gray-400 italic">Belum ada pilihan.</span>
                        )}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:max-w-sm">
                        <Input
                            type="text"
                            placeholder="Ketik opsi lalu Enter"
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
        </div>
    );
}
