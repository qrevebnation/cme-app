import { useState } from 'react';
import { CalendarRange } from 'lucide-react';

const p = (n) => String(n).padStart(2, '0');
const keTanggal = (d) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;

/**
 * Pemilih rentang tanggal dengan preset cepat (hari ini, 7/30 hari, bulan ini,
 * bulan lalu). Dipakai untuk filter periode riwayat gudang, log, dan laporan.
 */
export default function DateRangePicker({ dari = '', sampai = '', onChange, label = 'Periode' }) {
    const [mulai, setMulai] = useState(dari);
    const [akhir, setAkhir] = useState(sampai);

    const preset = (nama) => {
        const hariIni = new Date();
        let m = new Date(hariIni);
        let a = new Date(hariIni);

        if (nama === '7') m.setDate(a.getDate() - 6);
        if (nama === '30') m.setDate(a.getDate() - 29);
        if (nama === 'bulan') m = new Date(a.getFullYear(), a.getMonth(), 1);
        if (nama === 'bulan-lalu') {
            m = new Date(a.getFullYear(), a.getMonth() - 1, 1);
            a = new Date(a.getFullYear(), a.getMonth(), 0);
        }

        const mulaiStr = keTanggal(m);
        const akhirStr = keTanggal(a);
        setMulai(mulaiStr);
        setAkhir(akhirStr);
        onChange?.(mulaiStr, akhirStr);
    };

    return (
        <div className="flex flex-col gap-2">
            {label && <span className="text-xs font-medium text-slate-600">{label}</span>}
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-surface px-2 py-1.5">
                    <CalendarRange className="h-3.5 w-3.5 text-slate-400" />
                    <input
                        type="date"
                        value={mulai}
                        onChange={(e) => setMulai(e.target.value)}
                        className="bg-transparent text-xs outline-none"
                    />
                    <span className="text-xs text-slate-400">s/d</span>
                    <input
                        type="date"
                        value={akhir}
                        onChange={(e) => setAkhir(e.target.value)}
                        className="bg-transparent text-xs outline-none"
                    />
                </div>

                <button
                    type="button"
                    onClick={() => onChange?.(mulai, akhir)}
                    className="rounded-lg bg-primary px-3 py-1.5 min-h-[44px] sm:min-h-0 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                    Terapkan
                </button>

                <div className="flex flex-wrap gap-1">
                    {[
                        ['Hari ini', '1'],
                        ['7 hari', '7'],
                        ['30 hari', '30'],
                        ['Bulan ini', 'bulan'],
                        ['Bulan lalu', 'bulan-lalu'],
                    ].map(([teks, kunci]) => (
                        <button
                            key={kunci}
                            type="button"
                            onClick={() => preset(kunci)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 min-h-[44px] sm:min-h-0 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                            {teks}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
