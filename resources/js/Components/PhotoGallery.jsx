import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import Modal from './Modal';

/** Ubah string URL atau objek foto {file_url,url,src,nama,name} jadi {src,nama}. */
export function normalisasiFoto(photos) {
    return (photos || []).map((p) => {
        if (typeof p === 'string') return { src: p };
        return { src: p.src || p.file_url || p.url, nama: p.nama || p.name || '' };
    });
}

/**
 * Galeri foto tanpa lib baru. `startIndex: null` = tertutup.
 * Panah prev/next, counter i/n, keyboard Esc/panah, tombol Unduh (<a download>), caption.
 */
export default function PhotoGallery({ photos = [], startIndex = null, onClose, aksi = null }) {
    const terbuka = startIndex !== null && startIndex !== undefined;
    const daftar = normalisasiFoto(photos);
    const [posisi, setPosisi] = useState(startIndex ?? 0);

    useEffect(() => {
        if (terbuka) setPosisi(startIndex);
    }, [startIndex, terbuka]);

    const mundur = useCallback(() => {
        setPosisi((p) => (p - 1 + daftar.length) % daftar.length);
    }, [daftar.length]);

    const maju = useCallback(() => {
        setPosisi((p) => (p + 1) % daftar.length);
    }, [daftar.length]);

    useEffect(() => {
        if (!terbuka) return undefined;
        const tombol = (e) => {
            if (e.key === 'Escape') onClose?.();
            if (e.key === 'ArrowLeft') mundur();
            if (e.key === 'ArrowRight') maju();
        };
        window.addEventListener('keydown', tombol);
        return () => window.removeEventListener('keydown', tombol);
    }, [terbuka, mundur, maju, onClose]);

    if (!terbuka || daftar.length === 0) return null;
    const aktif = daftar[Math.min(posisi, daftar.length - 1)] || {};
    const banyak = daftar.length > 1;

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={`Foto ${Math.min(posisi, daftar.length - 1) + 1} / ${daftar.length}`}
            size="max-w-3xl"
        >
            <div className="relative flex items-center justify-center rounded-lg bg-gray-900 p-2">
                {banyak && (
                    <button
                        type="button"
                        onClick={mundur}
                        aria-label="Foto sebelumnya"
                        className="absolute left-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface/90 text-gray-800 shadow hover:bg-surface sm:h-9 sm:w-9"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                )}
                <img
                    key={aktif.src}
                    src={aktif.src}
                    alt={aktif.nama || 'Foto dokumentasi'}
                    className="max-h-[70vh] w-full rounded object-contain"
                    onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=400&q=85';
                    }}
                />
                {banyak && (
                    <button
                        type="button"
                        onClick={maju}
                        aria-label="Foto berikutnya"
                        className="absolute right-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface/90 text-gray-800 shadow hover:bg-surface sm:h-9 sm:w-9"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                )}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 flex-1 truncate text-xs text-gray-600" title={aktif.nama || ''}>
                    {aktif.nama || `Foto ${Math.min(posisi, daftar.length - 1) + 1} dari ${daftar.length}`}
                </p>
                <div className="flex items-center gap-2">
                    {aksi}
                    <a
                        href={aktif.src}
                        download
                        className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary/10 px-3.5 text-xs font-bold uppercase text-primary dark:text-primary-strong transition hover:bg-primary/20 sm:h-9"
                    >
                        <Download className="h-4 w-4" />
                        Unduh
                    </a>
                </div>
            </div>
        </Modal>
    );
}
