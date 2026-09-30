import { CheckCircle2, Circle, ListChecks } from 'lucide-react';

/**
 * Navigasi langkah/seksi untuk form panjang (mis. checklist ATP 85–121 parameter).
 * Bukan wizard yang menyembunyikan isian: hanya daftar seksi yang bisa diklik untuk
 * melompat ke bagiannya, lengkap dengan penghitung item yang sudah dinilai.
 *
 * `items`: [{ id, label, jenis?: 'seksi'|'sub', jumlah?: number, terisi?: number }]
 */
export default function Stepper({ items = [], aktifId = null, onPilih, progres = null }) {
    const persen = progres && progres.total > 0 ? Math.round((progres.selesai / progres.total) * 100) : 0;

    return (
        <div className="rounded-xl border border-slate-200 bg-surface shadow-xs">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-primary/10 p-1.5 text-primary dark:text-primary-strong">
                        <ListChecks className="h-4 w-4 stroke-[1.5]" />
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-slate-900">Bagian Checklist</p>
                        <p className="text-[11px] text-slate-500">
                            {progres ? `${progres.selesai} dari ${progres.total} parameter dinilai` : 'Klik untuk melompat ke bagian'}
                        </p>
                    </div>
                </div>
                {progres && <span className="text-xs font-semibold tabular-nums text-slate-600">{persen}%</span>}
            </div>

            {progres && (
                <div className="h-1.5 w-full bg-slate-100">
                    <div className="h-1.5 rounded-r bg-primary transition-all" style={{ width: `${persen}%` }} />
                </div>
            )}

            <nav className="max-h-[60vh] overflow-y-auto p-2">
                {items.length === 0 && <p className="px-2 py-4 text-center text-xs text-slate-400">Belum ada bagian.</p>}

                {items.map((item) => {
                    const sub = item.jenis === 'sub';
                    const selesai = typeof item.terisi === 'number' && item.jumlah ? item.terisi >= item.jumlah : false;

                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => onPilih?.(item.id)}
                            className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition ${
                                aktifId === item.id ? 'bg-primary/10 text-primary dark:text-primary-strong' : 'text-slate-600 hover:bg-slate-50'
                            } ${sub ? 'pl-6' : ''}`}
                        >
                            {selesai ? (
                                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            ) : (
                                <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
                            )}
                            <span className="min-w-0 flex-1">
                                <span className={`block truncate ${sub ? 'font-medium' : 'font-semibold'}`} title={item.label}>
                                    {item.label}
                                </span>
                                {typeof item.jumlah === 'number' && (
                                    <span className="block text-[11px] text-slate-400">
                                        {item.terisi ?? 0}/{item.jumlah} dinilai
                                    </span>
                                )}
                            </span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
