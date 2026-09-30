import { useMemo, useState } from 'react';
import { Link } from '@inertiajs/react';
import { Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import CompactList from '../../../Components/CompactList';

const TABS = [
    { kunci: 'semua', label: 'Semua' },
    { kunci: 'ACCEPT', label: 'Accept' },
    { kunci: 'CONDITIONAL', label: 'Conditional' },
    { kunci: 'pending', label: 'Menunggu' },
];

const badgeVerdict = (verdict) => {
    if (verdict === 'ACCEPT') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (verdict === 'CONDITIONAL') return 'border-amber-200 bg-amber-50 text-amber-700';
    if (verdict === 'NOT ACCEPT') return 'border-rose-200 bg-rose-50 text-rose-700';
    return 'border-slate-200 bg-slate-50 text-slate-600';
};

// Dipakai tabel (md ke atas) dan daftar ponsel supaya badge tetap sama
const badgeVerdictNode = (verdict) => (
    <span
        className={`inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${badgeVerdict(
            verdict,
        )}`}
    >
        {verdict || 'PENDING'}
    </span>
);

export default function RecentAtpTable({ recentAtp = [] }) {
    const [tab, setTab] = useState('semua');
    const [cari, setCari] = useState('');
    const [halaman, setHalaman] = useState(1);

    const perHalaman = 10;

    const tersaring = useMemo(() => {
        const kata = cari.trim().toLowerCase();
        return recentAtp.filter((baris) => {
            const cocokTab =
                tab === 'semua'
                    ? true
                    : tab === 'pending'
                      ? !baris.verdict || baris.verdict === ''
                      : baris.verdict === tab;

            const cocokCari =
                kata === '' ||
                [baris.nama_site, baris.region, baris.no_po, baris.verdict, baris.tanggal]
                    .filter(Boolean)
                    .some((nilai) => String(nilai).toLowerCase().includes(kata));

            return cocokTab && cocokCari;
        });
    }, [recentAtp, tab, cari]);

    const totalHalaman = Math.max(1, Math.ceil(tersaring.length / perHalaman));
    const halamanAktif = Math.min(halaman, totalHalaman);
    const potongan = tersaring.slice((halamanAktif - 1) * perHalaman, halamanAktif * perHalaman);

    return (
        <div className="rounded-xl border border-slate-200 bg-surface shadow-xs">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-slate-900">ATP Terbaru</h3>
                    <p className="text-xs text-slate-500">Daftar dokumen ATP yang baru dibuat</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    {/* #38: 4 chip (~280px) muat di ≥360px; di 320px grup bergeser sendiri, bukan halaman. */}
                    <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-slate-200 p-0.5">
                        {TABS.map((t) => (
                            <button
                                key={t.kunci}
                                type="button"
                                onClick={() => {
                                    setTab(t.kunci);
                                    setHalaman(1);
                                }}
                                className={`rounded-md px-2.5 py-1 min-h-[44px] sm:min-h-0 text-xs font-semibold transition ${
                                    tab === t.kunci ? 'bg-primary text-primary-foreground' : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                        <input
                            value={cari}
                            onChange={(e) => {
                                setCari(e.target.value);
                                setHalaman(1);
                            }}
                            placeholder="Cari site, region, PO..."
                            className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 sm:w-64"
                        />
                    </div>
                </div>
            </div>

            {/* Mobile: tabel 6 kolom disembunyikan, diganti daftar satu baris di bawah */}
            <div className="hidden overflow-x-auto xl:block">
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="border-b border-slate-100 text-slate-500">
                            <th className="px-4 py-2.5 font-medium">Nama Site</th>
                            <th className="px-4 py-2.5 font-medium">Tanggal</th>
                            <th className="px-4 py-2.5 font-medium">Region</th>
                            <th className="px-4 py-2.5 font-medium">No. PO</th>
                            <th className="px-4 py-2.5 font-medium">Putusan</th>
                            <th className="px-4 py-2.5 font-medium text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {potongan.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                    Belum ada data untuk filter ini.
                                </td>
                            </tr>
                        )}
                        {potongan.map((baris) => (
                            <tr key={baris.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                                <td className="px-4 py-2.5 font-medium text-slate-800">
                                    <span className="block max-w-[200px] truncate" title={baris.nama_site || ''}>
                                        {baris.nama_site || '-'}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{baris.tanggal || '-'}</td>
                                <td className="px-4 py-2.5 text-slate-600">
                                    <span className="block max-w-[140px] truncate" title={baris.region || ''}>
                                        {baris.region || '-'}
                                    </span>
                                </td>
                                <td className="px-4 py-2.5 text-slate-600">
                                    <span className="block max-w-[150px] truncate" title={baris.no_po || ''}>
                                        {baris.no_po || '-'}
                                    </span>
                                </td>
                                <td className="px-4 py-2.5">{badgeVerdictNode(baris.verdict)}</td>
                                <td className="px-4 py-2.5 text-right">
                                    <Link
                                        href={`/atp/${baris.id}`}
                                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 min-h-[44px] sm:min-h-0 text-[11px] font-semibold text-slate-600 transition hover:border-primary hover:text-primary"
                                    >
                                        Detail
                                        <ExternalLink className="h-3 w-3" />
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile: daftar rapat memakai hasil filter & paginasi yang sama */}
            <div className="xl:hidden">
                <CompactList
                    rows={potongan}
                    kunci={(baris) => baris.id}
                    judul={(baris) => baris.nama_site || '-'}
                    meta={(baris) => [baris.tanggal, baris.region, baris.no_po]}
                    nuansa={(baris) => badgeVerdictNode(baris.verdict)}
                    tautan={(baris) => `/atp/${baris.id}`}
                    kosong="Belum ada data untuk filter ini."
                />
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-100 p-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>
                    Menampilkan {potongan.length} dari {tersaring.length} dokumen
                </span>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        disabled={halamanAktif <= 1}
                        onClick={() => setHalaman((h) => Math.max(1, h - 1))}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 min-h-[44px] sm:min-h-0 font-semibold transition hover:bg-slate-50 disabled:opacity-40"
                    >
                        <ChevronLeft className="h-3 w-3" /> Sebelumnya
                    </button>
                    <span className="tabular-nums">
                        {halamanAktif} / {totalHalaman}
                    </span>
                    <button
                        type="button"
                        disabled={halamanAktif >= totalHalaman}
                        onClick={() => setHalaman((h) => Math.min(totalHalaman, h + 1))}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 min-h-[44px] sm:min-h-0 font-semibold transition hover:bg-slate-50 disabled:opacity-40"
                    >
                        Selanjutnya <ChevronRight className="h-3 w-3" />
                    </button>
                </div>
            </div>
        </div>
    );
}
