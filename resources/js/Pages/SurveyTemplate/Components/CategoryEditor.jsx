import React from 'react';
import { Trash2, ChevronUp, ChevronDown, Plus, CornerDownRight } from 'lucide-react';
import Collapsible from '../../../Components/Collapsible';
import Input from '../../../Components/Input';
import ItemRow from './ItemRow';

/**
 * Baris kategori tetap daftar datar yang sama dengan kategori_json (baris
 * bertipe "sub" membuka kelompok baru; item sesudahnya milik kelompok itu).
 * Pengelompokan hanya untuk render, urutan & indeks payload tidak diubah.
 */
export function kelompokkanBaris(rows) {
    const lepas = [];
    const subs = [];

    rows.forEach((row, index) => {
        if ((row.tipe || 'text') === 'sub') {
            subs.push({ index, row, items: [] });
            return;
        }

        const sub = subs[subs.length - 1];
        if (sub) sub.items.push({ index, row });
        else lepas.push({ index, row });
    });

    return { lepas, subs };
}

/**
 * Tukar posisi satu blok sub (baris "sub" + item di dalamnya) dengan blok sub
 * tetangganya. Item lepas selalu berada di atas seluruh sub, jadi blok sub
 * hanya bergeser antar-sub dan tidak pernah melewati item lepas.
 */
export function geserBlokSub(rows, subs, subIndex, arah) {
    const target = subIndex + arah;
    if (target < 0 || target >= subs.length) return rows;

    const depan = subs[Math.min(subIndex, target)];
    const belakang = subs[Math.max(subIndex, target)];
    const blokDepan = rows.slice(depan.index, depan.index + 1 + depan.items.length);
    const blokBelakang = rows.slice(belakang.index, belakang.index + 1 + belakang.items.length);

    return [
        ...rows.slice(0, depan.index),
        ...blokBelakang,
        ...blokDepan,
        ...rows.slice(belakang.index + blokBelakang.length),
    ];
}

