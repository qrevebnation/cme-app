import { CheckCircle2, Clock, FileText } from 'lucide-react';

const WARNA = {
    selesai: { titik: 'bg-emerald-500', ikon: CheckCircle2, teks: 'text-emerald-700 dark:text-emerald-400' },
    menunggu: { titik: 'bg-amber-500', ikon: Clock, teks: 'text-amber-700 dark:text-amber-400' },
    info: { titik: 'bg-slate-400', ikon: FileText, teks: 'text-slate-600' },
};

/**
 * Riwayat langkah dokumen (mis. ATP -> BAL -> BASTP) dalam bentuk garis waktu.
 * `items`: [{ judul, waktu, keterangan?, status?: 'selesai'|'menunggu'|'info' }]
 */
export default function Timeline({ items = [] }) {
    if (items.length === 0) {
        return <p className="text-xs text-slate-400">Belum ada riwayat.</p>;
    }

    return (
        <ol className="relative space-y-4 border-l border-slate-200 pl-5">
            {items.map((item) => {
                const gaya = WARNA[item.status] ?? WARNA.info;
                const Ikon = gaya.ikon;

                return (
                    <li key={`${item.judul}-${item.waktu ?? ''}`} className="relative">
                        <span className={`absolute -left-[26px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full ${gaya.titik}`}>
                            <Ikon className="h-2.5 w-2.5 text-white" />
                        </span>
                        <p className={`text-xs font-semibold ${gaya.teks}`}>{item.judul}</p>
                        {item.waktu && <p className="text-[11px] text-slate-500">{item.waktu}</p>}
                        {item.keterangan && <p className="mt-0.5 text-[11px] text-slate-500">{item.keterangan}</p>}
                    </li>
                );
            })}
        </ol>
    );
}
