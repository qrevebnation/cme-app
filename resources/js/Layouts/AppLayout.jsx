import React, { useState, useEffect } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Menu,
    User,
    LogOut,
    ChevronDown,
    ChevronRight,
    LayoutDashboard,
    ClipboardList,
    Package,
    CalendarDays,
    Users,
    History,
    BookOpen,
    FileText,
    FolderKanban,
    X,
    Zap
} from 'lucide-react';
import ThemeToggle from '../Components/ThemeToggle';
import { ToastProvider, PemantauFlash } from '../Components/Toast';
import CommandPalette from '../Components/CommandPalette';
import Tour from '../Components/Tour';
import ConfirmationModal from '../Components/ConfirmationModal';

// Pegangan geser lebar sidebar desktop: di bawah 200 px menu terpotong, di atas
// 360 px area konten terlalu sempit.
const LEBAR_SIDEBAR_MIN = 200;
const LEBAR_SIDEBAR_MAKS = 360;
const LEBAR_SIDEBAR_DEFAULT = 256;
const KUNCI_LEBAR_SIDEBAR = 'cme_sidebar_lebar';

const LANGKAH_PANDUAN = [
    {
        judul: 'Selamat datang di Web CME',
        isi: 'Aplikasi monitoring & evaluasi site: survey lapangan, Acceptance Test Procedure (ATP), inventaris, dan dokumen cetak resmi dalam satu tempat.',
    },
    {
        judul: 'Inventaris',
        isi: 'Stok material ada di tab Consumables, stok alat di tab Tools. Transaksi Barang Masuk dan Barang Keluar dicatat dari halaman ini; peminjaman alat lewat tombol Pinjam pada tab Tools.',
    },
    {
        judul: 'Survey & ATP',
        isi: 'Checklist parameter mengikuti template (lengkap dengan kategori & sub-kategori). Foto bisa diunggah banyak sekaligus atau dijepret langsung dari kamera, dan koordinat site ditandai di peta.',
    },
    {
        judul: 'Cetak dokumen',
        isi: 'Tombol Cetak menghasilkan dokumen resmi dengan format yang sama seperti sebelumnya (ATP, BAL, BASTP, laporan survey, gudang).',
    },
    {
        judul: 'Pencarian cepat',
        isi: 'Tekan Ctrl+K untuk melompat ke modul mana pun, misalnya "barang masuk" atau "peminjaman". Tombol Panduan ini bisa dibuka lagi kapan saja.',
    },
];

