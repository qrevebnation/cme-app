import React, { useEffect, useRef, useState } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import axios from 'axios';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/Card';
import Table from '../../Components/Table';
import CompactList from '../../Components/CompactList';
import Button from '../../Components/Button';
import Input from '../../Components/Input';
import Select from '../../Components/Select';
import Modal from '../../Components/Modal';
import PhotoDropzone from '../../Components/PhotoDropzone';
import CameraCapture from '../../Components/CameraCapture';
import SearchInput, { filterData } from '../../Components/Search';
import Pagination from '../../Components/Pagination';
import PageTabs from '../../Components/PageTabs';
import MetricCard from '../../Components/MetricCard';
import Breadcrumbs from '../../Components/Breadcrumbs';
import ImportCsv from '../../Components/ImportCsv';
import {
    Package,
    ArrowUpRight,
    ArrowDownLeft,
    Plus,
    Palette,
    Search,
    X,
    History,
    FileSpreadsheet
} from 'lucide-react';

const MAX_FOTO = 4;

/** Badge status stok: dipakai kolom Status tabel dan nuansa daftar di ponsel. */
function BadgeStatusStok({ rendah }) {
    return rendah ? (
        <span className="inline-block shrink-0 bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded">
            LOW LIMIT
        </span>
    ) : (
        <span className="inline-block shrink-0 bg-emerald-50 border border-emerald-250 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
            TERSEDIA
        </span>
    );
}
/** Badge jenis barang: consumable vs tool, di tabel + daftar ponsel. */
function BadgeJenis({ jenis }) {
    const isTool = jenis === 'tool';
    return (
        <span className={`inline-block shrink-0 border text-[10px] font-bold px-2 py-0.5 rounded ${isTool ? 'bg-sky-50 border-sky-200 text-sky-800' : 'bg-teal-50 border-teal-200 text-teal-800'}`}>
            {isTool ? 'TOOL' : 'CONSUMABLE'}
        </span>
    );
}

