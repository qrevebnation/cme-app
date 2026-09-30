/**
 * Draft autosave isian form ke localStorage.
 *
 * Kenapa perlu: koneksi lapangan sering putus dan form Survey/ATP panjang, jadi
 * isian hilang begitu halaman tertutup sebelum dikirim. Draft disimpan per dokumen
 * (`cme_draft_survey_baru`, `cme_draft_survey_<id>`, `cme_draft_atp_baru`,
 * `cme_draft_atp_<id>`) dan pemulihannya selalu DITAWARKAN lewat `DraftBar` di atas
 * form — tidak pernah diterapkan otomatis sehingga isian server tidak tertimpa.
 */
import { createElement, useCallback, useEffect, useRef, useState } from 'react';

const PREFIX = 'cme_draft_';
const JEDA_SIMPAN = 800; // jeda debounce sebelum draft ditulis
const JEDA_TAWAR = 400; // tunggu data awal halaman (template/DB) selesai dimuat

/** Isian disimpan tanpa berkas: File/Blob dibuang, metadata unggahan tetap ikut. */
const bersih = (nilai) => {
    if (typeof Blob !== 'undefined' && nilai instanceof Blob) return undefined;
    if (Array.isArray(nilai)) return nilai.map(bersih).filter((isi) => isi !== undefined);
    if (nilai && typeof nilai === 'object') {
        const hasil = {};
        Object.keys(nilai).forEach((k) => {
            const isi = bersih(nilai[k]);
            if (isi !== undefined) hasil[k] = isi;
        });
        return hasil;
    }
    return nilai;
};

/** Jam lokal 24 jam, mis. 12:34. */
const jam = (milidetik) => {
    const waktu = new Date(milidetik);
    return `${String(waktu.getHours()).padStart(2, '0')}:${String(waktu.getMinutes()).padStart(2, '0')}`;
};

const baca = (kunci) => {
    try {
        const mentah = localStorage.getItem(kunci);
        if (!mentah) return null;
        const isi = JSON.parse(mentah);
        return isi && typeof isi === 'object' && isi.data ? isi : null;
    } catch {
        return null; // localStorage diblokir atau isi rusak
    }
};

const tulis = (kunci, data, waktu) => {
    try {
        localStorage.setItem(kunci, JSON.stringify({ waktu, data }));
        return true;
    } catch {
        return false; // kuota penuh / mode privat
    }
};

const hapus = (kunci) => {
    try {
        localStorage.removeItem(kunci);
    } catch {
        /* tidak ada yang bisa dibersihkan */
    }
};

/**
 * @param {{ kunci: string, data: object, aktif?: boolean }} opsi
 *   `kunci` tanpa prefix, mis. `survey_baru` atau `survey_12`.
 * @returns {{ adaDraft: boolean, waktuDraft: string|null, pulihkan: (terapkan?: (kunci: string, nilai: any) => void) => object|null, buang: () => void, terakhirDisimpan: string|null }}
 */
