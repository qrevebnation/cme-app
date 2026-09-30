import React, { useEffect, useRef, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import DataTable from '../../Components/DataTable';
import DateRangePicker from '../../Components/DateRangePicker';
import Breadcrumbs from '../../Components/Breadcrumbs';
import CompactList from '../../Components/CompactList';
import Pagination from '../../Components/Pagination';
import Search from '../../Components/Search';

/** Warna badge per jenis aksi: hapus/kegagalan merah, tambah/masuk hijau, sisanya netral-biru. */
const warnaAksi = {
    hapus: 'bg-rose-50 text-rose-800 border-rose-100',
    gagal: 'bg-rose-50 text-rose-800 border-rose-100',
    tambah: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    masuk: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    ubah: 'bg-amber-50 text-amber-800 border-amber-100',
    keluar: 'bg-slate-50 text-slate-700 border-slate-200',
    kembali: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    cetak: 'bg-indigo-50 text-indigo-800 border-indigo-100',
    ekspor: 'bg-indigo-50 text-indigo-800 border-indigo-100',
};

function BadgeAksi({ aksi }) {
    const kunci = String(aksi || '').toLowerCase();
    return (
        <span
            className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                warnaAksi[kunci] || 'bg-gray-50 text-gray-600 border-gray-200'
            }`}
        >
            {aksi || '-'}
        </span>
    );
}

const kolomLog = [
    {
        id: 'waktu',
        accessorFn: (log) => log.waktu || log.created_at || '',
        header: 'Waktu',
        cell: ({ getValue }) => <span className="text-gray-500 whitespace-nowrap">{getValue() || '-'}</span>,
        exportValue: (log) => log.waktu || log.created_at || '',
    },
    {
        id: 'pengguna',
        accessorFn: (log) => log.pengguna || log.username || '',
        header: 'Pengguna',
        cell: ({ getValue }) => <span className="font-bold text-gray-900">{getValue() || '-'}</span>,
        exportValue: (log) => log.pengguna || log.username || '',
    },
    {
        // Satu kolom gabungan: badge aksi + nama modul (login maupun aktivitas tulis).
        id: 'aktivitas',
        accessorFn: (log) => `${log.aksi || ''} ${log.modul || ''}`.trim(),
        header: 'Aktivitas',
        cell: ({ row }) => (
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
                <BadgeAksi aksi={row.original.aksi} />
                <span className="text-gray-700">{row.original.modul || '-'}</span>
            </span>
        ),
        exportValue: (log) => [log.aksi, log.modul].filter(Boolean).join(' '),
    },
    {
        id: 'keterangan',
        accessorFn: (log) => log.keterangan || '',
        header: 'Keterangan',
        cell: ({ getValue }) => <span className="text-gray-700">{getValue() || '-'}</span>,
        exportValue: (log) => log.keterangan || '',
    },
    {
        id: 'ip_address',
        accessorFn: (log) => log.ip_address || '',
        header: 'Alamat IP',
        cell: ({ getValue }) => <span className="font-mono text-xs text-gray-600">{getValue() || '-'}</span>,
        exportValue: (log) => log.ip_address || '',
    },
    {
        // Digabung supaya kolom tidak melebar: perangkat, peramban, sistem operasi.
        id: 'perangkat',
        accessorFn: (log) => [log.device, log.browser, log.os].filter(Boolean).join(' · '),
        header: 'Perangkat / Peramban',
        cell: ({ row }) => (
            <span className="text-gray-700">
                {[row.original.device, row.original.browser, row.original.os].filter(Boolean).join(' · ') || '-'}
            </span>
        ),
        exportValue: (log) => [log.device, log.browser, log.os].filter(Boolean).join(' · '),
    },
];

const chipJenis = [
    { nilai: 'semua', label: 'Semua' },
    { nilai: 'login', label: 'Login' },
    { nilai: 'aktivitas', label: 'Aktivitas' },
];

export default function Logs({
    data = [],
    total = 0,
    halamanSekarang = 1,
    totalHalaman = 1,
    filter = {},
}) {
    const perHalaman = filter.perHalaman || 50;

    // Nilai awal penyaring datang dari server; tiap perubahan dikirim balik
    // sebagai permintaan baru, jadi penyaringan dan paginasi murni di server.
    const [periode, setPeriode] = useState({ dari: filter.dari || '', sampai: filter.sampai || '' });
    const [jenis, setJenis] = useState(filter.jenis || 'semua');
    const [cari, setCari] = useState(filter.q || '');

    const muat = (ubah, pertahankanGulir = true) => {
        router.get('/users-logs', {
            page: ubah.page ?? halamanSekarang,
            jenis: ubah.jenis ?? jenis,
            q: ubah.q ?? cari,
            dari: ubah.dari ?? periode.dari,
            sampai: ubah.sampai ?? periode.sampai,
        }, { preserveState: true, preserveScroll: pertahankanGulir, replace: true });
    };

    // Kotak cari baru dikirim ke server 350 ms setelah ketikan terakhir;
    // pemanggilan pertama dilewati karena data server sudah dimuat di halaman.
    const cariPertama = useRef(true);

    useEffect(() => {
        if (cariPertama.current) {
            cariPertama.current = false;
            return;
        }

        const jeda = setTimeout(() => muat({ page: 1, q: cari }), 350);

        return () => clearTimeout(jeda);
    }, [cari]);

    // Selaraskan chip & rentang tanggal dengan nilai yang dikembalikan server
    // (mis. saat tombol kembali peramban dipakai). Tidak menyentuh kotak cari
    // supaya ketikan yang sedang berjalan tidak direset oleh respons lama.
    useEffect(() => {
        const jenisServer = filter.jenis || 'semua';
        const dariServer = filter.dari || '';
        const sampaiServer = filter.sampai || '';

        setJenis((sebelum) => (sebelum === jenisServer ? sebelum : jenisServer));
        setPeriode((sebelum) => (
            sebelum.dari === dariServer && sebelum.sampai === sampaiServer
                ? sebelum
                : { dari: dariServer, sampai: sampaiServer }
        ));
    }, [filter.jenis, filter.dari, filter.sampai]);

    return (
        <>
            <Head title="Log Aktivitas - Web CME" />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Log Aktivitas' }
            ]} />

            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines">
                    Log Aktivitas
                </h1>
                <p className="text-sm text-gray-500 font-headlines mt-1">
                    Riwayat masuk sistem dan aksi tulis pengguna, lengkap dengan alamat IP serta perangkat.
                </p>
            </div>

            {/* key memaksa pemilih tanggal memuat ulang nilai saat rentang berubah dari server. */}
            <DateRangePicker
                key={`${periode.dari}|${periode.sampai}`}
                dari={periode.dari}
                sampai={periode.sampai}
                onChange={(dari, sampai) => {
                    setPeriode({ dari, sampai });
                    muat({ dari, sampai, page: 1 });
                }}
            />

            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                {/* Chip jenis: setiap klik meminta data baru ke server. */}
                <div className="flex flex-wrap gap-2" role="group" aria-label="Filter jenis log">
                    {chipJenis.map((chip) => (
                        <button
                            key={chip.nilai}
                            type="button"
                            aria-pressed={jenis === chip.nilai}
                            onClick={() => {
                                setJenis(chip.nilai);
                                muat({ jenis: chip.nilai, page: 1 });
                            }}
                            // Mobile: tinggi 44 px agar nyaman disentuh; desktop kembali ringkas.
                            className={`h-11 rounded-full border px-4 text-xs font-semibold transition-colors md:h-8 ${
                                jenis === chip.nilai
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border bg-surface text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            {chip.label}
                        </button>
                    ))}
                </div>

                {/* Kotak cari dikirim ke server (debounce 350 ms); di layar sentuh tingginya 44 px. */}
                <div className="max-lg:[&_input]:h-11 lg:w-72">
                    <Search
                        value={cari}
                        onChange={setCari}
                        placeholder="Cari pengguna, keterangan, atau modul..."
                    />
                </div>
            </div>

            {/* Mobile: daftar rapat satu baris per log, tabel dilewati agar tidak digeser horizontal. */}
            <div className="xl:hidden mt-3">
                <CompactList
                    rows={data}
                    kunci={(log) => `${log.jenis || 'login'}-${log.waktu}-${log.pengguna}-${log.keterangan || ''}`}
                    judul={(log) => log.pengguna || '-'}
                    nuansa={(log) => <BadgeAksi aksi={log.aksi} />}
                    meta={(log) => [log.waktu, log.modul, log.keterangan, log.ip_address, log.device, log.browser]}
                    kosong="Belum ada log aktivitas untuk filter ini"
                />
            </div>

            {/* Pencarian & paginasi bawaan DataTable disembunyikan: keduanya sudah
                ditangani server, jadi DataTable hanya menggambar baris yang diterima. */}
            <div className="hidden xl:block mt-4 [&>div>div:first-child_input]:hidden [&>div>div:last-child]:hidden">
                <DataTable
                    columns={kolomLog}
                    data={data}
                    perHalaman={perHalaman}
                    cariPlaceholder="Cari log..."
                    namaEkspor="log-aktivitas"
                    modulEkspor="Log Aktivitas"
                    kosongPesan="Belum ada log aktivitas untuk filter ini"
                />
            </div>

            <Pagination
                currentPage={halamanSekarang}
                totalPages={totalHalaman}
                onPageChange={(halaman) => muat({ page: halaman }, false)}
                totalItems={total}
                itemsPerPage={perHalaman}
            />
        </>
    );
}

Logs.layout = page => <AppLayout children={page} />;
