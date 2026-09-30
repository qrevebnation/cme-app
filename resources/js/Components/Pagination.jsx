import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    totalItems = 0,
    itemsPerPage = 10,
    className = ''
}) {
    if (totalPages <= 1) return null;

    const from = (currentPage - 1) * itemsPerPage + 1;
    const to = Math.min(currentPage * itemsPerPage, totalItems);

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            let start = Math.max(1, currentPage - 2);
            let end = Math.min(totalPages, currentPage + 2);

            if (start === 1) {
                end = 5;
            } else if (end === totalPages) {
                start = totalPages - 4;
            }

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
        }
        return pages;
    };

    const pageNumbers = getPageNumbers();

    const btnBase = "h-11 px-3 rounded-lg border border-border text-xs font-semibold text-text hover:bg-gray-50 hover:text-primary hover:border-primary disabled:opacity-40 disabled:pointer-events-none transition flex items-center justify-center gap-1 sm:h-8 sm:px-2.5";
    const activeBtn = "h-11 w-11 rounded-lg bg-primary border-transparent text-primary-foreground text-xs font-bold transition flex items-center justify-center sm:h-8 sm:w-8";
    const inactiveBtn = "h-11 w-11 rounded-lg border border-border text-xs font-semibold text-text hover:bg-gray-50 hover:text-primary hover:border-primary transition flex items-center justify-center sm:h-8 sm:w-8";

    return (
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 py-3 border-t border-border ${className}`}>
            <div className="text-xs text-gray-500 font-medium">
                Menampilkan <span className="font-semibold text-text">{from}</span> - <span className="font-semibold text-text">{to}</span> dari <span className="font-semibold text-text">{totalItems}</span> data
            </div>

            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className={btnBase}
                    title="Halaman Pertama"
                    type="button"
                >
                    <ChevronsLeft className="h-3.5 w-3.5 stroke-[1.5]" />
                </button>
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={btnBase}
                    title="Halaman Sebelumnya"
                    type="button"
                >
                    <ChevronLeft className="h-3.5 w-3.5 stroke-[1.5]" />
                    <span className="hidden sm:inline">Sebelumnya</span>
                </button>

                {pageNumbers[0] > 1 && (
                    <>
                        <button onClick={() => onPageChange(1)} className={`${inactiveBtn} hidden sm:flex`} type="button">1</button>
                        {pageNumbers[0] > 2 && <span className="hidden px-1 text-xs text-gray-400 sm:inline">...</span>}
                    </>
                )}

                {/* Ponsel: deret nomor diganti label halaman karena tombol 44 px tidak muat */}
                <span className="px-2 text-xs font-semibold text-text sm:hidden">
                    Hal {currentPage} / {totalPages}
                </span>

                <div className="hidden items-center gap-1 sm:flex">
                    {pageNumbers.map(page => (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            className={page === currentPage ? activeBtn : inactiveBtn}
                            type="button"
                        >
                            {page}
                        </button>
                    ))}
                </div>

                {pageNumbers[pageNumbers.length - 1] < totalPages && (
                    <>
                        {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && <span className="hidden px-1 text-xs text-gray-400 sm:inline">...</span>}
                        <button onClick={() => onPageChange(totalPages)} className={`${inactiveBtn} hidden sm:flex`} type="button">{totalPages}</button>
                    </>
                )}

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={btnBase}
                    title="Halaman Selanjutnya"
                    type="button"
                >
                    <span className="hidden sm:inline">Selanjutnya</span>
                    <ChevronRight className="h-3.5 w-3.5 stroke-[1.5]" />
                </button>
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className={btnBase}
                    title="Halaman Terakhir"
                    type="button"
                >
                    <ChevronsRight className="h-3.5 w-3.5 stroke-[1.5]" />
                </button>
            </div>
        </div>
    );
}
