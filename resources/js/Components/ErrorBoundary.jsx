import React from 'react';

/**
 * Penangkap galat render untuk seluruh pohon Inertia. React me-remount App
 * tiap navigasi tanpa layout persisten, jadi boundary di sini menahan galat
 * dari halaman mana pun. Tampilannya mandiri (tanpa AppLayout) supaya tetap
 * berdiri walau yang rusak justru layoutnya.
 */
export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { galat: null };
    }

    static getDerivedStateFromError(galat) {
        return { galat };
    }

    componentDidCatch(galat, info) {
        if (import.meta.env.DEV) {
            console.error(galat, info);
        }
    }

    render() {
        if (this.state.galat) {
            return (
                <div className="min-h-screen bg-bg flex items-center justify-center p-6">
                    <div role="alert" className="w-full max-w-md rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-wider text-danger">Terjadi kesalahan</p>
                        <h1 className="mt-2 text-lg font-bold text-text font-headlines">Halaman tidak dapat ditampilkan</h1>
                        <p className="mt-2 text-sm text-text-muted">
                            Terjadi kesalahan saat memuat tampilan ini. Coba muat ulang, atau kembali ke dashboard.
                        </p>
                        <div className="mt-5 flex justify-center gap-2">
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                            >
                                Muat ulang
                            </button>
                            <a
                                href="/dashboard"
                                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text transition hover:bg-surface-sunken"
                            >
                                Ke Dashboard
                            </a>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
