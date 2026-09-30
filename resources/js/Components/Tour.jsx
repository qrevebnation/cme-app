import { useEffect, useRef, useState } from 'react';
import { HelpCircle, X, ChevronRight, ChevronLeft } from 'lucide-react';

const KUNCI = 'cme_tour_selesai';

/**
 * Panduan singkat penggunaan aplikasi (onboarding). Ditampilkan otomatis sekali
 * pada kunjungan pertama, dan bisa dibuka lagi lewat tombol bantuan.
 *
 * `langkah`: [{ judul, isi, target?: string }] — `target` = selector CSS opsional
 * untuk menyorot elemen terkait (bila elemennya tidak ada, langkah tetap tampil).
 */
export default function Tour({ langkah = [] }) {
    const [terbuka, setTerbuka] = useState(false);
    const [indeks, setIndeks] = useState(0);
    // #39: ref tombol pemicu (kembalikan fokus saat tutup) + kartu dialog (trap & fokus awal).
    const pemicuRef = useRef(null);
    const kartuRef = useRef(null);

    useEffect(() => {
        try {
            if (!localStorage.getItem(KUNCI) && langkah.length > 0) {
                setTerbuka(true);
            }
        } catch (e) {
            /* localStorage bisa diblokir; lewati panduan otomatis */
        }
    }, [langkah.length]);

    const tutup = () => {
        setTerbuka(false);
        try {
            localStorage.setItem(KUNCI, '1');
        } catch (e) {
            /* abaikan */
        }
        // #39: kembalikan fokus ke tombol pemicu agar urutan Tab berlanjut wajar.
        if (pemicuRef.current) pemicuRef.current.focus();
    };

    // #39: Escape menutup + Tab berputar di dalam kartu dialog (tanpa pustaka baru).
    useEffect(() => {
        if (!terbuka) return;
        const kunci = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                tutup();
                return;
            }
            if (e.key !== 'Tab' || !kartuRef.current) return;
            const fokusabel = [...kartuRef.current.querySelectorAll(
                'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
            )].filter((el) => el.offsetParent !== null);
            if (fokusabel.length === 0) return;
            const pertama = fokusabel[0];
            const terakhir = fokusabel[fokusabel.length - 1];
            if (e.shiftKey && document.activeElement === pertama) {
                e.preventDefault();
                terakhir.focus();
            } else if (!e.shiftKey && document.activeElement === terakhir) {
                e.preventDefault();
                pertama.focus();
            }
        };
        document.addEventListener('keydown', kunci, true);
        // Fokus awal ke kartu agar pembaca layar + Tab mulai dari dalam dialog.
        if (kartuRef.current) kartuRef.current.focus();
        return () => document.removeEventListener('keydown', kunci, true);
    }, [terbuka, indeks]);

    const tombolBantuan = (
        <button
            type="button"
            ref={pemicuRef}
            onClick={() => {
                setIndeks(0);
                setTerbuka(true);
            }}
            className="hidden items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 md:inline-flex"
            title="Panduan penggunaan"
        >
            <HelpCircle className="h-3.5 w-3.5" />
            Panduan
        </button>
    );

    if (!terbuka || langkah.length === 0) {
        return tombolBantuan;
    }

    const kini = langkah[Math.min(indeks, langkah.length - 1)];
    const terakhir = indeks >= langkah.length - 1;

    return (
        <>
            {tombolBantuan}
            <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={tutup}>
                <div
                    ref={kartuRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Panduan penggunaan aplikasi"
                    tabIndex={-1}
                    className="w-full max-w-md rounded-xl border border-slate-200 bg-surface p-5 shadow-2xl outline-none"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                                Langkah {indeks + 1} dari {langkah.length}
                            </p>
                            <h3 className="mt-1 text-base font-semibold text-slate-900">{kini.judul}</h3>
                        </div>
                        <button type="button" onClick={tutup} aria-label="Tutup panduan" className="text-slate-400 transition hover:text-slate-700">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{kini.isi}</p>

                    <div className="mt-5 flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => setIndeks((i) => Math.max(0, i - 1))}
                            disabled={indeks === 0}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" /> Sebelumnya
                        </button>

                        <div className="flex items-center gap-1.5">
                            {langkah.map((_, i) => (
                                <span
                                    key={i}
                                    className={`h-1.5 w-1.5 rounded-full ${i === indeks ? 'bg-primary' : 'bg-slate-200'}`}
                                />
                            ))}
                        </div>
                        {terakhir ? (
                            <button
                                type="button"
                                onClick={tutup}
                                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                            >
                                Mulai pakai
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIndeks((i) => Math.min(langkah.length - 1, i + 1))}
                                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                            >
                                Lanjut <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
