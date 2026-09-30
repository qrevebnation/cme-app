import { useMemo, useState } from 'react';
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown, Download, Search, Columns3 } from 'lucide-react';

/**
 * Tabel data berbasis TanStack Table: pencarian, urut kolom, sembunyikan kolom,
 * paginasi, dan ekspor CSV. Definisi kolom mengikuti TanStack (`accessorKey`,
 * `header`, `cell`), dengan tambahan `exportValue` opsional untuk nilai CSV.
 */
export default function DataTable({
    columns,
    data,
    cariPlaceholder = 'Cari...',
    namaEkspor = 'data',
    modulEkspor = 'Data',
    perHalaman = 10,
    toolbar = null,
    kosongPesan = 'Belum ada data.',
    error = null,
    onRetry = null,
}) {
    const [sorting, setSorting] = useState([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState({});
    const [tampilPengaturan, setTampilPengaturan] = useState(false);

    const kolom = useMemo(() => columns, [columns]);
    const baris = useMemo(() => data ?? [], [data]);

    const table = useReactTable({
        data: baris,
        columns: kolom,
        state: { sorting, globalFilter, columnVisibility },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize: perHalaman } },
    });

    const unduhCsv = () => {
        const barisTersaring = table.getFilteredRowModel().rows;
        const kolomTampil = table.getVisibleLeafColumns().filter((k) => k.id !== 'aksi');

        const nilai = (row, kolomDef) => {
            if (typeof kolomDef.columnDef.exportValue === 'function') {
                return kolomDef.columnDef.exportValue(row.original);
            }
            const mentah = row.original[kolomDef.id];
            return mentah === null || mentah === undefined ? '' : String(mentah);
        };

        const kepala = kolomTampil.map((k) => `"${String(k.columnDef.header ?? k.id).replace(/"/g, '""')}"`).join(',');
        const isi = barisTersaring.map((row) =>
            kolomTampil.map((k) => `"${nilai(row, k).replace(/"/g, '""')}"`).join(','),
        );

        const csv = [kepala, ...isi].join('\n');
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const tautan = document.createElement('a');
        tautan.href = url;
        tautan.download = `${namaEkspor}.csv`;
        document.body.appendChild(tautan);
        tautan.click();
        document.body.removeChild(tautan);
        URL.revokeObjectURL(url);

        // Jejak audit: CSV dibuat di peramban, jadi pencatatannya lewat server.
        const xsrf = decodeURIComponent((document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/) || [])[1] ?? '');
        fetch('/aktivitas/ekspor', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-XSRF-TOKEN': xsrf,
            },
            body: JSON.stringify({ modul: modulEkspor, nama: namaEkspor }),
        }).catch(() => {});
    };

    // #41: cabang galat — daftar bersama dipakai 20+ halaman, jadi kegagalan
    // data dapat pesan + tombol ulangi di satu tempat.
    if (error) {
        return (
            <div role="alert" className="rounded-xl border border-slate-200 bg-surface p-8 text-center shadow-xs">
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

    return (
        <div className="rounded-xl border border-slate-200 bg-surface shadow-xs">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">{toolbar}</div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                        <input
                            value={globalFilter}
                            onChange={(e) => setGlobalFilter(e.target.value)}
                            placeholder={cariPlaceholder}
                            className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-3 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 sm:w-56"
                        />
                    </div>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setTampilPengaturan((v) => !v)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                            <Columns3 className="h-3.5 w-3.5" /> Kolom
                        </button>
                        {tampilPengaturan && (
                            <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-slate-200 bg-surface p-2 shadow-lg">
                                {table.getAllLeafColumns().map((k) => (
                                    <label key={k.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs hover:bg-slate-50">
                                        <input
                                            type="checkbox"
                                            checked={k.getIsVisible()}
                                            onChange={k.getToggleVisibilityHandler()}
                                            className="h-3.5 w-3.5"
                                        />
                                        {typeof k.columnDef.header === 'string' ? k.columnDef.header : k.id}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={unduhCsv}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                        <Download className="h-3.5 w-3.5" /> CSV
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead>
                        {table.getHeaderGroups().map((grup) => (
                            <tr key={grup.id} className="border-b border-slate-100 text-slate-500">
                                {grup.headers.map((header) => (
                                    <th key={header.id} className="whitespace-nowrap px-3 py-2.5 font-medium sm:px-4">
                                        {header.isPlaceholder ? null : (
                                            <button
                                                type="button"
                                                onClick={header.column.getToggleSortingHandler()}
                                                className="inline-flex min-h-[44px] items-center gap-1 hover:text-slate-700 sm:min-h-0"
                                            >
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {header.column.getIsSorted() === 'asc' && <ChevronUp className="h-3 w-3" />}
                                                {header.column.getIsSorted() === 'desc' && <ChevronDown className="h-3 w-3" />}
                                                {!header.column.getIsSorted() && <ChevronsUpDown className="h-3 w-3 text-slate-300" />}
                                            </button>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.length === 0 && (
                            <tr>
                                <td colSpan={table.getAllLeafColumns().length} className="px-4 py-8 text-center text-slate-400">
                                    {kosongPesan}
                                </td>
                            </tr>
                        )}
                        {table.getRowModel().rows.map((row) => (
                            <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                                {row.getVisibleCells().map((cell) => (
                                    <td key={cell.id} className="px-3 py-2.5 align-middle sm:px-4">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-100 p-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>
                    Menampilkan {table.getRowModel().rows.length} dari {table.getFilteredRowModel().rows.length} baris
                </span>
                <div className="flex items-center gap-2">
                    <select
                        value={table.getState().pagination.pageSize}
                        onChange={(e) => table.setPageSize(Number(e.target.value))}
                        aria-label="Jumlah baris per halaman"
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                    >
                        {[10, 25, 50, 100].map((n) => (
                            <option key={n} value={n}>
                                {n} / halaman
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="rounded-md border border-slate-200 px-2 py-1 font-semibold transition hover:bg-slate-50 disabled:opacity-40"
                    >
                        Sebelumnya
                    </button>
                    <span className="tabular-nums">
                        {table.getState().pagination.pageIndex + 1} / {Math.max(1, table.getPageCount())}
                    </span>
                    <button
                        type="button"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="rounded-md border border-slate-200 px-2 py-1 font-semibold transition hover:bg-slate-50 disabled:opacity-40"
                    >
                        Selanjutnya
                    </button>
                </div>
            </div>
        </div>
    );
}
