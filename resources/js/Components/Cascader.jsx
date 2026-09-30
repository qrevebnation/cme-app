import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsUpDown, Search } from 'lucide-react';

/**
 * Pemilih berjenjang (cascader) kategori -> tipe -> item tanpa dependensi.
 *
 * `tree`: [{ value, label, children: [{ value, label, children: [{ value, label,
 *          description?, meta?, disabled? }] }] }]
 * API selaras Combobox: onChange(value, meta|null) sehingga bisa dipasang
 * menggantikan Combobox tanpa mengubah handler.
 * `allowCustom`: kata yang diketik dan belum ada di daftar ditawarkan sebagai
 * baris "Gunakan: ..." (memanggil onChange(kata, null)).
 *
 * Di layar kecil panel menampilkan satu tingkat per layar dengan tombol kembali;
 * mulai 640 px ketiga kolom tampil berdampingan.
 */
export default function Cascader({
    tree = [],
    value,
    onChange,
    placeholder = 'Pilih...',
    kosongTeks = 'Tidak ada pilihan yang cocok.',
    error = '',
    disabled = false,
    allowCustom = false,
}) {
    const [terbuka, setTerbuka] = useState(false);
    const [kata, setKata] = useState('');
    const [katAktif, setKatAktif] = useState(0);
    const [tipeAktif, setTipeAktif] = useState(0);
    const [tahap, setTahap] = useState(0); // layar kecil: 0 kategori, 1 tipe, 2 item
    const wadah = useRef(null);

    const daun = useMemo(
        () =>
            tree.flatMap((k, ki) =>
                (k.children ?? []).flatMap((t, ti) =>
                    (t.children ?? []).map((l) => ({ ...l, kIdx: ki, tIdx: ti, jalur: `${k.label} › ${t.label}` })),
                ),
            ),
        [tree],
    );

    const terpilih = useMemo(() => daun.find((l) => String(l.value) === String(value)), [daun, value]);
    const labelTerpilih = terpilih ? terpilih.label : allowCustom && value ? String(value) : null;

    const tersaring = useMemo(() => {
        const kunci = kata.trim().toLowerCase();
        if (kunci === '') return daun;
        return daun.filter((i) =>
            [i.label, i.description, i.jalur, i.meta?.kategori, i.meta?.tipe]
                .filter(Boolean)
                .some((t) => String(t).toLowerCase().includes(kunci)),
        );
    }, [daun, kata]);

    const barisKustom = useMemo(() => {
        if (!allowCustom) return null;
        const kunci = kata.trim();
        if (kunci === '') return null;
        const adaPersis = daun.some(
            (i) => String(i.value).toLowerCase() === kunci.toLowerCase() || String(i.label).toLowerCase() === kunci.toLowerCase(),
        );
        return adaPersis ? null : { value: kunci, label: `Gunakan: "${kunci}"`, kustom: true };
    }, [allowCustom, daun, kata]);

    const cariMode = kata.trim() !== '';
    const hasilCari = barisKustom ? [barisKustom, ...tersaring] : tersaring;

    const kategori = tree[katAktif] ?? null;
    const tipe = kategori?.children?.[tipeAktif] ?? null;

    useEffect(() => {
        const tutup = (e) => {
            if (wadah.current && !wadah.current.contains(e.target)) setTerbuka(false);
        };
        document.addEventListener('mousedown', tutup);
        return () => document.removeEventListener('mousedown', tutup);
    }, []);

    const buka = () => {
        if (terbuka) {
            setTerbuka(false);
            return;
        }
        if (terpilih) {
            setKatAktif(terpilih.kIdx);
            setTipeAktif(terpilih.tIdx);
            setTahap(2);
        } else {
            setTahap(0);
        }
        setKata('');
        setTerbuka(true);
    };

    const pilih = (item) => {
        if (item.disabled) return;
        onChange?.(item.value, item.kustom ? null : item.meta);
        setTerbuka(false);
        setKata('');
    };

    const teksKosong = (teks) => <p className="px-3 py-4 text-xs text-slate-500">{teks}</p>;

    const baris = (item, aktif, onClick) => (
        <button
            key={`${item.value}`}
            type="button"
            disabled={item.disabled}
            onClick={onClick}
            className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-slate-50 disabled:opacity-50 ${
                aktif ? 'bg-primary/10 text-primary font-semibold' : 'text-slate-700'
            }`}
        >
            <span className="min-w-0">
                <span className="block truncate">{item.label}</span>
                {item.description && <span className="block truncate text-[11px] text-slate-500">{item.description}</span>}
            </span>
            {aktif && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
        </button>
    );

    const kolom = (tingkat) => {
        if (tingkat === 0) {
            return tree.length
                ? tree.map((k, i) => baris(k, i === katAktif, () => { setKatAktif(i); setTipeAktif(0); setTahap(1); }))
                : teksKosong(kosongTeks);
        }
        if (tingkat === 1) {
            const anak = kategori?.children ?? [];
            return anak.length ? anak.map((t, i) => baris(t, i === tipeAktif, () => { setTipeAktif(i); setTahap(2); })) : teksKosong('Tidak ada tipe.');
        }
        const anak = tipe?.children ?? [];
        return anak.length ? anak.map((l) => baris(l, false, () => pilih(l))) : teksKosong('Tidak ada item.');
    };

    const kepala = (tingkat, teks) => (
        <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {teks}
        </div>
    );

    const tombolKembali = (tingkat, kembaliKe) => (
        <button
            type="button"
            onClick={kembaliKe}
            className="flex w-full items-center gap-1.5 border-b border-slate-100 px-3 py-2 text-xs font-semibold text-primary hover:bg-slate-50"
        >
            <ChevronLeft className="h-3.5 w-3.5" /> {tingkat}
        </button>
    );

    return (
        <div className="relative" ref={wadah}>
            <button
                type="button"
                disabled={disabled}
                onClick={buka}
                className={`flex w-full items-center justify-between gap-2 rounded-md border bg-surface p-2 min-h-[44px] sm:min-h-0 text-left text-sm shadow-sm outline-none transition focus:border-primary focus:ring focus:ring-primary/20 disabled:opacity-50 ${
                    error ? 'border-red-500' : 'border-border'
                }`}
            >
                <span className={`min-w-0 truncate ${labelTerpilih ? 'text-slate-800' : 'text-slate-400'}`}>
                    {labelTerpilih ?? placeholder}
                </span>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
            </button>

            {terbuka && (
                <div className="absolute z-30 mt-1 w-full min-w-[280px] overflow-hidden rounded-lg border border-slate-200 bg-surface shadow-lg">
                    <div className="relative border-b border-slate-100">
                        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                            autoFocus
                            value={kata}
                            onChange={(e) => setKata(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') setTerbuka(false);
                                if (e.key === 'Enter' && hasilCari.length) pilih(hasilCari[0]);
                            }}
                            placeholder="Cari kata..."
                            className="w-full rounded-t-md border-0 bg-transparent py-2.5 pl-8 pr-3 text-sm outline-none ring-0 placeholder:text-slate-400"
                        />
                    </div>

                    {cariMode ? (
                        <div className="max-h-64 overflow-y-auto">
                            {hasilCari.length ? (
                                hasilCari.map((i) => baris(i, false, () => pilih(i)))
                            ) : (
                                teksKosong(kosongTeks)
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Layar kecil: satu tingkat per layar + tombol kembali. */}
                            <div className="sm:hidden">
                                {tahap === 1 && tombolKembali('Kategori', () => setTahap(0))}
                                {tahap === 2 && tombolKembali('Tipe', () => setTahap(1))}
                                <div className="max-h-64 overflow-y-auto">
                                    {tahap === 0 && <>{kepala(0, 'Kategori')}{kolom(0)}</>}
                                    {tahap === 1 && <>{kepala(1, 'Tipe')}{kolom(1)}</>}
                                    {tahap === 2 && <>{kepala(2, 'Item')}{kolom(2)}</>}
                                </div>
                            </div>
                            {/* >=640 px: ketiga kolom berdampingan. */}
                            <div className="hidden sm:grid sm:grid-cols-3 sm:divide-x sm:divide-slate-100">
                                <div className="max-h-64 overflow-y-auto">{kepala(0, 'Kategori')}{kolom(0)}</div>
                                <div className="max-h-64 overflow-y-auto">{kepala(1, 'Tipe')}{kolom(1)}</div>
                                <div className="max-h-64 overflow-y-auto">{kepala(2, 'Item')}{kolom(2)}</div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
