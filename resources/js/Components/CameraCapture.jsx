import { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, X, AlertTriangle } from 'lucide-react';

/**
 * Ambil foto langsung dari kamera perangkat (kamera belakang bila ada), lalu
 * mengembalikan berkas File siap diunggah. Dipakai untuk foto lapangan.
 */
export default function CameraCapture({ onCapture, label = 'Ambil dari Kamera', disabled = false }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [aktif, setAktif] = useState(false);
    const [galat, setGalat] = useState('');
    const [siap, setSiap] = useState(false);

    const hentikan = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setSiap(false);
        setAktif(false);
    };

    useEffect(() => () => hentikan(), []);

    const mulai = async () => {
        setGalat('');
        setAktif(true);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' }, width: { ideal: 1600 }, height: { ideal: 1200 } },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setSiap(true);
            }
        } catch (e) {
            setGalat(
                e?.name === 'NotAllowedError'
                    ? 'Izin kamera ditolak. Aktifkan izin kamera di peramban.'
                    : 'Kamera tidak tersedia di perangkat ini.',
            );
        }
    };

    const jepret = () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;

        const kanvas = document.createElement('canvas');
        kanvas.width = video.videoWidth;
        kanvas.height = video.videoHeight;
        kanvas.getContext('2d').drawImage(video, 0, 0, kanvas.width, kanvas.height);

        kanvas.toBlob(
            (blob) => {
                if (!blob) return;
                const nama = `kamera_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;
                onCapture?.(new File([blob], nama, { type: 'image/jpeg' }));
                hentikan();
            },
            'image/jpeg',
            0.9,
        );
    };

    if (!aktif) {
        return (
            <div>
                <button
                    type="button"
                    onClick={mulai}
                    disabled={disabled}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 bg-surface px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary disabled:opacity-40 sm:min-h-0"
                >
                    <Camera className="h-3.5 w-3.5" /> {label}
                </button>
                {galat && (
                    <p className="mt-2 inline-flex items-center gap-1 text-xs text-amber-600">
                        <AlertTriangle className="h-3.5 w-3.5" /> {galat}
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-slate-200 p-3">
            <video ref={videoRef} playsInline muted className="w-full rounded-md bg-black" />
            {galat && (
                <p className="mt-2 inline-flex items-center gap-1 text-xs text-amber-600">
                    <AlertTriangle className="h-3.5 w-3.5" /> {galat}
                </p>
            )}
            <div className="mt-3 flex items-center gap-2">
                <button
                    type="button"
                    onClick={jepret}
                    disabled={!siap}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40 sm:min-h-0"
                >
                    <Camera className="h-3.5 w-3.5" /> Jepret
                </button>
                <button
                    type="button"
                    onClick={mulai}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 sm:min-h-0"
                >
                    <RefreshCw className="h-3.5 w-3.5" /> Ulangi
                </button>
                <button
                    type="button"
                    onClick={hentikan}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 sm:min-h-0"
                >
                    <X className="h-3.5 w-3.5" /> Tutup
                </button>
            </div>
        </div>
    );
}
