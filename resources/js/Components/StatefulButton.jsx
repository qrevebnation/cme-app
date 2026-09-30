import React from 'react';
import { CheckCircle2, LoaderCircle, XCircle } from 'lucide-react';

const GAYA_DASAR = 'inline-flex items-center justify-center gap-2 px-4 py-2 border rounded-md font-semibold text-xs uppercase tracking-widest transition ease-in-out duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

const VARIAN = {
    primary: 'bg-primary border-transparent text-primary-foreground hover:bg-primary/90 active:bg-primary/95 focus:ring-primary',
    secondary: 'bg-primary/10 border-transparent text-primary dark:text-primary-strong hover:bg-primary/20 active:bg-primary/25 focus:ring-primary',
    outline: 'bg-surface border-border text-text hover:bg-primary/5 hover:text-primary hover:border-primary focus:ring-primary',
    danger: 'bg-ng border-transparent text-ng-foreground hover:bg-ng/90 active:bg-ng/95 focus:ring-ng',
};

const IKON_STATUS = {
    loading: { Ikon: LoaderCircle, kelas: 'animate-spin h-3.5 w-3.5' },
    sukses: { Ikon: CheckCircle2, kelas: 'h-3.5 w-3.5' },
    gagal: { Ikon: XCircle, kelas: 'h-3.5 w-3.5' },
};

/**
 * Tombol dengan status proses: spinner saat `loading`, centang saat `sukses`,
 * silang saat `gagal`. Props tombol lain diteruskan apa adanya.
 */
export default function StatefulButton({
    status = 'idle',
    type = 'button',
    variant = 'primary',
    className = '',
    children,
    disabled,
    ...props
}) {
    const ikon = IKON_STATUS[status];

    return (
        <button
            {...props}
            type={type}
            disabled={disabled || status === 'loading'}
            className={`${GAYA_DASAR} ${VARIAN[variant] ?? VARIAN.primary} ${className}`}
        >
            {ikon && (
                <ikon.Ikon
                    data-status={status}
                    className={ikon.kelas}
                />
            )}
            {children}
        </button>
    );
}