export default function Stock({ items, categories, totals, filters, totalMasukCount, totalKeluarCount, totalPeminjamanAktif = 0 }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const handleSearchChange = (query) => {
        setSearchQuery(query);
        setCurrentPage(1);
    };

    const filteredItems = filterData(items, searchQuery);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Ringkasan kartu dihitung dari props yang sudah ada (items & totals);
    // ambang stok menipis mengikuti logika kolom Status (stok <= min_stok).
    const totalStokTampil = items.reduce((jumlah, item) => jumlah + (item.stok ?? 0), 0);
    const variasiMenipis = items.filter((item) => item.stok <= item.min_stok).length;
    const kategoriBerstok = Object.values(totals ?? {}).filter((jumlah) => jumlah > 0).length;

    // Modal controllers state
    const [showMasukModal, setShowMasukModal] = useState(false);
    const [showKeluarModal, setShowKeluarModal] = useState(false);

    // Palet perintah (Ctrl+K) dapat langsung membuka formulir transaksi lewat
    // tautan /gudang?aksi=masuk atau /gudang?aksi=keluar.
    useEffect(() => {
        if (filters?.aksi === 'masuk') setShowMasukModal(true);
        if (filters?.aksi === 'keluar') setShowKeluarModal(true);
    }, [filters?.aksi]);

    const jenisAktif = filters?.jenis || 'consumable';

    // Rentang ekspor rekap: filter tanggal halaman ini bila ada, kalau tidak
    // bulan berjalan. Batas akhir = hari terakhir bulan (tanggal 0 bulan berikutnya).
    const hariIni = new Date();
    const bulanIni = `${hariIni.getFullYear()}-${String(hariIni.getMonth() + 1).padStart(2, '0')}`;
    const dariEkspor = filters?.dari || `${bulanIni}-01`;
    const sampaiEkspor = filters?.sampai
        || `${bulanIni}-${String(new Date(hariIni.getFullYear(), hariIni.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
    const tautanEkspor = (modul) => `/ekspor/${modul}?` + new URLSearchParams({
        dari: dariEkspor,
        sampai: sampaiEkspor,
        type: 'csv',
    }).toString();

    // Tautan tab tetap membawa filter pencarian/kategori yang sedang aktif.
    const tautanJenis = (jenis) => {
        const parameter = new URLSearchParams({ jenis });
        if (filters?.cari) parameter.set('cari', filters.cari);
        if (filters?.kategori) parameter.set('kategori', filters.kategori);
        return `/gudang?${parameter.toString()}`;
    };
    const [showKatModal, setShowKatModal] = useState(false);
    const [showTipeModal, setShowTipeModal] = useState(false);
    const [showColorModal, setShowColorModal] = useState(false);

    // Color-coded label state
    const [categoryColors, setCategoryColors] = useState(() => {
        const saved = localStorage.getItem('gudang_category_colors');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) { }
        }
        return {
            'MCB': '#2563EB',
            // Putih di atas warna kategori: 5 warna default lama gagal AA (2,94-3,77:1),
            // digelapkan satu tingkat agar teks putih 10px minimal 4,5:1.
            'PDU': '#15803D',
            'Recti': '#A16207',
            'Inverter': '#DC2626',
            'Baterai': '#7C3AED',
            'UPS': '#0E7490',
            'Kabel': '#C2410C',
            'Konektor': '#DB2777',
            'Busbar': '#475569',
            'Panel': '#047857',
            'Grounding': '#4F46E5',
        };
    });

    const updateCategoryColor = (category, color) => {
        const updated = { ...categoryColors, [category]: color };
        setCategoryColors(updated);
        localStorage.setItem('gudang_category_colors', JSON.stringify(updated));
    };

    // Forms initialization
    const masukForm = useForm({
        judul: '',
        kategori_batch: categories[0] || '',
        tanggal: new Date().toISOString().split('T')[0],
        supplier: '',
        penerima: '',
        lokasi: '',
        keterangan: '',
        items: [], // empty list by default as requested
        foto: [],
        jenis: jenisAktif,
    });

    const keluarForm = useForm({
        judul: '',
        kategori_batch: categories[0] || '',
        tanggal: new Date().toISOString().split('T')[0],
        pengambil: '',
        jabatan: '',
        lokasi_tujuan: '',
        keperluan: '',
        proyek: '',
        tujuan: '',
        keterangan: '',
        items: [], // empty list by default for outgoing too
        foto: [],
        jenis: jenisAktif,
    });

    const katForm = useForm({ kategori: '', satuan: 'Pcs', jenis: jenisAktif });
    const tipeForm = useForm({ kategori: categories[0] || '', tipe: '', merek: '', jenis: jenisAktif });
    // Foto nota/surat jalan: berkas diunggah ke temp dulu, lalu disimpan sebagai
    // { path, url, name } di data.foto agar struktur kirim tetap sama seperti dulu.
    const formFoto = { masuk: masukForm, keluar: keluarForm };
    const berkasFotoRef = useRef({ masuk: [], keluar: [] });
    const unggahanFotoRef = useRef({ masuk: new Map(), keluar: new Map() });
    const [berkasFoto, setBerkasFoto] = useState({ masuk: [], keluar: [] });
    const [unggahAktif, setUnggahAktif] = useState({ masuk: false, keluar: false });

    // Susun ulang data.foto dari berkas yang masih tersisa supaya berkas yang
    // dihapus dari pratinjau ikut hilang dari data kirim.
    const sinkronkanFoto = (jenis) => {
        const daftar = berkasFotoRef.current[jenis];
        formFoto[jenis].setData((prev) => ({
            ...prev,
            foto: daftar.map((file) => unggahanFotoRef.current[jenis].get(file)).filter(Boolean),
        }));
    };

    const ubahFoto = async (jenis, files) => {
        const daftar = files.slice(0, MAX_FOTO);
        berkasFotoRef.current[jenis] = daftar;
        setBerkasFoto((prev) => ({ ...prev, [jenis]: daftar }));
        sinkronkanFoto(jenis);

        const tambahan = daftar.filter((file) => !unggahanFotoRef.current[jenis].has(file));
        if (tambahan.length === 0) return;

        setUnggahAktif((prev) => ({ ...prev, [jenis]: true }));

        for (const file of tambahan) {
            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await axios.post('/api/upload-temp', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                unggahanFotoRef.current[jenis].set(file, {
                    path: response.data.path,
                    url: response.data.url,
                    name: file.name
                });
            } catch (err) {
                alert(err.response?.data?.message || err.response?.data?.errors?.image?.[0] || 'Gagal mengunggah berkas.');
            }
        }

        setUnggahAktif((prev) => ({ ...prev, [jenis]: false }));
        sinkronkanFoto(jenis);
    };

    // Hasil jepretan kamera masuk ke daftar berkas nota yang sama.
    const jepretFoto = (jenis, file) => {
        ubahFoto(jenis, [...berkasFotoRef.current[jenis], file]);
    };

    const bersihkanFoto = (jenis) => {
        berkasFotoRef.current[jenis] = [];
        unggahanFotoRef.current[jenis].clear();
        setBerkasFoto((prev) => ({ ...prev, [jenis]: [] }));
        formFoto[jenis].setData('foto', []);
    };

    // Item row helpers for transactions
    const addMasukItem = () => {
        masukForm.setData('items', [...masukForm.data.items, { kategori: '', tipe: '', jumlah: '' }]);
    };

    const removeMasukItem = (idx) => {
        const next = masukForm.data.items.filter((_, i) => i !== idx);
        masukForm.setData('items', next);
    };

    const addKeluarItem = () => {
        keluarForm.setData('items', [...keluarForm.data.items, { kategori: '', tipe: '', jumlah: '' }]);
    };

    const removeKeluarItem = (idx) => {
        const next = keluarForm.data.items.filter((_, i) => i !== idx);
        keluarForm.setData('items', next);
    };

    const handleMasukSubmit = (e) => {
        e.preventDefault();
        if (masukForm.data.items.length === 0) {
            alert('Harap tambahkan minimal 1 item untuk dicatat.');
            return;
        }
        // Jenis tab aktif ditempel saat kirim agar upsert masuk tab benar.
        masukForm.transform((data) => ({ ...data, jenis: jenisAktif }));
        masukForm.post('/gudang/masuk', {
            onSuccess: () => {
                setShowMasukModal(false);
                masukForm.reset();
                bersihkanFoto('masuk');
            }
        });
    };

    const handleKeluarSubmit = (e) => {
        e.preventDefault();
        if (keluarForm.data.items.length === 0) {
            alert('Harap tambahkan minimal 1 item untuk dicatat.');
            return;
        }
        // Verify stock limits
        const hasInvalidQty = keluarForm.data.items.some(item => {
            const matched = items.find(it => it.kategori === item.kategori && it.tipe === item.tipe);
            const stock = matched ? matched.stok : 0;
            const qty = parseInt(item.jumlah);
            return isNaN(qty) || qty > stock || qty < 0;
        });
        if (hasInvalidQty) {
            alert('Terdapat kesalahan input jumlah barang keluar (melebihi stok tersedia atau kurang dari 0).');
            return;
        }
        keluarForm.transform((data) => ({ ...data, jenis: jenisAktif }));
        keluarForm.post('/gudang/keluar', {
            onSuccess: () => {
                setShowKeluarModal(false);
                keluarForm.reset();
                bersihkanFoto('keluar');
            }
        });
    };

    const handleKatSubmit = (e) => {
        e.preventDefault();
        katForm.transform((data) => ({ ...data, jenis: jenisAktif }));
        katForm.post('/gudang/kategori', {
            onSuccess: () => {
                setShowKatModal(false);
                katForm.reset();
            }
        });
    };

    const handleTipeSubmit = (e) => {
        e.preventDefault();
        tipeForm.transform((data) => ({ ...data, jenis: jenisAktif }));
        tipeForm.post('/gudang/tipe', {
            onSuccess: () => {
                setShowTipeModal(false);
                tipeForm.reset();
            }
        });
    };

    return (
        <>
            <Head title="Inventory - Web CME" />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Inventory' }
            ]} />

            <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines">
                        Inventory Gudang
                    </h1>
                    <p className="text-sm text-gray-500 font-headlines mt-1">
                        Monitoring kuantitas material CME, pengeluaran logistik, dan incoming supply ledger.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link
                        href={jenisAktif === 'tool' ? '/tools' : '/gudang/history'}
                        className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] sm:min-h-0 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold uppercase rounded-lg transition shadow-sm"
                    >
                        <History className="h-4 w-4 stroke-[1.5]" />
                        {jenisAktif === 'tool' ? 'Riwayat Peminjaman' : 'Riwayat Transaksi'}
                    </Link>
                </div>
            </div>

            {/* Aksi dipindah keluar kartu metrik: kartu hanya judul/angka/badge/
                catatan, tombolnya dikumpulkan di satu baris dekat judul halaman. */}
            <div className="mb-4 flex flex-wrap gap-2">
                {jenisAktif === 'consumable' && (
                    <>
                        <Button
                            onClick={() => setShowKatModal(true)}
                            variant="secondary"
                            className="h-11 sm:h-9 gap-1.5"
                            title="Tambah Kategori"
                        >
                            <Plus className="h-4 w-4 stroke-[1.5]" />
                            Tambah Kategori
                        </Button>
                        <Button
                            onClick={() => setShowTipeModal(true)}
                            variant="outline"
                            className="h-11 sm:h-9 gap-1.5"
                            title="Tambah Tipe"
                        >
                            <Plus className="h-4 w-4 stroke-[1.5]" />
                            Tambah Tipe
                        </Button>
                        <Button
                            onClick={() => {
                                masukForm.setData('items', []);
                                bersihkanFoto('masuk');
                                setShowMasukModal(true);
                            }}
                            variant="primary"
                            className="h-11 sm:h-9 gap-1.5"
                        >
                            <ArrowDownLeft className="h-4 w-4 stroke-[1.5]" />
                            Catat Barang Masuk
                        </Button>
                        <Button
                            onClick={() => {
                                keluarForm.setData('items', []);
                                bersihkanFoto('keluar');
                                setShowKeluarModal(true);
                            }}
                            variant="secondary"
                            className="h-11 sm:h-9 gap-1.5"
                        >
                            <ArrowUpRight className="h-4 w-4 stroke-[1.5]" />
                            Catat Barang Keluar
                        </Button>
                        {/* Rekap berkas dibentuk halaman lama; dibuka di tab baru
                            supaya halaman stok tidak ikut tergantikan unduhan. */}
                        <a
                            href={tautanEkspor('gudang-masuk')}
                            target="_blank"
                            rel="noreferrer"
                            title={`Ekspor rekap barang masuk ${dariEkspor} s/d ${sampaiEkspor}`}
                            className="inline-flex h-11 sm:h-9 items-center justify-center gap-1.5 px-4 border border-border bg-surface text-text text-xs font-bold uppercase tracking-widest rounded-md transition hover:text-primary hover:border-primary"
                        >
                            <FileSpreadsheet className="h-4 w-4 stroke-[1.5]" />
                            Ekspor BM
                        </a>
                        <a
                            href={tautanEkspor('gudang-keluar')}
                            target="_blank"
                            rel="noreferrer"
                            title={`Ekspor rekap barang keluar ${dariEkspor} s/d ${sampaiEkspor}`}
                            className="inline-flex h-11 sm:h-9 items-center justify-center gap-1.5 px-4 border border-border bg-surface text-text text-xs font-bold uppercase tracking-widest rounded-md transition hover:text-primary hover:border-primary"
                        >
                            <FileSpreadsheet className="h-4 w-4 stroke-[1.5]" />
                            Ekspor BK
                        </a>
                    </>
                )}
                <ImportCsv jenisAktif={jenisAktif} />
                {/* Tab Tools: tautan peminjaman yang dulu di dalam kartu, label
                    diberi nama modul agar tidak kembar dengan tombol Riwayat di
                    kanan judul. */}
                {jenisAktif === 'tool' && (
                    <>
                        <Link
                            href="/tools"
                            className="inline-flex h-11 sm:h-9 items-center justify-center gap-1.5 px-4 border border-border bg-surface text-text text-xs font-bold uppercase tracking-widest rounded-md transition hover:text-primary hover:border-primary"
                        >
                            <History className="h-4 w-4 stroke-[1.5]" />
                            Peminjaman Tools
                        </Link>
                        <Link
                            href="/tools/baru"
                            className="inline-flex h-11 sm:h-9 items-center justify-center gap-1.5 px-4 border border-transparent bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest rounded-md transition hover:bg-primary/90"
                        >
                            <Plus className="h-4 w-4 stroke-[1.5]" />
                            Pinjam Tool
                        </Link>
                    </>
                )}
            </div>

            <PageTabs
                tabs={[
                    { label: 'Consumables', href: tautanJenis('consumable'), active: jenisAktif === 'consumable' },
                    { label: 'Tools', href: tautanJenis('tool'), active: jenisAktif === 'tool' },
                ]}
            />

            {/* WAREHOUSE METRIC CARDS */}
            {/* Mobile: dua kartu per baris agar bentuknya persegi seperti ATP/Survey */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                {jenisAktif === 'consumable' && (
                    <MetricCard
                        title="Kategori Aktif"
                        value={categories.length}
                        badge={`${kategoriBerstok} berstok`}
                        badgeTone="netral"
                        note="Grup barang yang dipakai form BM & BK"
                    />
                )}
                {jenisAktif === 'consumable' && (
                    <MetricCard
                        title="Total Variasi"
                        value={items.length}
                        badge={`${totalStokTampil} unit`}
                        badgeTone="netral"
                        note={variasiMenipis > 0 ? `${variasiMenipis} variasi di bawah min stok` : 'Semua variasi stok di atas min stok'}
                    />
                )}
                {jenisAktif === 'consumable' && (
                    <MetricCard
                        title="Barang Masuk (BM)"
                        value={totalMasukCount || 0}
                        badge="Form"
                        badgeTone="netral"
                        note="Penerimaan barang ke gudang tercatat"
                    />
                )}
                {jenisAktif === 'consumable' && (
                    <MetricCard
                        title="Barang Keluar (BK)"
                        value={totalKeluarCount || 0}
                        badge="Form"
                        badgeTone="netral"
                        note="Pengeluaran barang dari gudang tercatat"
                    />
                )}
                {jenisAktif === 'tool' && (
                    <MetricCard
                        title="Alat Tercatat"
                        value={items.length}
                        badge={`${totalStokTampil} unit`}
                        badgeTone="netral"
                        note={variasiMenipis > 0 ? `${variasiMenipis} alat di bawah min stok` : 'Semua alat di atas min stok'}
                    />
                )}
                {jenisAktif === 'tool' && (
                    <MetricCard
                        title="Peminjaman Tools"
                        value={totalPeminjamanAktif || 0}
                        badge={totalPeminjamanAktif > 0 ? 'dipinjam' : 'tersedia'}
                        badgeTone={totalPeminjamanAktif > 0 ? 'peringatan' : 'naik'}
                        note={totalPeminjamanAktif > 0 ? 'Alat belum dikembalikan ke gudang' : 'Tidak ada peminjaman aktif'}
                    />
                )}
            </div>

            {/* CONSOLIDATED MASTER STOCK TABLE */}
            <Card
                title="Daftar Stok Master"
                headerActions={
                    <Button onClick={() => setShowColorModal(true)} variant="outline" className="flex items-center gap-1.5 text-xs py-1 px-3">
                        <Palette className="h-4 w-4 stroke-[1.5]" />
                        Warna Kategori
                    </Button>
                }
            >
                <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3 mb-4">
                    <SearchInput value={searchQuery} onChange={handleSearchChange} />
                </div>

                {/* Mobile: daftar rapat agar 7 kolom tidak perlu digeser */}
                <div className="xl:hidden">
                    <CompactList
                        rows={paginatedItems}
                        kunci={(row) => row.id}
                        judul={(row) => row.nama || '-'}
                        nuansa={(row) => (<span className="inline-flex items-center gap-1"><BadgeJenis jenis={row.jenis} /><BadgeStatusStok rendah={row.stok <= row.min_stok} /></span>)}
                        meta={(row) => [row.kategori, row.tipe || '-', row.merek, (row.jenis === 'tool' ? 'tool' : 'consumable'), `stok ${row.stok} ${row.satuan}`]}
                        kosong="Tidak ada data barang terdaftar."
                    />
                </div>

                {/* Desktop: tabel 5 kolom rapat dipakai dari xl ke atas —
                    tipe/model & merek turun jadi baris kedua nama barang, satuan
                    menempel pada angka stok supaya kolom tidak boros. */}
                <div className="hidden xl:block">
                    <Table headers={['Nama Barang / Spesifikasi', 'Kategori', 'Jenis', 'Min Stok Limit', 'Stok Saat Ini', 'Status']}>
                        {paginatedItems.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-400 font-medium">
                                    Tidak ada data barang terdaftar.
                                </td>
                            </tr>
                        ) : (
                            paginatedItems.map((row) => {
                                const isLow = row.stok <= row.min_stok;
                                const badgeBgColor = categoryColors[row.kategori] || '#475569';
                                return (
                                    <tr key={row.id} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-2">
                                            <span className="block font-bold leading-4 text-gray-900">{row.nama}</span>
                                            <span className="block text-[10px] leading-3 text-gray-500">
                                                <span className="font-mono">{row.tipe || '-'}</span>
                                                {row.merek && <span className="text-gray-400"> · {row.merek}</span>}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            <span
                                                className="inline-block px-2.5 py-1 rounded text-white text-[10px] font-bold uppercase tracking-wider shadow-sm"
                                                style={{ backgroundColor: badgeBgColor }}
                                            >
                                                {row.kategori}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-center whitespace-nowrap">
                                            <BadgeJenis jenis={row.jenis} />
                                        </td>
                                        <td className="px-4 py-2 text-center font-semibold text-gray-400">{row.min_stok}</td>
                                        <td className={`px-4 py-2 text-center font-black whitespace-nowrap ${isLow ? 'text-rose-600' : 'text-gray-900'}`}>
                                            {row.stok} {row.satuan}
                                        </td>
                                        <td className="px-4 py-2 text-center whitespace-nowrap">
                                            <BadgeStatusStok rendah={isLow} />
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </Table>
                </div>

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filteredItems.length}
                    itemsPerPage={itemsPerPage}
                />
            </Card>

            {/* BARANG MASUK MODAL */}
            <Modal isOpen={showMasukModal} onClose={() => setShowMasukModal(false)} title="Catat Barang Masuk (BM)" size="max-w-4xl">
                <form onSubmit={handleMasukSubmit} className="space-y-4 text-xs font-body">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Judul Transaksi / Batch" value={masukForm.data.judul} onChange={(e) => masukForm.setData('judul', e.target.value)} placeholder="e.g. Supply MCB Q2" />
                        <Input label="Tanggal Terima" type="date" value={masukForm.data.tanggal} onChange={(e) => masukForm.setData('tanggal', e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Supplier / Vendor Pengirim" value={masukForm.data.supplier} onChange={(e) => masukForm.setData('supplier', e.target.value)} required placeholder="PT. Supplier Metal" />
                        <Input label="Penerima Gudang" value={masukForm.data.penerima} onChange={(e) => masukForm.setData('penerima', e.target.value)} required placeholder="Nama checker" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Lokasi Rak / Blok" value={masukForm.data.lokasi} onChange={(e) => masukForm.setData('lokasi', e.target.value)} placeholder="Rak A1" />
                        <div className="w-full">
                            <label className="block font-medium text-xs text-gray-700 mb-1">Keterangan / Memo</label>
                            <textarea value={masukForm.data.keterangan} onChange={(e) => masukForm.setData('keterangan', e.target.value)} className="w-full border border-gray-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>
                    </div>
                    <div className="w-full">
                        <div className="flex items-center justify-between mb-1">
                            <label className="block font-medium text-xs text-gray-700">
                                Foto Nota / Surat Jalan (maks {MAX_FOTO})
                            </label>
                            {unggahAktif.masuk && <span className="text-[10px] text-gray-400">Mengunggah...</span>}
                        </div>
                        <PhotoDropzone
                            files={berkasFoto.masuk}
                            onChange={(files) => ubahFoto('masuk', files)}
                            maxFiles={MAX_FOTO}
                            label=""
                            hint="Tarik foto nota ke sini atau klik untuk memilih"
                        />
                        <div className="mt-2">
                            <CameraCapture
                                onCapture={(file) => jepretFoto('masuk', file)}
                                disabled={berkasFoto.masuk.length >= MAX_FOTO}
                            />
                        </div>
                    </div>

                    {/* Multiple items adding grid */}
                    <div className="border-t pt-4 space-y-3">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-gray-900 text-sm">List Barang Masuk</h4>
                            <Button type="button" onClick={addMasukItem} variant="outline" className="py-1 px-3 text-xs flex items-center gap-1">
                                <Plus className="h-3.5 w-3.5" /> Tambah Baris
                            </Button>
                        </div>

                        {masukForm.data.items.length === 0 ? (
                            <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                                <Package className="h-8 w-8 mx-auto text-gray-300 stroke-[1.5] mb-2" />
                                <p className="text-gray-400 text-xs">Belum ada item ditambahkan. Klik "+ Tambah Baris" di atas.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {masukForm.data.items.map((item, idx) => {
                                    const specsForCat = items.filter(it => it.kategori === item.kategori && it.tipe).map(it => it.tipe);
                                    const uniqueSpecs = [...new Set(specsForCat)];
                                    const matched = items.find(it => it.kategori === item.kategori && it.tipe === item.tipe);
                                    const stock = matched ? matched.stok : 0;

                                    const isQtyDisabled = !item.kategori || !item.tipe;
                                    let qtyPlaceholder = "Pilih Kategori";
                                    if (item.kategori && !item.tipe) {
                                        qtyPlaceholder = "Pilih Tipe";
                                    } else if (item.kategori && item.tipe) {
                                        qtyPlaceholder = `Stok saat ini: ${stock}`;
                                    }

                                    return (
                                        <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end bg-gray-50 p-3 rounded-lg border border-gray-200 relative">
                                            <Select
                                                label="Kategori"
                                                value={item.kategori}
                                                onChange={(e) => {
                                                    const next = [...masukForm.data.items];
                                                    next[idx].kategori = e.target.value;
                                                    next[idx].tipe = '';
                                                    next[idx].jumlah = '';
                                                    masukForm.setData('items', next);
                                                }}
                                                options={categories}
                                                placeholder="Pilih Kategori..."
                                                required
                                            />

                                            <Select
                                                label="Tipe / Spesifikasi"
                                                value={item.tipe}
                                                onChange={(e) => {
                                                    const next = [...masukForm.data.items];
                                                    next[idx].tipe = e.target.value;
                                                    next[idx].jumlah = '';
                                                    masukForm.setData('items', next);
                                                }}
                                                options={uniqueSpecs}
                                                placeholder={item.kategori ? "Pilih Tipe..." : "Pilih Kategori"}
                                                disabled={!item.kategori}
                                                required
                                            />

                                            <div className="flex gap-2 items-end">
                                                <div className="flex-grow">
                                                    <Input
                                                        label="Jumlah Masuk"
                                                        type="number"
                                                        min="1"
                                                        value={item.jumlah}
                                                        onChange={(e) => {
                                                            const next = [...masukForm.data.items];
                                                            next[idx].jumlah = e.target.value;
                                                            masukForm.setData('items', next);
                                                        }}
                                                        placeholder={qtyPlaceholder}
                                                        disabled={isQtyDisabled}
                                                        required
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeMasukItem(idx)}
                                                    className="p-2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition border border-transparent hover:border-red-200 mb-1"
                                                    title="Hapus Baris"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="border-t pt-4 flex justify-end gap-2">
                        <Button type="submit" variant="primary" processing={masukForm.processing}>Simpan Transaksi</Button>
                        <Button type="button" variant="outline" onClick={() => setShowMasukModal(false)}>Batal</Button>
                    </div>
                </form>
            </Modal>

            {/* BARANG KELUAR MODAL */}
            <Modal isOpen={showKeluarModal} onClose={() => setShowKeluarModal(false)} title="Catat Barang Keluar (BK)" size="max-w-4xl">
                <form onSubmit={handleKeluarSubmit} className="space-y-4 text-xs font-body">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Judul Pekerjaan / Proyek" value={keluarForm.data.judul} onChange={(e) => keluarForm.setData('judul', e.target.value)} placeholder="Pekerjaan Genset Site Jagakarsa" />
                        <Input label="Tanggal Rilis" type="date" value={keluarForm.data.tanggal} onChange={(e) => keluarForm.setData('tanggal', e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Nama Pengambil / Koordinator" value={keluarForm.data.pengambil} onChange={(e) => keluarForm.setData('pengambil', e.target.value)} required placeholder="Budi Santoso" />
                        <Input label="Jabatan Pengambil" value={keluarForm.data.jabatan} onChange={(e) => keluarForm.setData('jabatan', e.target.value)} placeholder="Subcon Lead" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Site Tujuan / Delivery" value={keluarForm.data.lokasi_tujuan} onChange={(e) => keluarForm.setData('lokasi_tujuan', e.target.value)} required placeholder="Site JGK-012" />
                        <div className="w-full">
                            <label className="block font-medium text-xs text-gray-700 mb-1">Keperluan / Keterangan</label>
                            <textarea value={keluarForm.data.keterangan} onChange={(e) => keluarForm.setData('keterangan', e.target.value)} className="w-full border border-gray-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none" />
                        </div>
                    </div>
                    <div className="w-full">
                        <div className="flex items-center justify-between mb-1">
                            <label className="block font-medium text-xs text-gray-700">
                                Foto Nota / Surat Jalan (maks {MAX_FOTO})
                            </label>
                            {unggahAktif.keluar && <span className="text-[10px] text-gray-400">Mengunggah...</span>}
                        </div>
                        <PhotoDropzone
                            files={berkasFoto.keluar}
                            onChange={(files) => ubahFoto('keluar', files)}
                            maxFiles={MAX_FOTO}
                            label=""
                            hint="Tarik foto nota ke sini atau klik untuk memilih"
                        />
                        <div className="mt-2">
                            <CameraCapture
                                onCapture={(file) => jepretFoto('keluar', file)}
                                disabled={berkasFoto.keluar.length >= MAX_FOTO}
                            />
                        </div>
                    </div>

                    {/* Release list */}
                    <div className="border-t pt-4 space-y-3">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-bold text-gray-900 text-sm">List Barang Keluar</h4>
                            <Button type="button" onClick={addKeluarItem} variant="outline" className="py-1 px-3 text-xs flex items-center gap-1">
                                <Plus className="h-3.5 w-3.5" /> Tambah Baris
                            </Button>
                        </div>

                        {keluarForm.data.items.length === 0 ? (
                            <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50">
                                <Package className="h-8 w-8 mx-auto text-gray-300 stroke-[1.5] mb-2" />
                                <p className="text-gray-400 text-xs">Belum ada item ditambahkan. Klik "+ Tambah Baris" di atas.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {keluarForm.data.items.map((item, idx) => {
                                    const specsForCat = items.filter(it => it.kategori === item.kategori && it.tipe).map(it => it.tipe);
                                    const uniqueSpecs = [...new Set(specsForCat)];
                                    const matched = items.find(it => it.kategori === item.kategori && it.tipe === item.tipe);
                                    const availableStock = matched ? matched.stok : 0;

                                    const isQtyDisabled = !item.kategori || !item.tipe;
                                    let qtyPlaceholder = "Pilih Kategori";
                                    if (item.kategori && !item.tipe) {
                                        qtyPlaceholder = "Pilih Tipe";
                                    } else if (item.kategori && item.tipe) {
                                        qtyPlaceholder = `Tersedia: ${availableStock}`;
                                    }

                                    const isOverStock = item.jumlah && parseInt(item.jumlah) > availableStock;
                                    const isUnderZero = item.jumlah && parseInt(item.jumlah) < 0;

                                    return (
                                        <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end bg-gray-50 p-3 rounded-lg border border-gray-200 relative">
                                            <Select
                                                label="Kategori"
                                                value={item.kategori}
                                                onChange={(e) => {
                                                    const next = [...keluarForm.data.items];
                                                    next[idx].kategori = e.target.value;
                                                    next[idx].tipe = '';
                                                    next[idx].jumlah = '';
                                                    keluarForm.setData('items', next);
                                                }}
                                                options={categories}
                                                placeholder="Pilih Kategori..."
                                                required
                                            />

                                            <Select
                                                label="Tipe / Spesifikasi"
                                                value={item.tipe}
                                                onChange={(e) => {
                                                    const next = [...keluarForm.data.items];
                                                    next[idx].tipe = e.target.value;
                                                    next[idx].jumlah = '';
                                                    keluarForm.setData('items', next);
                                                }}
                                                options={uniqueSpecs}
                                                placeholder={item.kategori ? "Pilih Tipe..." : "Pilih Kategori"}
                                                disabled={!item.kategori}
                                                required
                                            />

                                            <div className="flex gap-2 items-end">
                                                <div className="flex-grow">
                                                    <Input
                                                        label="Jumlah Keluar"
                                                        type="number"
                                                        min="0"
                                                        max={availableStock}
                                                        value={item.jumlah}
                                                        onChange={(e) => {
                                                            const next = [...keluarForm.data.items];
                                                            next[idx].jumlah = e.target.value;
                                                            keluarForm.setData('items', next);
                                                        }}
                                                        placeholder={qtyPlaceholder}
                                                        disabled={isQtyDisabled}
                                                        required
                                                        className={isOverStock || isUnderZero ? 'border-red-500 text-red-600 focus:ring-red-500' : ''}
                                                    />
                                                    {isOverStock && (
                                                        <p className="text-[10px] text-red-500 mt-1 font-semibold">Jumlah melebihi stok tersedia!</p>
                                                    )}
                                                    {isUnderZero && (
                                                        <p className="text-[10px] text-red-500 mt-1 font-semibold">Jumlah tidak boleh kurang dari 0!</p>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeKeluarItem(idx)}
                                                    className="p-2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition border border-transparent hover:border-red-200 mb-1"
                                                    title="Hapus Baris"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="border-t pt-4 flex justify-end gap-2">
                        <Button type="submit" variant="primary" processing={keluarForm.processing}>Simpan Transaksi</Button>
                        <Button type="button" variant="outline" onClick={() => setShowKeluarModal(false)}>Batal</Button>
                    </div>
                </form>
            </Modal>

            {/* ADD CATEGORY MODAL */}
            <Modal isOpen={showKatModal} onClose={() => setShowKatModal(false)} title="Tambah Kategori Baru" size="max-w-md">
                <form onSubmit={handleKatSubmit} className="space-y-4 text-xs font-body">
                    <Input label="Nama Kategori" value={katForm.data.kategori} onChange={(e) => katForm.setData('kategori', e.target.value)} required placeholder="e.g. Splicer" />
                    <Input label="Satuan Default" value={katForm.data.satuan} onChange={(e) => katForm.setData('satuan', e.target.value)} required placeholder="Pcs / Unit / Roll" />
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-150">
                        <Button type="submit" variant="primary" processing={katForm.processing}>Simpan</Button>
                        <Button type="button" variant="outline" onClick={() => setShowKatModal(false)}>Batal</Button>
                    </div>
                </form>
            </Modal>

            {/* ADD SPEC-TYPE MODAL */}
            <Modal isOpen={showTipeModal} onClose={() => setShowTipeModal(false)} title="Tambah Tipe Baru" size="max-w-md">
                <form onSubmit={handleTipeSubmit} className="space-y-4 text-xs font-body">
                    <Select label="Kategori" value={tipeForm.data.kategori} onChange={(e) => tipeForm.setData('kategori', e.target.value)} options={categories} placeholder="Pilih..." required />
                    <Input label="Nama Tipe / Spesifikasi" value={tipeForm.data.tipe} onChange={(e) => tipeForm.setData('tipe', e.target.value)} required placeholder="e.g. 1P 16A" />
                    <Input label="Merek" value={tipeForm.data.merek} onChange={(e) => tipeForm.setData('merek', e.target.value)} maxLength={100} placeholder="Contoh: Schneider, Merlin Gerin, ABB" />
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-150">
                        <Button type="submit" variant="primary" processing={tipeForm.processing}>Simpan</Button>
                        <Button type="button" variant="outline" onClick={() => setShowTipeModal(false)}>Batal</Button>
                    </div>
                </form>
            </Modal>

            {/* CATEGORY COLOR SETTINGS MODAL */}
            <Modal isOpen={showColorModal} onClose={() => setShowColorModal(false)} title="Atur Warna Label Kategori" size="max-w-lg">
                <div className="space-y-4 text-xs font-body">
                    <p className="text-gray-500 mb-2">
                        Sesuaikan warna latar belakang label kategori pada tabel stok master. Perubahan disimpan secara lokal.
                    </p>
                    <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-2">
                        {categories.map((cat) => (
                            <div key={cat} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                                <span className="font-bold text-gray-700">{cat}</span>
                                <div className="flex items-center gap-3">
                                    <span
                                        className="inline-block px-2.5 py-1 rounded text-white text-[10px] font-bold uppercase tracking-wider shadow-sm"
                                        style={{ backgroundColor: categoryColors[cat] || '#475569' }}
                                    >
                                        {cat} Preview
                                    </span>
                                    <input
                                        type="color"
                                        value={categoryColors[cat] || '#475569'}
                                        onChange={(e) => updateCategoryColor(cat, e.target.value)}
                                        className="w-8 h-8 rounded cursor-pointer border border-gray-200 p-0"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end pt-3 border-t border-gray-100">
                        <Button type="button" variant="primary" onClick={() => setShowColorModal(false)}>
                            Selesai
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

Stock.layout = page => <AppLayout children={page} />;
