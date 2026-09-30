import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { ClipboardList } from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import Breadcrumbs from '../../Components/Breadcrumbs';
import PageTabs from '../../Components/PageTabs';

/**
 * Papan status ATP: satu kolom per putusan, satu kartu per baris ATP.
 *
 * Papan ini hanya baca. Putusan dihitung dari checklist (hasil_json.items)
 * saat data disimpan, jadi tidak ada seret-lepas antar kolom: pindah kolom
 * berarti mengubah hasil pemeriksaan, bukan memindahkan catatan.
 */

/** Nuansa kolom: status dipakai sebagai penanda keadaan, bukan hiasan. */
const NUANSA = {
    MENUNGGU: {
        judul: 'Menunggu Putusan',
        keterangan: 'Checklist belum diberi putusan',
        kepala: 'bg-surface-sunken text-text',
        hitung: 'border-slate-200 bg-surface text-text-muted',
        badge: 'bg-gray-50 text-gray-600 border border-gray-200',
        garis: 'bg-slate-300',
    },
    ACCEPT: {
        judul: 'Accept',
        keterangan: 'Seluruh item lolos, dokumen dapat ditandatangani',
        kepala: 'bg-emerald-50 text-emerald-900',
        hitung: 'border-emerald-200 bg-surface text-emerald-800',
        badge: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
        garis: 'bg-emerald-500',
    },
    CONDITIONAL: {
        judul: 'Conditional',
        keterangan: 'Perbaikan minor maksimal 7 hari kerja',
        kepala: 'bg-amber-50 text-amber-900',
        hitung: 'border-amber-200 bg-surface text-amber-800',
        badge: 'bg-amber-50 text-amber-800 border border-amber-200',
        garis: 'bg-amber-500',
    },
    REJECT: {
        judul: 'Reject',
        keterangan: 'Perbaikan total lalu ATP ulang',
        kepala: 'bg-rose-50 text-rose-900',
        hitung: 'border-rose-200 bg-surface text-rose-800',
        badge: 'bg-rose-50 text-rose-800 border border-rose-200',
        garis: 'bg-rose-500',
    },
};

/** Kolom yang tidak dikenal tetap tampil dengan nuansa netral. */
const nuansaKolom = (kunci) => NUANSA[kunci] || NUANSA.MENUNGGU;

/** Satu kartu: nama site jadi judul, sisanya meta satu baris yang dipotong. */
function KartuAtp({ kartu, kunciKolom }) {
    const nuansa = nuansaKolom(kunciKolom);
    const meta = [kartu.tanggal, kartu.region, kartu.no_po].filter(Boolean);

    return (
        <li className="flex">
            <Link
                href={`/atp/${kartu.id}`}
                className="flex min-h-[44px] min-w-0 flex-1 flex-col gap-1 px-3 py-2.5 transition-colors hover:bg-surface-sunken/60"
            >
                <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-text" title={kartu.nama_site || ''}>
                        {kartu.nama_site || '-'}
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${nuansa.badge}`}>
                        {kartu.verdict || 'MENUNGGU'}
                    </span>
                </span>
                {/* Meta dipotong satu baris: tidak ada kolom yang perlu digeser di ponsel. */}
                <span className="truncate text-xs text-text-muted" title={meta.join(' · ')}>
                    {meta.length ? meta.join(' · ') : 'Tanpa tanggal, region, dan no. PO'}
                </span>
                {kartu.total > 0 && (
                    <span className="font-mono text-[11px] text-text-muted">
                        {kartu.dinilai}/{kartu.total} item dinilai
                    </span>
                )}
            </Link>
        </li>
    );
}

export default function Board({ kolom = [] }) {
    const jumlahSemua = kolom.reduce((total, k) => total + (k.jumlah ?? 0), 0);

    return (
        <>
            <Head title="Papan Status ATP - Web CME" />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'ATP Check', href: '/atp' },
                { label: 'Papan Status' },
            ]} />

            <PageTabs tabs={[
                { label: 'Daftar ATP', href: '/atp', active: false },
                { label: 'Papan Status', href: '/atp/papan', active: true },
                { label: 'Template ATP', href: '/template', active: false },
            ]} />

            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines">
                    Papan Status ATP
                </h1>
                {/* Catatan kenapa kartu tidak bisa dipindah: putusan hasil hitungan checklist. */}
                <p className="mt-1 text-sm text-gray-500 font-headlines">
                    {jumlahSemua} ATP, dikelompokkan per putusan.
                </p>
                <p className="mt-1 text-xs text-text-muted">
                    Putusan dihitung dari checklist saat data disimpan, jadi kartu tidak dapat dipindah antar kolom di halaman ini.
                </p>
            </div>

            {/* Ponsel: satu kolom penuh, kolom berikutnya bertumpuk di bawahnya.
                Tanpa animasi masuk — hanya perubahan keadaan yang beranimasi. */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {kolom.map((k) => {
                    const nuansa = nuansaKolom(k.kunci);
                    const kartu = k.kartu ?? [];

                    return (
                        <section
                            key={k.kunci}
                            aria-label={`Kolom ${nuansa.judul}`}
                            className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-surface"
                        >
                            {/* Judul kolom menempel pada kolomnya, jadi asal kartu selalu terbaca. */}
                            <header className={`border-b border-border px-3 py-2 ${nuansa.kepala}`}>
                                <div className="flex items-center justify-between gap-2">
                                    <h2 className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase">
                                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${nuansa.garis}`} aria-hidden="true" />
                                        {nuansa.judul}
                                    </h2>
                                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${nuansa.hitung}`}>
                                        {k.jumlah ?? kartu.length}
                                    </span>
                                </div>
                                <p className="mt-0.5 text-[11px] opacity-80">{nuansa.keterangan}</p>
                            </header>

                            {kartu.length > 0 ? (
                                <ul className="divide-y divide-border">
                                    {kartu.map((item) => (
                                        <KartuAtp key={item.id} kartu={item} kunciKolom={k.kunci} />
                                    ))}
                                </ul>
                            ) : (
                                <p className="flex items-center justify-center gap-1.5 px-3 py-6 text-center text-xs text-text-muted">
                                    <ClipboardList className="h-4 w-4 shrink-0 stroke-[1.5]" aria-hidden="true" />
                                    Belum ada kartu di kolom ini
                                </p>
                            )}
                        </section>
                    );
                })}
            </div>
        </>
    );
}

Board.layout = page => <AppLayout children={page} />;
