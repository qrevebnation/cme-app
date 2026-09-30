import { useEffect, useRef, useState } from 'react';

/**
 * Menampilkan angka dengan animasi naik-turun singkat. Dipakai pada kartu
 * ringkasan agar perubahan angka (mis. setelah simpan data) mudah terlihat.
 */
export default function AnimatedNumber({ value = 0, duration = 700, className = '' }) {
    const angka = Number(value) || 0;
    const [tampil, setTampil] = useState(angka);
    const mulaiRef = useRef(null);
    const dariRef = useRef(angka);
    const frameRef = useRef(0);

    useEffect(() => {
        dariRef.current = tampil;
        mulaiRef.current = null;

        const langkah = (waktu) => {
            if (mulaiRef.current === null) mulaiRef.current = waktu;
            const progres = Math.min(1, (waktu - mulaiRef.current) / duration);
            const halus = 1 - Math.pow(1 - progres, 3);
            setTampil(Math.round(dariRef.current + (angka - dariRef.current) * halus));
            if (progres < 1) frameRef.current = requestAnimationFrame(langkah);
        };

        frameRef.current = requestAnimationFrame(langkah);
        return () => cancelAnimationFrame(frameRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [angka, duration]);

    return (
        <span className={`tabular-nums ${className}`}>
            {tampil.toLocaleString('id-ID')}
        </span>
    );
}
