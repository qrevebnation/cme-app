/**
 * Pengambilan lokasi perangkat dengan fallback berlapis.
 *
 * Kenapa perlu: Chromium mengembalikan error kode 2 ("Network error" /
 * POSITION_UNAVAILABLE) ketika layanan lokasi jaringan tidak bisa dihubungi —
 * mis. tanpa internet, atau halaman dibuka dari alamat non-aman (bukan
 * localhost/HTTPS) sehingga penyedia lokasi tidak tersedia. Peramban lama kadang
 * tetap bisa karena memakai mode akurasi rendah (WiFi/seluler).
 *
 * Alur: coba akurasi tinggi → bila gagal, coba mode jaringan (akurasi rendah) →
 * bila tetap gagal, serahkan pesan yang bisa ditindaklanjuti ke pemanggil.
 */

export const pesanLokasi = (err) => {
    switch (err?.code) {
        case 1:
            return 'Izin lokasi ditolak. Buka pengaturan situs di peramban lalu izinkan akses lokasi.';
        case 2:
            return 'Lokasi tidak tersedia dari peramban (layanan lokasi tidak merespons). Geser penanda di peta atau isi koordinat manual.';
        case 3:
            return 'Waktu pengambilan lokasi habis. Coba lagi di area terbuka, atau geser penanda di peta.';
        default:
            return 'Lokasi tidak dapat diambil. Geser penanda di peta atau isi koordinat manual.';
    }
};

/**
 * @param {(koordinat: {lat: string, lng: string}) => void} onSukses
 * @param {(pesan: string, err: GeolocationPositionError) => void} onGagal
 * @param {(aktif: boolean) => void} [onProses]
 */
export function ambilLokasi(onSukses, onGagal, onProses) {
    if (!navigator.geolocation) {
        onGagal('Peramban ini tidak mendukung Geolocation.', { code: 0 });
        return;
    }

    onProses?.(true);

    const kirim = (pos) => {
        onProses?.(false);
        onSukses({
            lat: pos.coords.latitude.toFixed(6),
            lng: pos.coords.longitude.toFixed(6),
        });
    };

    const gagal = (err, sudahCobaJaringan) => {
        if (!sudahCobaJaringan) {
            // Mode akurasi rendah memakai layanan lokasi berbasis jaringan; sering
            // berhasil pada perangkat tanpa GPS atau saat izin presisi ditolak.
            navigator.geolocation.getCurrentPosition(
                kirim,
                (err2) => {
                    onProses?.(false);
                    onGagal(pesanLokasi(err2), err2);
                },
                { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 },
            );
            return;
        }

        onProses?.(false);
        onGagal(pesanLokasi(err), err);
    };

    navigator.geolocation.getCurrentPosition(
        kirim,
        (err) => gagal(err, false),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
}
