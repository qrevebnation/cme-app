/**
 * Halaman 404 bermerek. Mandiri tanpa AppLayout supaya bisa tampil untuk tamu
 * maupun sesi yang layoutnya gagal render; dirender server-side dengan status
 * 404 untuk rute tak dikenal dan record tak ada (lihat bootstrap/app.php).
 */
export default function NotFound({ url = '' }) {
    return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-6">
            <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
                <p className="font-headlines text-5xl font-bold text-primary">404</p>
                <h1 className="mt-2 text-lg font-bold text-text font-headlines">Halaman tidak ditemukan</h1>
                <p className="mt-2 text-sm text-text-muted">
                    Alamat yang diminta tidak ada di aplikasi ini.
                    {url ? (
                        <>
                            {' '}<code className="rounded bg-surface-sunken px-1.5 py-0.5 text-xs">{url}</code>
                        </>
                    ) : null}
                </p>
                <div className="mt-5 flex justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text transition hover:bg-surface-sunken"
                    >
                        Kembali
                    </button>
                    <a
                        href="/dashboard"
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                    >
                        Ke Dashboard
                    </a>
                </div>
            </div>
        </div>
    );
}
