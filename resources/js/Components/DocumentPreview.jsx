import React, { useEffect, useRef, useState } from 'react';
import { Download, ExternalLink, Printer } from 'lucide-react';
import ResponsiveModal from './ResponsiveModal';
import Spinner from './Spinner';

/** Gaya tombol pratinjau: tinggi sentuh 44 px di ponsel, 36 px di desktop seperti tombol halaman lain. */
const gayaTombol =
    'inline-flex h-11 sm:h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs font-bold uppercase tracking-wider transition';

/**
 * Pratinjau dokumen di dalam aplikasi, supaya pengguna tidak keluar dari aplikasi
 * saat memeriksa dokumen. Memakai Modal (layar lebar) / ResponsiveModal (lembar
 * bawah di ponsel) yang sudah ada; lebar dibatasi `max-w-5xl`.
 *
 * - `html` (bawaan): dokumen cetak (`/print/...`) tampil di dalam iframe.
 * - `unduhan`: berkas ekspor CSV/Markdown bukan halaman web, jadi isinya tidak
 *   dimuat ke iframe; pengguna dapat mengunduh langsung atau membuka di tab.
 */
export default function DocumentPreview({
    isOpen,
    onClose,
    judul,
    src,
    jenis = 'html',
}) {
    const rangka = useRef(null);
    const [memuat, setMemuat] = useState(true);

    // Setiap kali pratinjau dibuka (atau dokumennya berganti) indikator dimuat dinyalakan
    // lagi, karena iframe mengisi ulang isinya.
    useEffect(() => {
        if (isOpen) setMemuat(true);
    }, [isOpen, src]);

    const cetak = () => {
        const jendela = rangka.current?.contentWindow;

        if (jendela) {
            try {
                // Halaman cetak ATP/Cover menahan window.print() sesaat setelah dimuat
                // (lihat PrintBridgeController), jadi fungsi aslinya dipakai bila ada.
                const cetakAsli = jendela.__cetakAsli || jendela.print;
                if (typeof cetakAsli === 'function') {
                    cetakAsli.call(jendela);
                    return;
                }
            } catch {
                // Dokumen lintas asal / iframe ditolak peramban: lanjut ke tab baru di bawah.
            }
        }

        // Cadangan: buka tab baru lalu cetak dari sana (tanpa `noopener` supaya
        // pegangan jendelanya masih bisa dipakai memanggil print()).
        const tab = window.open(src, '_blank');
        if (!tab) return;
        try {
            tab.opener = null;
        } catch {
            // Peramban menolak penyetelan opener; tidak menghalangi pencetakan.
        }
        tab.addEventListener('load', () => {
            try {
                tab.print();
            } catch {
                // Peramban menolak print() dari jendela lain: dokumen punya tombol Cetak sendiri.
            }
        });
    };

    return (
        <ResponsiveModal isOpen={isOpen} onClose={onClose} title={judul} size="max-w-5xl">
            {jenis === 'unduhan' ? (
                <div className="flex flex-col gap-4">
                    {/* CSV/Markdown bukan HTML: iframe hanya akan menampilkan teks mentah,
                        jadi disediakan tombol Unduh eksplisit selain tautan tab. */}
                    <p className="text-sm leading-relaxed text-gray-600 font-body">
                        Berkas ini bukan halaman cetak, jadi tidak ditampilkan di dalam aplikasi. Berkas tetap diunduh ke perangkat Anda.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <a href={src} download className={`${gayaTombol} border border-transparent bg-primary text-primary-foreground hover:bg-primary/90`}>
                            <Download className="h-3.5 w-3.5 stroke-[1.5]" />
                            Unduh
                        </a>
                        {/* Tautan asli: target _blank + rel noreferrer memberi perilaku tab baru yang sama seperti sebelumnya. */}
                        <a href={src} target="_blank" rel="noreferrer" className={`${gayaTombol} bg-surface border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-black`}>
                            <ExternalLink className="h-3.5 w-3.5 stroke-[1.5]" />
                            Buka di tab
                        </a>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        {/* Tautan asli: target _blank + rel noreferrer memberi perilaku tab baru yang sama seperti sebelumnya. */}
                        <a href={src} target="_blank" rel="noreferrer" className={`${gayaTombol} bg-surface border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-black`}>
                            <ExternalLink className="h-3.5 w-3.5 stroke-[1.5]" />
                            Buka di tab
                        </a>
                        <button type="button" onClick={cetak} className={`${gayaTombol} border border-transparent bg-primary text-primary-foreground hover:bg-primary/90`}>
                            <Printer className="h-3.5 w-3.5 stroke-[1.5]" />
                            Cetak / Simpan PDF
                        </button>
                    </div>

                    <div className="relative">
                        {/* Tinggi pas di badan modal (batas 80vh) dikurangi bilah tombol, sehingga
                            dokumen mengisi hampir seluruh layar tanpa gulir ganda. */}
                        <iframe
                            ref={rangka}
                            src={src}
                            title={judul || 'Pratinjau dokumen'}
                            onLoad={() => setMemuat(false)}
                            className="h-[calc(80vh_-_7rem)] w-full rounded-lg border border-slate-200 bg-white"
                        />

                        {memuat && (
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-white/85">
                                <Spinner size="md" />
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Memuat dokumen…</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </ResponsiveModal>
    );
}
