import React from 'react';
import Card from '../../../Components/Card';
import Input from '../../../Components/Input';
import CategoryEditor, { kelompokkanBaris } from './CategoryEditor';
import { Plus, ListOrdered, Layers } from 'lucide-react';

export default function TemplateEditor({ data, setData, errors }) {
    const categories = Array.isArray(data.categories) ? data.categories : [];
    const barisDatar = categories.flatMap((cat) => (Array.isArray(cat.items) ? cat.items : []));
    // Baris "sub" hanya judul kelompok, jadi tidak dihitung sebagai item.
    const totalSubs = barisDatar.filter((item) => (item.tipe || 'text') === 'sub').length;
    const totalItems = barisDatar.length - totalSubs;

    const nextNumber = (categoryIndex, urutItem) => `${categoryIndex + 1}.${urutItem}`;

    const handleAddCategory = () => {
        const categoryIndex = categories.length;
        setData('categories', [
            ...categories,
            {
                name: '',
                items: [{ nomor: nextNumber(categoryIndex, 1), nama: '', tipe: 'text', opsi: [] }],
            },
        ]);
    };

    const handleRemoveCategory = (index) => {
        if (categories.length <= 1) return;
        setData('categories', categories.filter((_, idx) => idx !== index));
    };

    const handleCategoryChange = (index, updatedCategory) => {
        const updated = [...categories];
        updated[index] = updatedCategory;
        setData('categories', updated);
    };

    const handleMoveCategory = (index, direction) => {
        const target = index + direction;
        if (target < 0 || target >= categories.length) return;
        const updated = [...categories];
        [updated[index], updated[target]] = [updated[target], updated[index]];
        setData('categories', updated);
    };

    // Nomor ulang hanya untuk item sungguhan; baris sub dibiarkan tanpa nomor.
    const handleRenumber = () => {
        setData('categories', categories.map((cat, categoryIndex) => {
            let urut = 0;

            return {
                ...cat,
                items: (cat.items || []).map((item) => {
                    if ((item.tipe || 'text') === 'sub') {
                        return { ...item, nomor: '' };
                    }

                    urut += 1;
                    return { ...item, nomor: nextNumber(categoryIndex, urut) };
                }),
            };
        }));
    };

    const kartuItem = (item, key) => (
        <div key={key} className="p-2.5 bg-surface border border-gray-200 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
                <span className="font-mono text-gray-400">{item.nomor || '-'}</span>
                <span className="font-semibold text-gray-800">
                    {item.nama || '(Item baru)'}
                </span>
            </div>
            {item.tipe === 'select' ? (
                <select disabled className="text-xs p-1.5 rounded border border-gray-200 bg-gray-50 text-gray-500 w-full sm:w-44">
                    <option>-- Pilih --</option>
                    {(item.opsi || []).map((opt, optIndex) => (
                        <option key={optIndex}>{opt}</option>
                    ))}
                </select>
            ) : (
                <input
                    disabled
                    placeholder={item.tipe === 'photo' ? 'Unggah foto' : 'Jawaban teks'}
                    className="text-xs p-1.5 rounded border border-gray-200 bg-gray-50 text-gray-400 w-full sm:w-44"
                />
            )}
        </div>
    );

    return (
        <>
            <Card title="Informasi Template">
                <div className="max-w-2xl space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Judul / Nama Template <span className="text-red-500">*</span>
                        </label>
                        <Input
                            type="text"
                            placeholder="Contoh: Checklist Survey ODC Standar"
                            value={data.title || ''}
                            onChange={(e) => setData('title', e.target.value)}
                            error={errors.title}
                            className="text-sm font-medium"
                            required
                        />
                        <p className="text-[11px] text-gray-400 mt-1">
                            Judul ini dipakai saat memuat template pada form survey kustom.
                        </p>
                    </div>
                </div>
            </Card>

            <Card
                title="Kategori & Item Survey"
                headerActions={
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                            {categories.length} Kategori · {totalItems} Item
                            {totalSubs > 0 ? ` · ${totalSubs} Sub` : ''}
                        </span>
                        <button
                            type="button"
                            onClick={handleRenumber}
                            title="Nomor ulang seluruh kategori dan item secara berurutan"
                            className="inline-flex h-11 sm:h-8 items-center justify-center gap-1.5 px-3 bg-surface border border-gray-300 hover:bg-gray-50 text-gray-700 text-[11px] font-semibold rounded-lg transition"
                        >
                            <ListOrdered className="h-3.5 w-3.5 stroke-[1.5]" />
                            Rapikan Nomor
                        </button>
                    </div>
                }
            >
                {errors.categories && (
                    <div className="p-3 mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
                        {errors.categories}
                    </div>
                )}

                <div className="space-y-4">
                    {categories.map((category, index) => (
                        <CategoryEditor
                            key={index}
                            index={index}
                            total={categories.length}
                            category={category}
                            onChange={handleCategoryChange}
                            onRemove={handleRemoveCategory}
                            onMoveUp={(i) => handleMoveCategory(i, -1)}
                            onMoveDown={(i) => handleMoveCategory(i, 1)}
                        />
                    ))}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-center">
                    <button
                        type="button"
                        onClick={handleAddCategory}
                        className="inline-flex h-11 sm:h-9 w-full sm:w-auto items-center justify-center gap-2 px-5 bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-strong text-xs font-bold uppercase tracking-wider rounded-xl transition border border-primary/20"
                    >
                        <Plus className="h-4 w-4 stroke-[2]" />
                        Tambah Kategori
                    </button>
                </div>
            </Card>

            <Card title="Pratinjau Struktur Template">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
                    {categories.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">Belum ada kategori.</p>
                    ) : (
                        categories.map((category, categoryIndex) => {
                            const { lepas, subs } = kelompokkanBaris(
                                Array.isArray(category.items) ? category.items : []
                            );

                            return (
                                <div key={categoryIndex} className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Layers className="h-4 w-4 text-primary stroke-[1.5]" />
                                        <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                                            {category.name || `(Kategori ${categoryIndex + 1})`}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5 pl-6">
                                        {lepas.map((entri) => kartuItem(entri.row, entri.index))}

                                        {subs.map((sub, subIndex) => (
                                            <div key={sub.index} className="space-y-1.5 pt-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                        Sub
                                                    </span>
                                                    <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">
                                                        {sub.row.nama || `(Sub-kategori ${subIndex + 1})`}
                                                    </span>
                                                </div>
                                                <div className="space-y-1.5 pl-4">
                                                    {sub.items.map((entri) => kartuItem(entri.row, entri.index))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </Card>
        </>
    );
}
