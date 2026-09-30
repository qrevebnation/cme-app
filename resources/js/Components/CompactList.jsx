import { ChevronRight } from 'lucide-react';
import { Link } from '@inertiajs/react';

/**
 * Daftar rapat: satu baris per data, tinggi ~52 px, tanpa kartu.
 *
 * Dipakai di layar sempit sebagai pengganti tabel yang harus digeser.
 * Setiap baris menampilkan judul (satu baris, dipotong) dan baris kedua berisi
 * 2-4 field penting yang dipisah titik tengah, sehingga kolom tetap terbaca
 * tanpa garis kolom. Aksi berada di ujung kanan dengan sasaran sentuh 44 px.
 *
 * Tujuan: kepadatan data tetap tinggi di ponsel tanpa geser horizontal,
 * tanpa menumpuk kartu besar.
 */
export default function CompactList({ rows = [], kunci, judul, meta, nuansa, aksi, tautan, kosong = 'Belum ada data.', error = null, onRetry = null }) {
    // #41: cabang galat + tombol ulangi, sejajar dengan DataTable.
    if (error) {
        return (
            <div role="alert" className="px-4 py-8 text-center">
                <p className="text-sm font-semibold text-text">Data tidak dapat dimuat</p>
                <p className="mt-1 text-xs text-text-muted">{typeof error === 'string' ? error : 'Terjadi kesalahan saat mengambil data.'}</p>
                <button
                    type="button"
                    onClick={onRetry ?? (() => window.location.reload())}
                    className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                    Coba lagi
                </button>
            </div>
        );
    }
    if (!rows.length) {
        return <p className="px-4 py-8 text-center text-sm text-text-muted">{kosong}</p>;
    }

    return (
        <ul className="divide-y divide-border">
            {rows.map((row, i) => {
                const isi = (
                    <>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="flex items-center gap-2">
                                <span className="truncate text-sm font-medium text-text">{judul(row)}</span>
                                {nuansa?.(row)}
                            </span>
                            {meta?.(row)?.length > 0 && (
                                <span className="truncate text-xs text-text-muted">{meta(row).filter(Boolean).join(' · ')}</span>
                            )}
                        </span>
                        {tautan && !aksi && <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />}
                    </>
                );

                return (
                    <li key={kunci ? kunci(row) : i} className="flex items-stretch">
                        {tautan ? (
                            <Link
                                href={tautan(row)}
                                className="flex min-h-[52px] min-w-0 flex-1 items-center gap-3 px-3 py-2 transition-colors hover:bg-surface-sunken/60"
                            >
                                {isi}
                            </Link>
                        ) : (
                            <div className="flex min-h-[52px] min-w-0 flex-1 items-center gap-3 px-3 py-2">{isi}</div>
                        )}

                        {aksi && <div className="flex shrink-0 items-center gap-1 pr-1">{aksi(row)}</div>}
                    </li>
                );
            })}
        </ul>
    );
}

/** Tombol aksi baris: sasaran sentuh 44 px tanpa membesarkan tampilan ikon. */
export function AksiBaris({ label, onClick, href, ikon: Ikon, tone = 'netral' }) {
    const warna = tone === 'bahaya'
        ? 'text-danger hover:bg-danger/10'
        : 'text-text-muted hover:bg-surface-sunken hover:text-text';

    const kelas = `inline-flex h-11 w-11 items-center justify-center rounded-md transition-colors ${warna}`;

    if (href) {
        return (
            <Link href={href} aria-label={label} title={label} className={kelas}>
                {Ikon && <Ikon className="h-4 w-4" aria-hidden="true" />}
            </Link>
        );
    }

    return (
        <button type="button" onClick={onClick} aria-label={label} title={label} className={kelas}>
            {Ikon && <Ikon className="h-4 w-4" aria-hidden="true" />}
        </button>
    );
}
