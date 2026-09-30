import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

const DURASI_MS = 4000;

const GAYA = {
    sukses: {
        Ikon: CheckCircle2,
        aksen: 'border-l-green-500',
        ikonClass: 'text-green-600',
        judulClass: 'text-green-700 dark:text-green-400',
        judul: 'Berhasil',
        role: 'status',
    },
    gagal: {
        Ikon: XCircle,
        aksen: 'border-l-red-500',
        ikonClass: 'text-red-600',
        judulClass: 'text-red-700 dark:text-red-400',
        judul: 'Gagal',
        role: 'alert',
    },
    info: {
        Ikon: Info,
        aksen: 'border-l-primary',
        ikonClass: 'text-primary',
        judulClass: 'text-primary',
        judul: 'Informasi',
        role: 'status',
    },
};

export function ToastProvider({ children }) {
    const [daftarToast, setDaftarToast] = useState([]);
    const urutanBerikutnya = useRef(0);
    const timerRef = useRef(new Map());

    const tutup = useCallback((id) => {
        const timer = timerRef.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timerRef.current.delete(id);
        }
        setDaftarToast((sebelumnya) => sebelumnya.filter((t) => t.id !== id));
    }, []);

    const tampilkan = useCallback((jenis, pesan) => {
        if (!pesan) return;
        const id = ++urutanBerikutnya.current;
        setDaftarToast((sebelumnya) => [...sebelumnya, { id, jenis, pesan }]);
        timerRef.current.set(id, setTimeout(() => tutup(id), DURASI_MS));
    }, [tutup]);

    useEffect(() => () => {
        timerRef.current.forEach((timer) => clearTimeout(timer));
        timerRef.current.clear();
    }, []);

    const toast = useMemo(() => ({
        sukses: (pesan) => tampilkan('sukses', pesan),
        gagal: (pesan) => tampilkan('gagal', pesan),
        info: (pesan) => tampilkan('info', pesan),
        tutup,
    }), [tampilkan, tutup]);

    return (
        <ToastContext.Provider value={toast}>
            {children}

            <div className="fixed top-16 right-4 z-[70] flex flex-col gap-3 w-[calc(100%-2rem)] sm:w-80 max-w-sm">
                <AnimatePresence initial={false}>
                    {daftarToast.map((item) => {
                        const gaya = GAYA[item.jenis] ?? GAYA.info;
                        const Ikon = gaya.Ikon;

                        return (
                            <motion.div
                                key={item.id}
                                role={gaya.role}
                                initial={{ opacity: 0, x: 40, scale: 0.96 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 40, scale: 0.96 }}
                                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                                className={`flex items-start gap-3 rounded-xl border border-border border-l-4 bg-surface p-4 shadow-lg ${gaya.aksen}`}
                            >
                                <Ikon className={`h-5 w-5 shrink-0 stroke-[1.5] ${gaya.ikonClass}`} />
                                <div className="min-w-0 flex-grow">
                                    <p className={`text-xs font-bold uppercase tracking-widest ${gaya.judulClass}`}>
                                        {gaya.judul}
                                    </p>
                                    <p className="mt-1 text-sm text-text break-words">{item.pesan}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => tutup(item.id)}
                                    title="Tutup"
                                    className="shrink-0 rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-text"
                                >
                                    <X className="h-3.5 w-3.5 stroke-[1.5]" />
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
}

/**
 * Menampilkan flash Inertia (`flash.success` / `flash.error` / `flash.warning`)
 * sebagai toast. Identitas objek `flash` dipakai sebagai penanda kejadian supaya
 * satu pesan tidak muncul dua kali pada render atau navigasi berikutnya.
 */
export function PemantauFlash() {
    const { flash } = usePage().props;
    const toast = useToast();
    const flashTerakhir = useRef(null);

    useEffect(() => {
        if (!flash || flashTerakhir.current === flash) return;
        flashTerakhir.current = flash;

        if (flash.success) toast.sukses(flash.success);
        else if (flash.error) toast.gagal(flash.error);
        else if (flash.warning) toast.info(flash.warning);
    }, [flash, toast]);

    return null;
}

export function useToast() {
    const toast = useContext(ToastContext);
    if (!toast) {
        throw new Error('useToast harus dipakai di dalam <ToastProvider>.');
    }
    return toast;
}