export function useDraft({ kunci, data, aktif = true }) {
    const kunciPenuh = `${PREFIX}${kunci}`;

    const [adaDraft, setAdaDraft] = useState(false);
    const [waktuDraft, setWaktuDraft] = useState(null);
    const [terakhirDisimpan, setTerakhirDisimpan] = useState(null);

    const dataRef = useRef(data);
    const tersimpanRef = useRef(null); // isian yang sudah ada di localStorage
    const pendingRef = useRef(null); // isian yang menunggu jeda debounce
    const tersentuhRef = useRef(false); // form sudah disentuh pengguna
    const timerRef = useRef(null);

    dataRef.current = data;

    const tulisSekarang = useCallback(() => {
        if (!pendingRef.current) return;

        const waktu = Date.now();
        if (!tulis(kunciPenuh, pendingRef.current, waktu)) return;

        tersimpanRef.current = JSON.stringify(pendingRef.current);
        pendingRef.current = null;
        setTerakhirDisimpan(jam(waktu));
    }, [kunciPenuh]);

    // Isyarat interaksi pertama: sebelum itu, perubahan data berasal dari pemuatan
    // halaman (template/DB) sehingga tidak ditulis sebagai draft isian pengguna.
    useEffect(() => {
        if (!aktif) return;

        const tanda = () => {
            tersentuhRef.current = true;
        };
        const jenis = ['keydown', 'pointerdown', 'input', 'paste'];
        jenis.forEach((peristiwa) => document.addEventListener(peristiwa, tanda, { capture: true, once: true }));

        return () => jenis.forEach((peristiwa) => document.removeEventListener(peristiwa, tanda, { capture: true }));
    }, [aktif]);

    // Autosave berjeda: ditulis hanya bila isian benar-benar berubah dari draft terakhir.
    useEffect(() => {
        if (!aktif || !tersentuhRef.current) return;

        const kini = bersih(data);
        const ringkas = JSON.stringify(kini);

        if (ringkas === tersimpanRef.current) {
            pendingRef.current = null;
            clearTimeout(timerRef.current);
            return;
        }

        pendingRef.current = kini;
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(tulisSekarang, JEDA_SIMPAN);

        return () => clearTimeout(timerRef.current);
    }, [data, aktif, tulisSekarang]);

    // Tawarkan draft lama setelah data awal halaman selesai dimuat; draft yang sama
    // persis dengan isian awal dibuang karena tidak ada yang perlu dipulihkan.
    useEffect(() => {
        if (!aktif) return;

        const isi = baca(kunciPenuh);
        if (!isi) return;

        const jeda = setTimeout(() => {
            if (JSON.stringify(bersih(isi.data)) === JSON.stringify(bersih(dataRef.current))) {
                hapus(kunciPenuh);
                return;
            }

            setWaktuDraft(jam(isi.waktu));
            setAdaDraft(true);
        }, JEDA_TAWAR);

        return () => clearTimeout(jeda);
    }, [aktif, kunciPenuh]);

    // Halaman ditutup/peramban ditinggalkan: tulis isian yang masih menunggu jeda.
    useEffect(() => {
        if (!aktif) return;

        const simpanSegera = () => tulisSekarang();
        window.addEventListener('pagehide', simpanSegera);

        return () => window.removeEventListener('pagehide', simpanSegera);
    }, [aktif, tulisSekarang]);

    // Navigasi Inertia melepas halaman tanpa unload: hentikan sisa draft yang menunggu
    // agar tidak tertulis setelah pengiriman berhasil.
    useEffect(
        () => () => {
            clearTimeout(timerRef.current);
            pendingRef.current = null;
        },
        [],
    );

    /** Tulis ulang isian draft lewat `terapkan(kunci, nilai)`, mis. `setData` milik useForm. */
    const pulihkan = useCallback(
        (terapkan) => {
            const isi = baca(kunciPenuh);
            if (!isi) return null;

            Object.keys(isi.data).forEach((k) => terapkan?.(k, isi.data[k]));

            tersimpanRef.current = JSON.stringify(bersih(isi.data));
            setAdaDraft(false);
            setWaktuDraft(null);
            setTerakhirDisimpan(jam(isi.waktu));
            return isi.data;
        },
        [kunciPenuh],
    );

    /** Dipakai tombol `Buang` dan Inertia `onSuccess` supaya draft tidak tersisa. */
    const buang = useCallback(() => {
        clearTimeout(timerRef.current);
        hapus(kunciPenuh);

        pendingRef.current = null;
        tersimpanRef.current = null;
        setAdaDraft(false);
        setWaktuDraft(null);
        setTerakhirDisimpan(null);
    }, [kunciPenuh]);

    return { adaDraft, waktuDraft, pulihkan, buang, terakhirDisimpan };
}

/**
 * Bilah tawaran pemulihan di atas form: waktu simpan + tombol `Pulihkan`/`Buang`,
 * keduanya 44 px di ponsel dengan teks text-xs. Ditulis memakai createElement
 * karena berkas lib ini `.js` murni, tanpa transformasi JSX.
 */
export function DraftBar({ adaDraft, waktuDraft, onPulihkan, onBuang }) {
    if (!adaDraft) return null;

    return createElement(
        'div',
        {
            className:
                'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800',
        },
        createElement('span', null, `Draft tersimpan ${waktuDraft}`),
        createElement(
            'button',
            {
                type: 'button',
                onClick: onPulihkan,
                className:
                    'h-11 sm:h-8 rounded-md border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-900 transition hover:bg-amber-100',
            },
            'Pulihkan',
        ),
        createElement(
            'button',
            {
                type: 'button',
                onClick: onBuang,
                className: 'h-11 sm:h-8 rounded-md px-3 text-xs font-semibold text-amber-800 transition hover:bg-amber-100',
            },
            'Buang',
        ),
    );
}
