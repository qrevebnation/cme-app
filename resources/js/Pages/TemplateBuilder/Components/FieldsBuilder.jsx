import React from 'react';
import Collapsible from '../../../Components/Collapsible';
import RowItem, { JudulFields, RowActions } from './RowItem';

/**
 * Daftar parameter dirender mengikuti judul kategori/sub-kategori yang ada di
 * dalam `fields`, sehingga tiap kelompok bisa dilipat di ponsel.
 *
 * `fields` tetap berupa daftar datar (urutan & indeks tidak diubah); indeks
 * asli dipakai saat memanggil onChange/onRemove/onMoveUp/onMoveDown supaya
 * payload ke server sama persis seperti sebelumnya.
 */
function kelompokkan(rows) {
    const lepas = [];
    const kategori = [];

    rows.forEach((row, index) => {
        const entri = { row, index };

        if (row.type !== 'judul') {
            const induk = kategori[kategori.length - 1];
            const sub = induk?.subs[induk.subs.length - 1];

            if (sub) sub.items.push(entri);
            else if (induk) induk.items.push(entri);
            else lepas.push(entri);
            return;
        }

        const induk = kategori[kategori.length - 1];

        if (row.jenis === 'sub') {
            // Sub-kategori menempel pada kategori terakhir di atasnya.
            if (induk) induk.subs.push({ ...entri, items: [] });
            else lepas.push(entri);
            return;
        }

        kategori.push({ ...entri, items: [], subs: [] });
    });

    return { lepas, kategori };
}

export default function FieldsBuilder({ rows, onChange, onRemove, onMoveUp, onMoveDown }) {
    const { lepas, kategori } = kelompokkan(rows);
    const total = rows.length;

    const aksi = (index) => (
        <RowActions
            index={index}
            total={total}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onRemove={onRemove}
        />
    );

    const baris = (entri) => (
        <RowItem
            key={entri.row.id || entri.index}
            index={entri.index}
            total={total}
            row={entri.row}
            onChange={onChange}
            onRemove={onRemove}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
        />
    );

    const judul = (entri, cadangan) => entri.row.label || cadangan;

    // Tombol geser/hapus judul ditaruh di dalam isi Collapsible: header
    // menyisakan ruang untuk judul + penghitung saja di layar 390 px.
    const aksiBaris = (index) => (
        <div className="mb-3 flex items-center justify-end gap-1 border-b border-border pb-2">
            {aksi(index)}
        </div>
    );

    const hitungParameter = (grup) => grup.items.length + grup.subs.reduce((acc, sub) => acc + sub.items.length, 0);

    return (
        <>
            {lepas.map((entri) => (
                entri.row.type !== 'judul' ? baris(entri) : (
                    <Collapsible
                        key={entri.row.id || entri.index}
                        tingkat={entri.row.jenis === 'sub' ? 1 : 0}
                        judul={judul(entri, `(Judul ${entri.index + 1})`)}
                        meta="Belum masuk kategori"
                    >
                        {aksiBaris(entri.index)}
                        <JudulFields index={entri.index} row={entri.row} onChange={onChange} />
                    </Collapsible>
                )
            ))}

            {kategori.map((kat) => (
                <Collapsible
                    key={kat.row.id || kat.index}
                    tingkat={0}
                    judul={judul(kat, `(Kategori ${kat.index + 1})`)}
                    meta={kat.subs.length > 0 ? `${kat.subs.length} sub-kategori` : undefined}
                    penghitung={`${hitungParameter(kat)} parameter`}
                >
                    {aksiBaris(kat.index)}
                    <JudulFields index={kat.index} row={kat.row} onChange={onChange} />

                    <div className="mt-3 space-y-3">
                        {kat.subs.map((sub) => (
                            <Collapsible
                                key={sub.row.id || sub.index}
                                tingkat={1}
                                judul={judul(sub, `(Sub-kategori ${sub.index + 1})`)}
                                penghitung={`${sub.items.length} parameter`}
                            >
                                {aksiBaris(sub.index)}
                                <JudulFields index={sub.index} row={sub.row} onChange={onChange} />

                                {sub.items.length > 0 && (
                                    <div className="mt-3 space-y-3">{sub.items.map(baris)}</div>
                                )}
                            </Collapsible>
                        ))}

                        {kat.items.map(baris)}
                    </div>
                </Collapsible>
            ))}
        </>
    );
}