export default function CategoryEditor({
    index,
    total,
    category,
    onChange,
    onRemove,
    onMoveUp,
    onMoveDown,
}) {
    const items = Array.isArray(category.items) ? category.items : [];
    const { lepas, subs } = kelompokkanBaris(items);
    const jumlahItem = items.length - subs.length;

    const patchCategory = (patch) => onChange(index, { ...category, ...patch });

    const barisBaru = () => ({
        nomor: `${index + 1}.${jumlahItem + 1}`,
        nama: '',
        tipe: 'text',
        opsi: [],
    });

    // Item lepas disisipkan tepat setelah item lepas terakhir supaya tidak
    // jatuh ke dalam sub-kategori di bawahnya (urutan menentukan induknya).
    const handleAddItem = () => {
        patchCategory({ items: [...items.slice(0, lepas.length), barisBaru(), ...items.slice(lepas.length)] });
    };

    const handleAddSub = () => {
        patchCategory({ items: [...items, { nomor: '', nama: '', tipe: 'sub', opsi: [] }] });
    };

    const handleAddSubItem = (sub) => {
        const posisi = sub.index + 1 + sub.items.length;
        patchCategory({ items: [...items.slice(0, posisi), barisBaru(), ...items.slice(posisi)] });
    };

    const handleRemoveItem = (itemIndex) => {
        if (items.length <= 1) return;
        patchCategory({ items: items.filter((_, idx) => idx !== itemIndex) });
    };

    // Hapus sub sekaligus item di dalamnya; kalau kategori jadi kosong sisakan
    // satu baris kosong agar aturan minimal 1 baris per kategori tetap jalan.
    const handleRemoveSub = (sub) => {
        const sisa = [...items.slice(0, sub.index), ...items.slice(sub.index + 1 + sub.items.length)];
        patchCategory({ items: sisa.length > 0 ? sisa : [barisBaru()] });
    };

    // Sub hanya bisa bertukar tempat dengan sub lain: item lepas selalu berada
    // di atas seluruh sub, jadi blok sub digeser utuh bersama itemnya.
    const handleMoveSub = (subIndex, direction) => {
        patchCategory({ items: geserBlokSub(items, subs, subIndex, direction) });
    };

    const handleItemChange = (itemIndex, updatedItem) => {
        const updated = [...items];
        updated[itemIndex] = updatedItem;
        patchCategory({ items: updated });
    };

    const handleMoveItem = (itemIndex, direction) => {
        const target = itemIndex + direction;
        if (target < 0 || target >= items.length) return;
        const updated = [...items];
        [updated[itemIndex], updated[target]] = [updated[target], updated[itemIndex]];
        patchCategory({ items: updated });
    };

    const renderItem = ({ index: itemIndex, row }, posisi, panjangBlok) => (
        <ItemRow
            key={itemIndex}
            index={itemIndex}
            total={items.length}
            item={row}
            bolehNaik={posisi > 0}
            bolehTurun={posisi < panjangBlok - 1}
            onChange={handleItemChange}
            onRemove={handleRemoveItem}
            onMoveUp={(i) => handleMoveItem(i, -1)}
            onMoveDown={(i) => handleMoveItem(i, 1)}
        />
    );

    // Tombol kategori: 44 px di ponsel, kembali rapat di layar >= sm.
    const tombolAksi = 'inline-flex h-11 w-11 items-center justify-center rounded transition disabled:opacity-30 disabled:cursor-not-allowed sm:h-7 sm:w-7';

    // Tombol tambah: bertumpuk penuh di ponsel, sejajar mulai sm.
    const tombolTambah = 'inline-flex h-11 sm:h-9 w-full sm:w-auto items-center justify-center gap-1.5 px-4 text-[11px] font-bold uppercase tracking-wider rounded-lg transition border';

    const aksiBaris = (aksi) => (
        <div className="flex items-center justify-end gap-1 border-b border-border pb-2">
            {aksi}
        </div>
    );

    return (
        <Collapsible
            tingkat={0}
            judul={category.name || `(Kategori ${index + 1})`}
            meta={subs.length > 0 ? `${subs.length} sub-kategori` : `Kategori ${index + 1}`}
            penghitung={`${jumlahItem} item`}
        >
            <div className="space-y-3">
                {/* Tombol kategori ditaruh di isi Collapsible: header cukup untuk
                    judul + penghitung item di layar 390 px. */}
                {aksiBaris(
                    <>
                        <button
                            type="button"
                            onClick={() => onMoveUp(index)}
                            disabled={index === 0}
                            title="Geser Kategori ke Atas"
                            className={`${tombolAksi} text-gray-400 hover:text-gray-700 hover:bg-gray-200`}
                        >
                            <ChevronUp className="h-4 w-4 stroke-[1.5]" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onMoveDown(index)}
                            disabled={index === total - 1}
                            title="Geser Kategori ke Bawah"
                            className={`${tombolAksi} text-gray-400 hover:text-gray-700 hover:bg-gray-200`}
                        >
                            <ChevronDown className="h-4 w-4 stroke-[1.5]" />
                        </button>
                        <button
                            type="button"
                            onClick={() => onRemove(index)}
                            disabled={total <= 1}
                            title="Hapus Kategori"
                            className={`${tombolAksi} text-gray-400 hover:text-red-600 hover:bg-red-50`}
                        >
                            <Trash2 className="h-4 w-4 stroke-[1.5]" />
                        </button>
                    </>
                )}

                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Nama Kategori <span className="text-red-500">*</span>
                    </label>
                    <Input
                        type="text"
                        value={category.name || ''}
                        onChange={(e) => patchCategory({ name: e.target.value })}
                        placeholder="Contoh: KELISTRIKAN"
                        className="text-sm font-semibold uppercase"
                        required
                    />
                </div>

                {/* Item tanpa sub: langsung di bawah kategori. */}
                {lepas.length > 0 && (
                    <div className="space-y-2.5">
                        {lepas.map((entri, posisi) => renderItem(entri, posisi, lepas.length))}
                    </div>
                )}

                {subs.length > 0 && (
                    <div className="space-y-3">
                        {subs.map((sub, subIndex) => (
                            <Collapsible
                                key={sub.index}
                                tingkat={1}
                                judul={sub.row.nama || `(Sub-kategori ${subIndex + 1})`}
                                penghitung={`${sub.items.length} item`}
                            >
                                <div className="space-y-3">
                                    {aksiBaris(
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => handleMoveSub(subIndex, -1)}
                                                disabled={subIndex === 0}
                                                title="Geser Sub-kategori ke Atas"
                                                className={`${tombolAksi} text-gray-400 hover:text-gray-700 hover:bg-gray-200`}
                                            >
                                                <ChevronUp className="h-4 w-4 stroke-[1.5]" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleMoveSub(subIndex, 1)}
                                                disabled={subIndex === subs.length - 1}
                                                title="Geser Sub-kategori ke Bawah"
                                                className={`${tombolAksi} text-gray-400 hover:text-gray-700 hover:bg-gray-200`}
                                            >
                                                <ChevronDown className="h-4 w-4 stroke-[1.5]" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveSub(sub)}
                                                title="Hapus Sub-kategori beserta itemnya"
                                                className={`${tombolAksi} text-gray-400 hover:text-red-600 hover:bg-red-50`}
                                            >
                                                <Trash2 className="h-4 w-4 stroke-[1.5]" />
                                            </button>
                                        </>
                                    )}

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                                            Nama Sub-kategori <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            type="text"
                                            value={sub.row.nama || ''}
                                            onChange={(e) => handleItemChange(sub.index, { ...sub.row, nama: e.target.value })}
                                            placeholder="Contoh: PENGUKURAN"
                                            className="text-sm font-semibold uppercase"
                                            required
                                        />
                                    </div>

                                    {sub.items.length > 0 && (
                                        <div className="space-y-2.5">
                                            {sub.items.map((entri, posisi) => renderItem(entri, posisi, sub.items.length))}
                                        </div>
                                    )}

                                    <div className="flex justify-center">
                                        <button
                                            type="button"
                                            onClick={() => handleAddSubItem(sub)}
                                            className={`${tombolTambah} bg-surface hover:bg-primary/10 text-primary dark:text-primary-strong border-primary/20`}
                                        >
                                            <Plus className="h-3.5 w-3.5 stroke-[2]" />
                                            Tambah Item
                                        </button>
                                    </div>
                                </div>
                            </Collapsible>
                        ))}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-2 pt-1">
                    <button
                        type="button"
                        onClick={handleAddItem}
                        title="Tambah item langsung di bawah kategori (tanpa sub-kategori)"
                        className={`${tombolTambah} bg-surface hover:bg-primary/10 text-primary dark:text-primary-strong border-primary/20`}
                    >
                        <Plus className="h-3.5 w-3.5 stroke-[2]" />
                        Tambah Item
                    </button>
                    <button
                        type="button"
                        onClick={handleAddSub}
                        className={`${tombolTambah} bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300`}
                    >
                        <CornerDownRight className="h-3.5 w-3.5 stroke-[2]" />
                        Tambah Sub-kategori
                    </button>
                </div>
            </div>
        </Collapsible>
    );
}
