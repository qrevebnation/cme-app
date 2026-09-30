import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { Loader2, LocateFixed, MapPin, Search, X } from 'lucide-react';
import { ambilLokasi } from '../lib/geolocation';

// Leaflet memerlukan ikon default yang eksplisit saat dipaketkan Vite.
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

/**
 * Membaca koordinat dari teks yang ditempel pengguna.
 * Menerima "lat, lng", "lat lng", tautan Google Maps (@lat,lng / ?q=lat,lng /
 * !3d…!4d…) dan tautan OpenStreetMap (#map=z/lat/lng).
 */
export function uraiKoordinat(teks) {
    if (!teks) return null;
    const bersih = String(teks).trim();

    const pola = [
        /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
        /[?&](?:q|query|ll|center)=(-?\d+(?:\.\d+)?)[, ]+(-?\d+(?:\.\d+)?)/,
        /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
        /#map=\d+(?:\.\d+)?\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/,
        /^(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)$/,
    ];

    for (const p of pola) {
        const cocok = bersih.match(p);
        if (!cocok) continue;
        const lat = Number(cocok[1]);
        const lng = Number(cocok[2]);
        if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
            return { lat, lng };
        }
    }

    return null;
}

function Penanda({ lat, lng, ubah }) {
    return (
        <Marker
            position={[lat, lng]}
            draggable={typeof ubah === 'function'}
            eventHandlers={{
                dragend: (e) => {
                    const pos = e.target.getLatLng();
                    ubah?.(Number(pos.lat.toFixed(6)), Number(pos.lng.toFixed(6)));
                },
            }}
        />
    );
}

