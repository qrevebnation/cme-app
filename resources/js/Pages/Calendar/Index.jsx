import React, { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/Card';
import MetricCard from '../../Components/MetricCard';
import Breadcrumbs from '../../Components/Breadcrumbs';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    ExternalLink,
    ShieldCheck,
    Wrench,
} from 'lucide-react';

const NAMA_BULAN = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const HARI = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const JENIS = {
    survey: {
        label: 'Survey ODC',
        dot: 'bg-primary',
        chip: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: ClipboardCheck,
    },
    alat: {
        label: 'Tenggat Alat',
        dot: 'bg-amber-400',
        chip: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: Wrench,
    },
    atp: {
        label: 'Periode ATP',
        dot: 'bg-emerald-500',
        chip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: ShieldCheck,
    },
};

function hariIni() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function labelTanggal(tanggal) {
    const [tahun, bulan, hari] = tanggal.split('-').map(Number);
    return `${hari} ${NAMA_BULAN[bulan - 1]} ${tahun}`;
}

export default function Index({ bulan, agenda = [], navigasi = {} }) {
    const [dipilih, setDipilih] = useState(null);

    const [tahun, bulanKe] = bulan.split('-').map(Number);

    // Agenda dikelompokkan per tanggal supaya penanda di grid tanggal murah dihitung.
    const perTanggal = useMemo(() => {
        const map = {};
        agenda.forEach((item) => {
            (map[item.tanggal] = map[item.tanggal] || []).push(item);
        });
        return map;
    }, [agenda]);

    const jumlahHari = new Date(tahun, bulanKe, 0).getDate();
    // Grid mulai Senin.
    const offset = (new Date(tahun, bulanKe - 1, 1).getDay() + 6) % 7;

    const hariIniStr = hariIni();
    const tanggalBeragenda = Object.keys(perTanggal).sort();
    // Hari ini bila ada agendanya, jika tidak tanggal beragenda terdekat, jika tidak hari ini/awal bulan.
    const bawaan = perTanggal[hariIniStr]
        ? hariIniStr
        : (tanggalBeragenda[0] || (hariIniStr.startsWith(bulan) ? hariIniStr : `${bulan}-01`));
    // Pilihan lama diabaikan bila sudah pindah bulan (props berubah tanpa remount).
    const tanggalAktif = dipilih && dipilih.slice(0, 7) === bulan ? dipilih : bawaan;

    const sel = [];
    for (let i = 0; i < offset; i += 1) sel.push(null);
    for (let t = 1; t <= jumlahHari; t += 1) sel.push(t);
    while (sel.length % 7 !== 0) sel.push(null);

    const agendaHariIni = perTanggal[tanggalAktif] || [];
    const jumlah = { survey: 0, alat: 0, atp: 0 };
    agenda.forEach((item) => {
        if (jumlah[item.jenis] !== undefined) jumlah[item.jenis] += 1;
    });

    const sedangBulanIni = bulan === hariIniStr.slice(0, 7);

    return (
        <>
            <Head title="Kalender Jadwal - Web CME" />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Kalender Jadwal' },
            ]} />

            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines">
                    Kalender Jadwal
                </h1>
                <p className="text-sm text-gray-500 font-headlines mt-1">
                    Jadwal survey ODC, tenggat pengembalian alat, dan periode ATP dalam satu tampilan bulanan.
                </p>
            </div>

            {/* Mobile: dua kartu per baris agar bentuknya persegi seperti ATP/Survey */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                <MetricCard
                    title="Total Agenda"
                    value={agenda.length}
                    badge={`${NAMA_BULAN[bulanKe - 1]} ${tahun}`}
                    note="Seluruh agenda pada bulan ini"
                />
                <MetricCard title="Survey ODC" value={jumlah.survey} note="Tanggal pelaksanaan survey" />
                <MetricCard title="Tenggat Alat" value={jumlah.alat} note="Rencana kembali peminjaman aktif" />
                <MetricCard title="Periode ATP" value={jumlah.atp} note="Tanggal audit ATP" />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <Link
                        href={`/kalender?bulan=${navigasi.sebelumnya}`}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-surface text-gray-600 transition hover:border-primary hover:text-primary sm:h-9 sm:w-9"
                        title="Bulan sebelumnya"
                    >
                        <ChevronLeft className="h-4 w-4 stroke-[1.5]" />
                    </Link>
                    <Link
                        href={`/kalender?bulan=${navigasi.berikutnya}`}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-surface text-gray-600 transition hover:border-primary hover:text-primary sm:h-9 sm:w-9"
                        title="Bulan berikutnya"
                    >
                        <ChevronRight className="h-4 w-4 stroke-[1.5]" />
                    </Link>
                    <div className="ml-1 text-sm font-semibold text-gray-900">
                        {NAMA_BULAN[bulanKe - 1]} {tahun}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex flex-wrap items-center gap-3 mr-2">
                        {Object.entries(JENIS).map(([key, jenis]) => (
                            <span key={key} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                                <span className={`h-2 w-2 rounded-full ${jenis.dot}`} />
                                {jenis.label}
                            </span>
                        ))}
                    </div>
                    {!sedangBulanIni && (
                        <Link
                            href="/kalender"
                            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-gray-200 bg-surface px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-600 transition hover:border-primary hover:text-primary sm:min-h-0"
                        >
                            <CalendarDays className="h-3.5 w-3.5 stroke-[1.5]" />
                            Bulan Ini
                        </Link>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <Card className="min-w-0 xl:col-span-2" title="Kalender Bulanan">
                    <div className="mb-1 grid grid-cols-7 gap-0.5 sm:gap-1">
                        {HARI.map((hari) => (
                            <div key={hari} className="py-1 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                {hari}
                            </div>
                        ))}
                    </div>
                    {/* Jarak dan tinggi sel diperkecil di ponsel supaya 7 kolom tetap muat tanpa geser horizontal. */}
                    <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                        {sel.map((tanggal, index) => {
                            if (tanggal === null) {
                                return <div key={`kosong-${index}`} className="min-h-[52px] rounded-lg bg-gray-50/60 sm:min-h-[76px]" />;
                            }
                            const tanggalStr = `${bulan}-${String(tanggal).padStart(2, '0')}`;
                            const daftar = perTanggal[tanggalStr] || [];
                            const aktif = tanggalStr === tanggalAktif;
                            const iniHariIni = tanggalStr === hariIniStr;
                            const ringkas = ['survey', 'alat', 'atp']
                                .map((jenis) => ({ jenis, n: daftar.filter((item) => item.jenis === jenis).length }))
                                .filter((row) => row.n > 0);

                            return (
                                <button
                                    key={tanggalStr}
                                    type="button"
                                    onClick={() => setDipilih(tanggalStr)}
                                    className={`min-h-[52px] rounded-lg border p-1 text-left align-top transition sm:min-h-[76px] sm:p-1.5 ${
                                        aktif
                                            ? 'border-primary bg-primary/10 ring-1 ring-primary'
                                            : 'border-gray-200 bg-surface hover:border-primary/50 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`text-xs font-bold ${iniHariIni ? 'text-primary' : 'text-gray-700'}`}>
                                            {tanggal}
                                        </span>
                                        {/* Label "Hari ini" disembunyikan di ponsel karena melebarkan sel 7 kolom. */}
                                        {iniHariIni && (
                                            <>
                                                <span className="h-1.5 w-1.5 rounded-full bg-primary sm:hidden" />
                                                <span className="hidden text-[9px] font-bold uppercase tracking-wider text-primary sm:inline">Hari ini</span>
                                            </>
                                        )}
                                    </div>
                                    {/* Ponsel: titik penanda saja. Desktop: chip berhitung seperti semula. */}
                                    <div className="mt-1.5 flex flex-wrap items-center gap-1 sm:hidden">
                                        {ringkas.map(({ jenis }) => (
                                            <span key={jenis} className={`h-1.5 w-1.5 rounded-full ${JENIS[jenis].dot}`} />
                                        ))}
                                    </div>
                                    <div className="mt-1.5 hidden flex-wrap items-center gap-1 sm:flex">
                                        {ringkas.map(({ jenis, n }) => (
                                            <span
                                                key={jenis}
                                                className={`inline-flex items-center gap-1 rounded px-1 py-0.5 text-[9px] font-bold ${JENIS[jenis].chip}`}
                                            >
                                                <span className={`h-1.5 w-1.5 rounded-full ${JENIS[jenis].dot}`} />
                                                {n}
                                            </span>
                                        ))}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </Card>

                <Card title={`Agenda ${labelTanggal(tanggalAktif)}`}>
                    {agendaHariIni.length === 0 ? (
                        <div className="py-10 text-center text-xs text-gray-400">
                            Tidak ada agenda pada tanggal ini.
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {agendaHariIni.map((item, index) => {
                                const jenis = JENIS[item.jenis] || JENIS.survey;
                                const Icon = jenis.icon;
                                return (
                                    <li key={`${item.href}-${index}`}>
                                        <Link
                                            href={item.href}
                                            className="flex min-h-[44px] items-start gap-2.5 rounded-lg border border-gray-200 bg-surface p-3 transition hover:border-primary hover:bg-gray-50"
                                        >
                                            <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${jenis.chip}`}>
                                                <Icon className="h-3.5 w-3.5 stroke-[1.5]" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-xs font-bold text-gray-900">{item.judul}</span>
                                                <span className="block truncate text-[11px] text-gray-500">{item.keterangan}</span>
                                                <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${jenis.chip}`}>
                                                    {jenis.label}
                                                </span>
                                            </span>
                                            <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 stroke-[1.5] text-gray-300" />
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Card>
            </div>
        </>
    );
}

Index.layout = page => <AppLayout children={page} />;
