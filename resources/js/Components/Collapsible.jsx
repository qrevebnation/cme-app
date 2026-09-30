import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Bagian yang bisa dibuka/tutup (kategori dan sub-kategori checklist).
 *
 * Header setinggi minimal 44 px supaya nyaman disentuh, dan isinya tidak
 * dirender saat tertutup sehingga daftar panjang tetap ringan. Status di kanan
 * (mis. "3/5 diperiksa") memberi petunjuk tanpa perlu membuka bagiannya.
 */
export default function Collapsible({
    judul,
    meta,
    penghitung,
    awalTerbuka = false,
    tingkat = 0,
    aksi,
    children,
    className = '',
}) {
    const [terbuka, setTerbuka] = useState(awalTerbuka);

    const gayaKepala = tingkat === 0
        ? 'bg-surface-sunken/60 hover:bg-surface-sunken'
        : 'bg-transparent hover:bg-surface-sunken/50';

    return (
        <section
            className={`rounded-lg border ${tingkat === 0 ? 'border-border' : 'border-border/70'} overflow-hidden ${className}`}
        >
            <div className={`flex items-stretch gap-1 ${gayaKepala} transition-colors`}>
                <button
                    type="button"
                    onClick={() => setTerbuka((v) => !v)}
                    aria-expanded={terbuka}
                    className={`flex min-h-[44px] flex-1 items-center gap-2 py-2 text-left ${tingkat === 0 ? 'px-3' : 'pl-6 pr-3'}`}
                >
                    <ChevronDown
                        className={`h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 ${terbuka ? '' : '-rotate-90'}`}
                        aria-hidden="true"
                    />
                    <span className={`min-w-0 flex-1 ${tingkat === 0 ? 'text-sm font-semibold text-text' : 'text-sm font-medium text-text'}`}>
                        <span className="block truncate">{judul}</span>
                        {meta && <span className="block truncate text-xs font-normal text-text-muted">{meta}</span>}
                    </span>
                    {penghitung && (
                        <span className="shrink-0 rounded-full border border-border bg-surface px-2 py-0.5 text-xs tabular-nums text-text-muted">
                            {penghitung}
                        </span>
                    )}
                </button>
                {aksi && <div className="flex shrink-0 items-center pr-2">{aksi}</div>}
            </div>

            {terbuka && <div className={tingkat === 0 ? 'px-3 pb-3 pt-1' : 'pl-6 pr-3 pb-3 pt-1'}>{children}</div>}
        </section>
    );
}