function KlikPeta({ ubah }) {
    useMapEvents({
        click: (e) => {
            if (typeof ubah !== 'function') return;
            ubah(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
        },
    });
    return null;
}

/** Memusatkan peta ketika koordinat berubah dari luar (pencarian, GPS, tempel). */
function IkutiKoordinat({ lat, lng, zoom }) {
    const peta = useMap();
    const terakhir = useRef(null);

    useEffect(() => {
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        const kunci = `${lat},${lng},${zoom}`;
        if (terakhir.current === kunci) return;
        terakhir.current = kunci;
        peta.setView([lat, lng], zoom);
    }, [lat, lng, zoom, peta]);

    return null;
}

/**
 * Peta lokasi site berbasis Leaflet/OpenStreetMap.
 *
 * Bila `onChange` diberikan, koordinat dapat diisi lewat: menarik penanda,
 * mengeklik peta, mencari nama tempat (Nominatim/OSM), menempel koordinat atau
 * tautan peta, dan tombol GPS perangkat. Pencarian lokasi ini menggantikan
 * ketergantungan pada Geolocation API peramban, yang bisa diblokir di jaringan
 * tanpa HTTPS atau tanpa layanan lokasi.
 */
export default function SiteMap({
    lat,
    lng,
    onChange,
    height = 320,
    zoom = 15,
    className = '',
    showSearch,
    showGps,
}) {
    const bisaUbah = typeof onChange === 'function';
    const denganPencarian = showSearch ?? bisaUbah;
    const denganGps = showGps ?? bisaUbah;

    const [kataKunci, setKataKunci] = useState('');
    const [hasil, setHasil] = useState([]);
    const [mencari, setMencari] = useState(false);
    const [catatan, setCatatan] = useState('');
    const [fokusZoom, setFokusZoom] = useState(zoom);
    const [terbuka, setTerbuka] = useState(false);
    const waktuTunda = useRef(null);
    const wadah = useRef(null);

    const pusat = useMemo(
        () => [Number(lat) || -6.2, Number(lng) || 106.816666],
        [lat, lng],
    );

    useEffect(() => {
        const tutup = (e) => {
            if (wadah.current && !wadah.current.contains(e.target)) setTerbuka(false);
        };
        document.addEventListener('click', tutup);
        return () => document.removeEventListener('click', tutup);
    }, []);

    const pilih = (la, ln, keterangan) => {
        onChange?.(Number(la.toFixed(6)), Number(ln.toFixed(6)));
        setFokusZoom(16);
        setTerbuka(false);
        setCatatan(keterangan || '');
    };

    const cari = (teks) => {
        setKataKunci(teks);
        setCatatan('');
        clearTimeout(waktuTunda.current);

        const koordinat = uraiKoordinat(teks);
        if (koordinat) {
            pilih(koordinat.lat, koordinat.lng, 'Koordinat ditempel.');
            return;
        }

        if (teks.trim().length < 3) {
            setHasil([]);
            setTerbuka(false);
            return;
        }

        waktuTunda.current = setTimeout(async () => {
            setMencari(true);
            try {
                const url = `${NOMINATIM}?format=json&limit=5&accept-language=id&q=${encodeURIComponent(teks.trim())}`;
                const r = await fetch(url, { headers: { Accept: 'application/json' } });
                const data = await r.json();
                setHasil(Array.isArray(data) ? data : []);
                setTerbuka(Array.isArray(data) && data.length > 0);
                if (!data?.length) setCatatan('Tempat tidak ditemukan. Coba kata kunci lain atau geser penanda di peta.');
            } catch {
                setHasil([]);
                setTerbuka(false);
                setCatatan('Pencarian lokasi butuh koneksi internet. Geser penanda di peta atau isi koordinat manual.');
            } finally {
                setMencari(false);
            }
        }, 400);
    };

    const pakaiGps = () => {
        setCatatan('Mengambil lokasi…');
        setMencari(true);
        ambilLokasi(
            ({ lat: la, lng: ln }) => {
                setMencari(false);
                pilih(Number(la), Number(ln), 'Koordinat dari GPS perangkat.');
            },
            (pesan) => {
                setMencari(false);
                setCatatan(pesan);
            },
        );
    };

    return (
        <div ref={wadah} className={`relative space-y-2 ${className}`}>
            {denganPencarian && (
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[220px] flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={kataKunci}
                            onChange={(e) => cari(e.target.value)}
                            onFocus={() => hasil.length > 0 && setTerbuka(true)}
                            placeholder="Cari lokasi (nama tempat, atau tempel koordinat / tautan peta)"
                            className="min-h-[44px] w-full rounded-md border border-slate-300 bg-surface py-2 pl-9 pr-9 text-sm outline-none transition focus:border-primary focus:ring focus:ring-primary/20"
                        />
                        {kataKunci && (
                            <button
                                type="button"
                                onClick={() => {
                                    setKataKunci('');
                                    setHasil([]);
                                    setTerbuka(false);
                                    setCatatan('');
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                                aria-label="Bersihkan pencarian"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}

                        {terbuka && hasil.length > 0 && (
                            <ul className="absolute z-[1000] mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-surface py-1 text-sm shadow-lg">
                                {hasil.map((p) => (
                                    <li key={p.place_id}>
                                        <button
                                            type="button"
                                            onClick={() => pilih(Number(p.lat), Number(p.lon), 'Lokasi dipilih dari hasil pencarian.')}
                                            className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-slate-50"
                                        >
                                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                                            <span className="line-clamp-2 text-xs text-slate-700">{p.display_name}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {denganGps && (
                        <button
                            type="button"
                            onClick={pakaiGps}
                            className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-slate-300 bg-surface px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                            {mencari ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                            Lokasi saya
                        </button>
                    )}
                </div>
            )}

            {catatan && <p className="text-xs text-slate-500">{catatan}</p>}

            <div className="overflow-hidden rounded-lg border border-slate-200" style={{ height }}>
                <MapContainer center={pusat} zoom={zoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap contributors"
                    />
                    <IkutiKoordinat lat={pusat[0]} lng={pusat[1]} zoom={fokusZoom} />
                    <Penanda lat={pusat[0]} lng={pusat[1]} ubah={onChange} />
                    <KlikPeta ubah={onChange} />
                </MapContainer>
            </div>
        </div>
    );
}
