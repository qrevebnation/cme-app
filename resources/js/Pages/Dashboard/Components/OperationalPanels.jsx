import { Link } from '@inertiajs/react';
import { Package, Wrench, FileText, ArrowRight } from 'lucide-react';

function Panel({ judul, deskripsi, ikon: Ikon, href, tautanLabel, children, kosong }) {
    return (
        <div className="flex h-full min-w-0 flex-col rounded-xl border border-slate-200 bg-surface shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
                <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-primary/10 p-2 text-primary dark:text-primary-strong">
                        <Ikon className="h-4 w-4 stroke-[1.5]" />
                    </span>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">{judul}</h3>
                        <p className="text-xs text-slate-500">{deskripsi}</p>
                    </div>
                </div>
                <Link
                    href={href}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline min-h-[44px] sm:min-h-0"
                >
                    {tautanLabel}
                    <ArrowRight className="h-3 w-3" />
                </Link>
            </div>
            <div className="flex-1 divide-y divide-slate-50">{children}</div>
            {kosong && <p className="p-6 text-center text-xs text-slate-400">Belum ada data.</p>}
        </div>
    );
}

function Baris({ kiri, kanan, kiri2, kanan2, badge }) {
    return (
        <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
                <p className="truncate text-xs font-medium leading-snug text-slate-800">{kiri}</p>
                <p className="truncate text-[11px] leading-snug text-slate-500">{kiri2}</p>
            </div>
            <div className="max-w-[45%] shrink-0 text-right">
                <p className="truncate text-[11px] font-semibold leading-snug text-slate-700">{kanan}</p>
                <p className="text-[11px] leading-snug text-slate-500">
                    {badge ? (
                        <span
                            className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                badge === 'dipinjam'
                                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            }`}
                        >
                            {badge}
                        </span>
                    ) : (
                        kanan2
                    )}
                </p>
            </div>
        </div>
    );
}

/**
 * Panel operasional yang paling sering dipakai admin: gudang, tools, dan
 * permintaan barang. Diletakkan di atas daftar ATP terbaru.
 */
export default function OperationalPanels({ gudangTerbaru = {}, toolsTerbaru = [], requestTerbaru = [] }) {
    const masuk = gudangTerbaru.masuk ?? [];
    const keluar = gudangTerbaru.keluar ?? [];
    const gudangKosong = masuk.length === 0 && keluar.length === 0;

    // Tablet 2 kolom, desktop 3 kolom, ponsel bertumpuk
    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Panel
                judul="Gudang Terbaru"
                deskripsi="Barang masuk & keluar"
                ikon={Package}
                href="/gudang/history"
                tautanLabel="Riwayat"
                kosong={gudangKosong}
            >
                {masuk.map((b) => (
                    <Baris
                        key={`m${b.id}`}
                        kiri={b.judul || 'Barang masuk'}
                        kiri2={`Masuk • ${b.supplier || '-'}`}
                        kanan={b.tanggal || '-'}
                        kanan2={b.penerima || '-'}
                    />
                ))}
                {keluar.map((b) => (
                    <Baris
                        key={`k${b.id}`}
                        kiri={b.judul || 'Barang keluar'}
                        kiri2={`Keluar • ${b.pengambil || '-'}`}
                        kanan={b.tanggal || '-'}
                        kanan2={b.lokasi_tujuan || '-'}
                    />
                ))}
            </Panel>

            <Panel
                judul="Tools"
                deskripsi="Peminjaman alat terakhir"
                ikon={Wrench}
                href="/tools"
                tautanLabel="Kelola"
                kosong={toolsTerbaru.length === 0}
            >
                {toolsTerbaru.map((b) => (
                    <Baris
                        key={b.id}
                        kiri={b.peminjam || b.no_form}
                        kiri2={`${b.kategori || '-'} ${b.tipe || ''} • ${b.jumlah || 0} unit`}
                        kanan={b.tgl_pinjam || '-'}
                        badge={b.status}
                    />
                ))}
            </Panel>

            <Panel
                judul="Permintaan Barang"
                deskripsi="Form pengajuan material"
                ikon={FileText}
                href="/material-request"
                tautanLabel="Kelola"
                kosong={requestTerbaru.length === 0}
            >
                {requestTerbaru.map((b) => (
                    <Baris
                        key={b.id}
                        kiri={b.stasiun_site || b.no_form}
                        kiri2={b.no_form}
                        kanan={b.tanggal || '-'}
                        kanan2={b.periode || '-'}
                    />
                ))}
            </Panel>
        </div>
    );
}
