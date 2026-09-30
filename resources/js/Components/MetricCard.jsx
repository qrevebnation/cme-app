import { Link } from '@inertiajs/react';
import AnimatedNumber from './AnimatedNumber';

/**
 * Kartu ringkasan dengan gaya dashboard: judul kecil, angka besar, badge
 * opsional di kanan, aksi opsional, dan catatan di bawah.
 * Dipakai seragam di seluruh modul (Inventory, ATP, Survey, Template).
 */
export default function MetricCard({
    title,
    value,
    badge,
    badgeIcon: BadgeIcon,
    badgeTone = 'netral',
    note,
    action,
    href,
}) {
    const nada = {
        naik: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        turun: 'border-rose-200 bg-rose-50 text-rose-700',
        peringatan: 'border-amber-200 bg-amber-50 text-amber-700',
        netral: 'border-slate-200 bg-slate-50 text-slate-600',
    };

    const isi = (
        <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-gradient-to-t from-slate-50 to-surface p-4 shadow-xs transition hover:-translate-y-0.5 hover:shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">{title}</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                        {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
                    </p>
                </div>
                {(badge || action) && (
                    <div className="flex shrink-0 items-center gap-1.5">
                        {badge && (
                            <span
                                className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${nada[badgeTone] ?? nada.netral}`}
                            >
                                {BadgeIcon && <BadgeIcon className="h-3 w-3 stroke-[2]" />}
                                {badge}
                            </span>
                        )}
                        {action}
                    </div>
                )}
            </div>
            {note && <p className="mt-3 text-xs text-slate-500">{note}</p>}
        </div>
    );

    if (href) {
        return (
            <Link href={href} className="block h-full">
                {isi}
            </Link>
        );
    }

    return isi;
}
