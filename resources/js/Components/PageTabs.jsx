import { Link } from '@inertiajs/react';

/**
 * Tab antar-halaman dalam satu modul (mis. Daftar ATP | Template ATP).
 * Gaya pil di dalam satu bingkai — sama seperti tab di halaman Inventory.
 */
export default function PageTabs({ tabs = [] }) {
    return (
        <div className="mb-6 flex w-fit flex-wrap gap-1 rounded-lg border border-slate-200 bg-surface p-0.5">
            {tabs.map((tab) => (
                <Link
                    key={tab.href}
                    href={tab.href}
                    className={`inline-flex items-center rounded-md px-3 py-1.5 min-h-[44px] sm:min-h-0 text-xs font-semibold transition ${
                        tab.active ? 'bg-primary text-primary-foreground' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                    {tab.label}
                </Link>
            ))}
        </div>
    );
}
