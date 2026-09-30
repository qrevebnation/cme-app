import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Search, CornerDownLeft } from 'lucide-react';

// Kelompok peran penentu entri mana yang boleh muncul di palet.
const PENGELOLA = ['admin', 'project_manager'];
const TULIS = ['admin', 'project_manager', 'technician'];
const SURVEY = ['admin', 'project_manager', 'technician', 'viewer'];
const ATP = ['admin', 'project_manager', 'technician'];

const MENU = [
    { label: 'Dashboard', href: '/dashboard', kata: 'ringkasan beranda', roles: PENGELOLA },
    { label: 'Survey', href: '/survey', kata: 'odc checklist lapangan', roles: SURVEY },
    { label: 'Survey Baru', href: '/survey/baru', kata: 'buat tambah survey', roles: TULIS },
    { label: 'Template Survey', href: '/survey-template', kata: 'kategori item checklist', roles: PENGELOLA },
    { label: 'ATP Check', href: '/atp', kata: 'acceptance test procedure', roles: ATP },
    { label: 'ATP Baru', href: '/atp/baru', kata: 'buat tambah atp', roles: TULIS },
    { label: 'Inventory (Stok Barang)', href: '/gudang', kata: 'gudang stok consumable material alat', roles: PENGELOLA },
    { label: 'Inventory (Stok Tools)', href: '/gudang?jenis=tool', kata: 'gudang alat perkakas tools stok', roles: PENGELOLA },
    { label: 'Barang Masuk (BM)', href: '/gudang?aksi=masuk', kata: 'catat transaksi masuk supplier nota surat jalan', roles: PENGELOLA },
    { label: 'Barang Keluar (BK)', href: '/gudang?aksi=keluar', kata: 'catat pengambilan barang keluar logistik', roles: PENGELOLA },
    { label: 'Riwayat Transaksi Gudang', href: '/gudang/history', kata: 'masuk keluar barang riwayat', roles: PENGELOLA },
    { label: 'Peminjaman Tools', href: '/tools', kata: 'daftar peminjaman alat kembali', roles: PENGELOLA },
    { label: 'Kalender Jadwal', href: '/kalender', kata: 'jadwal survey tenggat peminjaman alat periode atp', roles: PENGELOLA },
    { label: 'Permintaan Barang', href: '/material-request', kata: 'material request form', roles: PENGELOLA },
    { label: 'Permintaan Barang Baru', href: '/material-request/baru', kata: 'buat pengajuan material', roles: PENGELOLA },
    { label: 'Tools', href: '/tools', kata: 'peminjaman alat', roles: PENGELOLA },
    { label: 'Pinjam Tool', href: '/tools/baru', kata: 'buat peminjaman alat', roles: PENGELOLA },
    { label: 'Proyek', href: '/proyek', kata: 'proyek tugas tim brief file', roles: SURVEY },
    { label: 'Proyek Baru', href: '/proyek/baru', kata: 'buat tambah proyek', roles: PENGELOLA },
    { label: 'Migrasi', href: '/migrasi', kata: 'migrasi busbar geser rack tambah perangkat daya site', roles: SURVEY },
    { label: 'Migrasi Baru', href: '/migrasi/baru', kata: 'buat tambah kebutuhan migrasi', roles: TULIS },
    { label: 'Panduan Teknis (SOW)', href: '/instruction', kata: 'scope of work panduan', roles: ATP },
    { label: 'Kelola Pengguna', href: '/users', kata: 'akun pengguna admin', roles: ['admin'] },
    { label: 'Log Aktivitas', href: '/users-logs', kata: 'riwayat login', roles: PENGELOLA },
    { label: 'Profil Saya', href: '/profile', kata: 'akun password', roles: SURVEY },
];

/**
 * Palet perintah (Ctrl/Cmd + K) untuk berpindah modul dengan cepat.
 * Entri disaring mengikuti peran pengguna, sama dengan menu sidebar.
 */
export default function CommandPalette() {
    const [terbuka, setTerbuka] = useState(false);
    const [kata, setKata] = useState('');
    const [sorot, setSorot] = useState(0);
    const role = usePage().props.auth?.user?.role;

    useEffect(() => {
        const tombol = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setTerbuka((v) => !v);
                setKata('');
                setSorot(0);
            }
            if (e.key === 'Escape') setTerbuka(false);
        };

        window.addEventListener('keydown', tombol);
        return () => window.removeEventListener('keydown', tombol);
    }, []);

    // Daftar dasar entri yang boleh dilihat peran ini.
    const daftar = useMemo(() => MENU.filter((m) => m.roles.includes(role)), [role]);

    const hasil = useMemo(() => {
        const kunci = kata.trim().toLowerCase();
        if (kunci === '') return daftar;
        return daftar.filter((m) => `${m.label} ${m.kata}`.toLowerCase().includes(kunci));
    }, [kata, daftar]);

    const pilih = (item) => {
        setTerbuka(false);
        router.visit(item.href);
    };

    const tombolPanah = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSorot((s) => Math.min(s + 1, hasil.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSorot((s) => Math.max(s - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (hasil[sorot]) pilih(hasil[sorot]);
        }
    };

    if (!terbuka) {
        return (
            <button
                type="button"
                onClick={() => setTerbuka(true)}
                className="hidden items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-xs text-slate-500 transition hover:bg-slate-50 md:inline-flex"
                title="Pencarian cepat (Ctrl+K)"
            >
                <Search className="h-3.5 w-3.5" />
                Cari menu...
                <kbd className="rounded border border-slate-200 bg-slate-50 px-1 text-[10px] font-semibold text-slate-500">Ctrl K</kbd>
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-24" onClick={() => setTerbuka(false)}>
            <div
                className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-surface shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                        autoFocus
                        value={kata}
                        onChange={(e) => {
                            setKata(e.target.value);
                            setSorot(0);
                        }}
                        onKeyDown={tombolPanah}
                        placeholder="Cari menu atau modul..."
                        className="w-full text-sm outline-none"
                    />
                </div>

                <div className="max-h-80 overflow-y-auto p-1">
                    {hasil.length === 0 && <p className="px-3 py-6 text-center text-xs text-slate-400">Tidak ada menu yang cocok.</p>}
                    {hasil.map((item, idx) => (
                        <button
                            key={item.href}
                            type="button"
                            onMouseEnter={() => setSorot(idx)}
                            onClick={() => pilih(item)}
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                                idx === sorot ? 'bg-primary/5 text-primary' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <span className="font-medium">{item.label}</span>
                            {idx === sorot && <CornerDownLeft className="h-3.5 w-3.5 text-slate-400" />}
                        </button>
                    ))}
                </div>

                <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
                    Tekan <kbd className="rounded border px-1">Ctrl</kbd> + <kbd className="rounded border px-1">K</kbd> untuk membuka, <kbd className="rounded border px-1">Esc</kbd> untuk menutup
                </div>
            </div>
        </div>
    );
}