export default function AppLayout({ children }) {
    const { props } = usePage();
    const { auth } = props;
    const user = auth?.user;

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [lebarSidebar, setLebarSidebar] = useState(LEBAR_SIDEBAR_DEFAULT);
    const [sedangGeser, setSedangGeser] = useState(false);
    const [openMenus, setOpenMenus] = useState({});
    const [cetakAktif, setCetakAktif] = useState(null);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null
    });
    // #40: penanda navigasi Inertia untuk pembaca layar (progress bar global
    // sudah ada di app.jsx; ini melengkapinya agar terukur sebagai status).
    const [menavigasi, setMenavigasi] = useState(false);
    useEffect(() => {
        const lepasMulai = router.on('start', () => setMenavigasi(true));
        const lepasSelesai = router.on('finish', () => setMenavigasi(false));
        return () => { lepasMulai(); lepasSelesai(); };
    }, []);

    // Sidebar selalu terbuka ketika halaman dimuat; hanya di layar kecil ditutup otomatis.
    // Status tidak lagi dibaca dari localStorage supaya tampilan tidak "hilang" setelah
    // pengguna pernah menutupnya.
    useEffect(() => {
        if (window.innerWidth < 1024) {
            setSidebarOpen(false);
        }
    }, []);

    // Lebar terakhir dipakai lagi saat halaman dimuat; nilai rusak/di luar rentang diabaikan.
    useEffect(() => {
        const tersimpan = Number(window.localStorage.getItem(KUNCI_LEBAR_SIDEBAR));

        if (Number.isFinite(tersimpan) && tersimpan >= LEBAR_SIDEBAR_MIN && tersimpan <= LEBAR_SIDEBAR_MAKS) {
            setLebarSidebar(tersimpan);
        }
    }, []);

    // Kesehatan aplikasi cetak lama: diambil sekali saat halaman dimuat (tanpa
    // polling) dan hanya ditampilkan untuk admin/project_manager. null = belum diketahui.
    useEffect(() => {
        if (!user || !['admin', 'project_manager'].includes(user.role)) {
            return undefined;
        }

        let batal = false;

        fetch('/cetak/status', { headers: { Accept: 'application/json' } })
            .then((respons) => (respons.ok ? respons.json() : null))
            .then((hasil) => {
                if (!batal) {
                    setCetakAktif(hasil ? Boolean(hasil.aktif) : false);
                }
            })
            .catch(() => {
                if (!batal) {
                    setCetakAktif(false);
                }
            });

        return () => {
            batal = true;
        };
    }, [user?.role]);

    const toggleSidebar = () => {
        setSidebarOpen((sebelumnya) => !sebelumnya);
    };

    const simpanLebarSidebar = (lebar) => {
        try {
            window.localStorage.setItem(KUNCI_LEBAR_SIDEBAR, String(Math.round(lebar)));
        } catch {
            // Penyimpanan bisa diblokir browser; lebar tetap berlaku sampai halaman ditutup.
        }
    };

    const batasiLebarSidebar = (lebar) => Math.min(LEBAR_SIDEBAR_MAKS, Math.max(LEBAR_SIDEBAR_MIN, lebar));

    const mulaiGeserLebar = (event) => {
        event.preventDefault();
        setSedangGeser(true);

        const xAwal = event.clientX;
        const lebarAwal = lebarSidebar;

        const saatGerak = (gerak) => {
            const lebar = batasiLebarSidebar(lebarAwal + gerak.clientX - xAwal);
            setLebarSidebar(lebar);
            simpanLebarSidebar(lebar);
        };

        const saatLepas = () => {
            setSedangGeser(false);
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', saatGerak);
            window.removeEventListener('mouseup', saatLepas);
        };

        // Tanpa ini teks ikut tersorot dan seleksi tetap menempel setelah tombol dilepas.
        document.body.style.userSelect = 'none';
        window.addEventListener('mousemove', saatGerak);
        window.addEventListener('mouseup', saatLepas);
    };

    // Alternatif keyboard untuk pegangan: panah kiri/kanan menggeser 16 px.
    const geserLewatTombol = (event) => {
        const arah = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;

        if (!arah) {
            return;
        }

        event.preventDefault();
        const lebar = batasiLebarSidebar(lebarSidebar + arah * 16);
        setLebarSidebar(lebar);
        simpanLebarSidebar(lebar);
    };

    const handleLogout = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Konfirmasi Keluar',
            message: 'Apakah Anda yakin ingin keluar dari sistem?',
            type: 'danger',
            onConfirm: () => router.post('/logout')
        });
    };

    const hasRole = (roles) => {
        if (!user) return false;
        return roles.includes(user.role);
    };

    const handleLinkClick = () => {
        if (window.innerWidth < 1024) {
            setSidebarOpen(false);
        }
    };

    const navItemStyle = "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition duration-150 ease-in-out";
    const activeClass = "bg-primary/10 text-primary dark:text-primary-strong font-semibold border-l-4 border-primary";
    const inactiveClass = "text-text/75 hover:bg-gray-100 hover:text-text";

    const renderSidebarContent = () => (
        <div className="flex-grow py-4 overflow-y-auto px-3 space-y-1">
            {hasRole(['admin', 'project_manager', 'viewer']) && (
                <Link href="/dashboard" onClick={handleLinkClick} className={`${navItemStyle} ${usePage().url === '/dashboard' ? activeClass : inactiveClass}`}>
                    <LayoutDashboard className="h-4 w-4 stroke-[1.5]" />
                    Dashboard CME
                </Link>
            )}

            {hasRole(['admin', 'project_manager', 'technician', 'viewer']) && (
                <Link href="/survey" onClick={handleLinkClick} className={`${navItemStyle} ${usePage().url.startsWith('/survey') ? activeClass : inactiveClass}`}>
                    <ClipboardList className="h-4 w-4 stroke-[1.5]" />
                    Survey
                </Link>
            )}

            {hasRole(['admin', 'project_manager', 'technician']) && (
                <Link href="/atp" onClick={handleLinkClick} className={`${navItemStyle} ${usePage().url.startsWith('/atp') ? activeClass : inactiveClass}`}>
                    <ClipboardList className="h-4 w-4 stroke-[1.5]" />
                    ATP Check
                </Link>
            )}

            {hasRole(['admin', 'project_manager', 'technician']) && (
                <Link href="/instruction" onClick={handleLinkClick} className={`${navItemStyle} ${usePage().url.startsWith('/instruction') ? activeClass : inactiveClass}`}>
                    <BookOpen className="h-4 w-4 stroke-[1.5]" />
                    Panduan Teknis (SOW)
                </Link>
            )}

            {hasRole(['admin', 'project_manager']) && (
                <Link href="/gudang" onClick={handleLinkClick} className={`${navItemStyle} ${usePage().url.startsWith('/gudang') ? activeClass : inactiveClass}`}>
                    <Package className="h-4 w-4 stroke-[1.5]" />
                    Inventory
                </Link>
            )}

            {hasRole(['admin', 'project_manager']) && (
                <Link href="/kalender" onClick={handleLinkClick} className={`${navItemStyle} ${usePage().url.startsWith('/kalender') ? activeClass : inactiveClass}`}>
                    <CalendarDays className="h-4 w-4 stroke-[1.5]" />
                    Kalender
                </Link>
            )}

            {hasRole(['admin', 'project_manager']) && (
                <Link href="/material-request" onClick={handleLinkClick} className={`${navItemStyle} ${usePage().url.startsWith('/material-request') ? activeClass : inactiveClass}`}>
                    <FileText className="h-4 w-4 stroke-[1.5]" />
                    Permintaan Barang
                </Link>
            )}

            {hasRole(['admin', 'project_manager', 'technician', 'viewer']) && (
                <Link href="/proyek" onClick={handleLinkClick} className={`${navItemStyle} ${usePage().url.startsWith('/proyek') ? activeClass : inactiveClass}`}>
                    <FolderKanban className="h-4 w-4 stroke-[1.5]" />
                    Proyek
                </Link>
            )}

            {hasRole(['admin', 'project_manager', 'technician', 'viewer']) && (
                <Link href="/migrasi" onClick={handleLinkClick} className={`${navItemStyle} ${usePage().url.startsWith('/migrasi') ? activeClass : inactiveClass}`}>
                    <Package className="h-4 w-4 stroke-[1.5]" />
                    Migrasi
                </Link>
            )}

            {/* Profile link visible to all authenticated roles, separated by a divider */}
            <div className="border-t border-border my-2 pt-2">
                <Link href="/profile" onClick={handleLinkClick} className={`${navItemStyle} ${usePage().url === '/profile' ? activeClass : inactiveClass}`}>
                    <User className="h-4 w-4 stroke-[1.5]" />
                    Profil Saya
                </Link>
            </div>

            {/* Kelola Pengguna khusus admin; Log Aktivitas untuk Admin & Project Manager. */}
            {hasRole(['admin', 'project_manager']) && (
                <div className="space-y-1">
                    {hasRole(['admin']) && (
                        <Link href="/users" onClick={handleLinkClick} className={`${navItemStyle} ${usePage().url === '/users' ? activeClass : inactiveClass}`}>
                            <Users className="h-4 w-4 stroke-[1.5]" />
                            Kelola Pengguna
                        </Link>
                    )}
                    <Link href="/users-logs" onClick={handleLinkClick} className={`${navItemStyle} ${usePage().url === '/users-logs' ? activeClass : inactiveClass}`}>
                        <History className="h-4 w-4 stroke-[1.5]" />
                        Log Aktivitas
                    </Link>
                </div>
            )}
        </div>
    );

    return (
        <ToastProvider>
            <PemantauFlash />

            <div className="min-h-screen bg-bg flex flex-col font-body">
                {/* HEADER */}
                <header className="h-14 bg-surface border-b border-border text-text flex items-center justify-between px-6 sticky top-0 z-60">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleSidebar}
                            aria-label="Buka atau tutup menu navigasi"
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-text transition min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                        >
                            <Menu className="h-5 w-5 stroke-[1.5]" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-primary fill-primary stroke-[1.5] shrink-0" />
                            <span className="text-lg font-bold tracking-wider font-headlines hidden sm:inline">
                                CME <span className="text-primary">APP</span>
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <CommandPalette />
                        <Tour langkah={LANGKAH_PANDUAN} />
                        <ThemeToggle />
                        {user && (
                            <Link
                                href="/profile"
                                className="flex items-center gap-2 border-r border-border pr-4 text-text hover:text-primary transition group min-h-[44px] sm:min-h-0"
                            >
                                <User className="h-4 w-4 text-gray-400 group-hover:text-primary transition stroke-[1.5]" />
                                <span className="text-xs font-medium font-headlines">
                                    {user.username} <span className="text-gray-400">({user.role})</span>
                                </span>
                            </Link>
                        )}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] sm:min-h-0 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border border-red-200 text-xs font-semibold uppercase tracking-wider transition"
                        >
                            <LogOut className="h-3.5 w-3.5 stroke-[1.5]" />
                            Logout
                        </button>
                    </div>
                </header>

                <div className="flex flex-grow relative">
                    {/* Sidebar mobile: 3/4 layar, sisa 1/4 terlihat; backdrop blur menutup saat diklik. */}
                    <AnimatePresence>
                        {sidebarOpen && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    aria-hidden="true"
                                    onClick={() => setSidebarOpen(false)}
                                    className="fixed inset-0 top-14 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
                                />
                                <motion.aside
                                    initial={{ x: '-100%' }}
                                    animate={{ x: 0 }}
                                    exit={{ x: '-100%' }}
                                    transition={{ type: 'tween', duration: 0.25 }}
                                    className="fixed inset-y-0 left-0 top-14 w-[75%] z-45 bg-surface text-text flex flex-col border-r border-border lg:hidden shadow-xl"
                                >
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest font-headlines">Menu Utama</span>
                                        <button
                                            onClick={() => setSidebarOpen(false)}
                                            aria-label="Tutup menu navigasi"
                                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-text transition min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                                        >
                                            <X className="h-5 w-5 stroke-[1.5]" />
                                        </button>
                                    </div>
                                    {renderSidebarContent()}
                                </motion.aside>
                            </>
                        )}
                    </AnimatePresence>

                    {/* DESKTOP SIDEBAR */}
                    <aside
                        style={sidebarOpen ? { width: `${lebarSidebar}px` } : undefined}
                        className={`sticky top-14 bottom-0 left-0 z-40 bg-surface border-r border-border text-text flex-col h-[calc(100vh-3.5rem)] hidden lg:flex ${
                            sedangGeser ? '' : 'transition-all duration-300'
                        } ${
                            sidebarOpen ? 'w-64 lg:w-1/5 lg:shrink-0' : 'w-0 overflow-hidden border-r-0'
                        }`}
                    >
                        {renderSidebarContent()}

                        {/* Pegangan geser hanya di desktop; di ponsel sidebar berbentuk laci penuh.
                            Transparan saat diam supaya tidak jadi dekorasi, menandai diri saat hover/fokus.
                            Animasi width dimatikan saat menggeser supaya tidak terasa tertinggal. */}
                        {sidebarOpen && (
                            <div
                                role="separator"
                                aria-orientation="vertical"
                                aria-label="Ubah lebar sidebar"
                                aria-valuemin={LEBAR_SIDEBAR_MIN}
                                aria-valuemax={LEBAR_SIDEBAR_MAKS}
                                aria-valuenow={Math.round(lebarSidebar)}
                                tabIndex={0}
                                title="Geser untuk mengubah lebar sidebar"
                                onMouseDown={mulaiGeserLebar}
                                onKeyDown={geserLewatTombol}
                                className="hidden lg:block absolute top-0 right-0 z-10 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-primary/30 focus-visible:bg-primary/30 focus:outline-none"
                            />
                        )}
                    </aside>

                    {/* CONTENT AREA */}
                    <main aria-busy={menavigasi} className={`flex-grow flex flex-col min-w-0 bg-bg transition-all duration-300 w-full ${sidebarOpen ? 'lg:w-4/5' : 'lg:w-full'}`}>
                        {/* #40: status navigasi Inertia untuk pembaca layar + indikator visual. */}
                        {menavigasi && (
                            <div role="status" className="flex items-center gap-2 px-4 pt-3 text-xs text-text-muted sm:px-6">
                                <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-primary" />
                                Memuat halaman…
                            </div>
                        )}
                        <div className="flex-grow p-4 sm:p-6 overflow-hidden">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={usePage().url}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -15 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {children}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* FOOTER */}
                        {/* min-h + py pengganti h-10 agar kredit dapat membungkus tanpa terpotong di ponsel */}
                        <footer className="min-h-10 py-2 px-3 bg-bg border-t border-border flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-center text-xs text-text-muted select-none">
                            {/* #38: tanpa whitespace-nowrap — kredit membungkus sendiri di ≤360px, tidak lagi 322px. */}
                            <span>&copy; {new Date().getFullYear()} PT. Integrasi Jaringan Ekosistem. All rights reserved.</span>
                            <span>&middot; Pembuat: Dafa</span>
                            <span>&middot; Frontend: Efraim</span>
                            <span>&middot; Logic: Rochman</span>
                            {/* Penanda kesehatan aplikasi cetak lama; tampil hanya bila status sudah diketahui
                                (admin/project_manager). Titik + teks kecil, tanpa animasi dan tanpa polling. */}
                            {cetakAktif !== null && (
                                <span className="inline-flex items-center gap-1">
                                    &middot;
                                    <span
                                        className={`inline-block h-1.5 w-1.5 rounded-full ${cetakAktif ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                        aria-hidden="true"
                                    />
                                    <span className="text-[11px]">
                                        {cetakAktif
                                            ? 'Cetak: aktif'
                                            : 'Cetak: tidak aktif, dokumen cetak tidak dapat dibuka'}
                                    </span>
                                </span>
                            )}
                        </footer>
                    </main>
                </div>

                <ConfirmationModal
                    isOpen={confirmModal.isOpen}
                    onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                    onConfirm={confirmModal.onConfirm}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    type={confirmModal.type}
                />
            </div>
        </ToastProvider>
    );
}

