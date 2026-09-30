import { useEffect, useId, useMemo, useRef, useState } from 'react';

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// Ukuran tooltip dipatok (w-28 h-6) supaya posisinya bisa dijepit ke dalam area
// grafik dari data titik saja, tanpa mengukur DOM setelah render.
const TIP_LEBAR = 112;
const TIP_TINGGI = 24;
const TIP_JARAK = 8;
const TIP_TEPI = 4;

const labelBulan = (b) => {
    const [tahun, bulan] = String(b).split('-');
    return `${NAMA_BULAN[Number(bulan) - 1] ?? bulan} ${tahun?.slice(2) ?? ''}`;
};

/**
 * Grafik tren bulanan (ATP dan Survey) bergaya area chart shadcn.
 * Digambar dengan SVG langsung supaya tidak menambah dependensi grafik.
 *
 * SVG memakai preserveAspectRatio="none" agar selalu mengisi lebar wadah, jadi
 * label sumbu tidak boleh dirender di dalam SVG: teksnya akan teregang di
 * layar sempit. Label dirender sebagai HTML dengan posisi persen yang dihitung
 * dari koordinat viewBox yang sama.
 */
export default function TrendAreaChart({ trend = [] }) {
    const [rentang, setRentang] = useState(6);
    const areaRef = useRef(null);
    const idTip = useId();
    const [tip, setTip] = useState(null);

    const data = useMemo(() => trend.slice(-rentang), [trend, rentang]);

    const { atpPath, atpArea, surveyPath, surveyArea, titikAtp, titikSurvey, sumbuY, sumbuX } = useMemo(() => {
        const lebar = 1000;
        const tinggi = 250;
        const padKiri = 44;
        const padKanan = 16;
        const padAtas = 16;
        const padBawah = 32;

        const nilai = data.flatMap((d) => [d.atp ?? 0, d.survey ?? 0]);
        const maksimum = Math.max(4, ...nilai);
        const langkahX = data.length > 1 ? (lebar - padKiri - padKanan) / (data.length - 1) : 0;

        const posisi = (i, v) => {
            const x = padKiri + i * langkahX;
            const y = tinggi - padBawah - ((v ?? 0) / maksimum) * (tinggi - padAtas - padBawah);
            return [x, y];
        };

        const buatGaris = (kunci) =>
            data.map((d, i) => {
                const [x, y] = posisi(i, d[kunci]);
                return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(' ');

        const tambahArea = (garis) => {
            if (!garis) return '';
            const pertama = padKiri;
            const terakhir = padKiri + (data.length - 1) * langkahX;
            const dasar = tinggi - padBawah;
            return `${garis} L${terakhir.toFixed(1)},${dasar} L${pertama.toFixed(1)},${dasar} Z`;
        };

        const garisAtp = buatGaris('atp');
        const garisSurvey = buatGaris('survey');

        const titik = (kunci) =>
            data.map((d, i) => {
                const [x, y] = posisi(i, d[kunci]);
                return { kiri: (x / lebar) * 100, atas: (y / tinggi) * 100, nilai: d[kunci] ?? 0, label: labelBulan(d.bulan) };
            });

        return {
            atpPath: garisAtp,
            atpArea: tambahArea(garisAtp),
            surveyPath: garisSurvey,
            surveyArea: tambahArea(garisSurvey),
            titikAtp: titik('atp'),
            titikSurvey: titik('survey'),
            sumbuY: [0, 0.25, 0.5, 0.75, 1].map((p) => {
                const y = padAtas + p * (tinggi - padAtas - padBawah);
                return { y, atas: (y / tinggi) * 100, nilai: Math.round(maksimum * (1 - p)) };
            }),
            sumbuX: data.map((d, i) => ({
                kunci: d.bulan,
                kiri: ((padKiri + i * langkahX) / lebar) * 100,
                label: labelBulan(d.bulan),
            })),
        };
    }, [data]);

    // Posisi dihitung dari ukuran area grafik saat tooltip dibuka, lalu dijepit ke tepi
    // area; kalau di atas titik tidak ada ruang, tooltip pindah ke bawah titik.
    const hitungTip = (id, seri, t, sentuh = false) => {
        const area = areaRef.current;
        if (!area) return null;
        const { width, height } = area.getBoundingClientRect();
        const titikX = (t.kiri / 100) * width;
        const titikY = (t.atas / 100) * height;
        let y = titikY - TIP_TINGGI - TIP_JARAK;
        if (y < TIP_TEPI) y = titikY + TIP_JARAK;
        return {
            id,
            seri,
            label: t.label,
            nilai: t.nilai,
            x: Math.max(TIP_TEPI, Math.min(titikX - TIP_LEBAR / 2, width - TIP_LEBAR - TIP_TEPI)),
            y: Math.max(TIP_TEPI, Math.min(y, height - TIP_TINGGI - TIP_TEPI)),
            sentuh,
        };
    };

    // Mouse memakai hover, keyboard memakai fokus. Sentuhan menahan tooltip sampai
    // pengguna menyentuh tempat lain, sebab pointerleave ikut terpicu saat jari diangkat.
    const propsTitik = (id, seri, t) => ({
        'data-titik': id,
        'aria-label': `${seri} ${t.label}: ${t.nilai}`,
        onPointerEnter: (e) => {
            if (e.pointerType === 'mouse') setTip(hitungTip(id, seri, t));
        },
        onPointerLeave: (e) => {
            if (e.pointerType === 'mouse') setTip((s) => (s?.id === id ? null : s));
        },
        onPointerDown: (e) => {
            if (e.pointerType !== 'mouse') setTip(hitungTip(id, seri, t, true));
        },
        onFocus: () => {
            if (tip?.id !== id) setTip(hitungTip(id, seri, t));
        },
        onBlur: () => setTip((s) => (s?.id === id ? null : s)),
    });

    useEffect(() => {
        if (!tip?.sentuh) return;
        const tutup = (e) => {
            if (e.target instanceof Element && e.target.closest('[data-titik]')) return;
            setTip(null);
        };
        document.addEventListener('pointerdown', tutup);
        return () => document.removeEventListener('pointerdown', tutup);
    }, [tip]);

    return (
        <div className="rounded-xl border border-slate-200 bg-surface shadow-xs">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-slate-900">Tren Dokumen per Bulan</h3>
                    <p className="text-xs text-slate-500">
                        Jumlah ATP dan Survey yang dibuat dalam {rentang} bulan terakhir
                    </p>
                </div>
                <div className="flex gap-1 rounded-lg border border-slate-200 p-0.5">
                    {[3, 6].map((n) => (
                        <button
                            key={n}
                            type="button"
                            onClick={() => {
                                setRentang(n);
                                setTip(null);
                            }}
                            className={`rounded-md px-3 py-1 min-h-[44px] sm:min-h-0 text-xs font-semibold transition ${
                                rentang === n ? 'bg-primary text-primary-foreground' : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            {n} bulan
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4">
                <div className="mb-3 flex items-center gap-4 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#0F766E]" /> ATP
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#16A34A]" /> Survey
                    </span>
                </div>

                <div className="flex gap-2">
                    {/* Label sumbu tegak: HTML di luar SVG agar tidak teregang */}
                    <div className="relative h-[180px] w-7 shrink-0 sm:h-[250px]">
                        {sumbuY.map((t, i) => (
                            <span
                                key={i}
                                className="absolute right-0 -translate-y-1/2 text-[10px] tabular-nums text-slate-400"
                                style={{ top: `${t.atas}%` }}
                            >
                                {t.nilai}
                            </span>
                        ))}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div ref={areaRef} className="relative h-[180px] sm:h-[250px]">
                            <svg viewBox="0 0 1000 250" preserveAspectRatio="none" className="h-full w-full">
                                <defs>
                                    <linearGradient id="gradAtp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0F766E" stopOpacity="0.35" />
                                        <stop offset="95%" stopColor="#0F766E" stopOpacity="0.02" />
                                    </linearGradient>
                                    <linearGradient id="gradSurvey" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#16A34A" stopOpacity="0.30" />
                                        <stop offset="95%" stopColor="#16A34A" stopOpacity="0.02" />
                                    </linearGradient>
                                </defs>

                                {sumbuY.map((t, i) => (
                                    <line
                                        key={i}
                                        x1="44"
                                        x2="984"
                                        y1={t.y}
                                        y2={t.y}
                                        stroke="#E2E8F0"
                                        strokeWidth="1"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                ))}

                                {surveyArea && <path d={surveyArea} fill="url(#gradSurvey)" />}
                                {surveyPath && (
                                    <path
                                        d={surveyPath}
                                        fill="none"
                                        stroke="#16A34A"
                                        strokeWidth="2"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                )}
                                {atpArea && <path d={atpArea} fill="url(#gradAtp)" />}
                                {atpPath && (
                                    <path
                                        d={atpPath}
                                        fill="none"
                                        stroke="#0F766E"
                                        strokeWidth="2"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                )}
                            </svg>

                            {/* Titik data: node HTML agar tetap bulat walau skala sumbu tidak sama.
                                Tombolnya memperbesar area hover/sentuh (36 px di ponsel, 24 px di
                                desktop) dan membuat titik bisa difokus keyboard; title bawaan
                                dilepas karena tooltip ini yang menampilkan nilainya. */}
                            {titikAtp.map((t, i) => (
                                <button
                                    key={`a${i}`}
                                    type="button"
                                    {...propsTitik(`a${i}`, 'ATP', t)}
                                    aria-describedby={tip?.id === `a${i}` ? idTip : undefined}
                                    className="group absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-0 bg-transparent p-0 sm:h-6 sm:w-6"
                                    style={{ left: `${t.kiri}%`, top: `${t.atas}%` }}
                                >
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#0F766E] group-focus-visible:ring-2 group-focus-visible:ring-slate-900 group-focus-visible:ring-offset-1" />
                                </button>
                            ))}
                            {titikSurvey.map((t, i) => (
                                <button
                                    key={`s${i}`}
                                    type="button"
                                    {...propsTitik(`s${i}`, 'Survey', t)}
                                    aria-describedby={tip?.id === `s${i}` ? idTip : undefined}
                                    className="group absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-0 bg-transparent p-0 sm:h-6 sm:w-6"
                                    style={{ left: `${t.kiri}%`, top: `${t.atas}%` }}
                                >
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] group-focus-visible:ring-2 group-focus-visible:ring-slate-900 group-focus-visible:ring-offset-1" />
                                </button>
                            ))}

                            {/* Tooltip dipasang di posisi akhirnya sejak render pertama, jadi tidak
                                ada animasi masuk; MOTION 1 hanya memakai transisi geser 150 ms. */}
                            {tip && (
                                <div
                                    id={idTip}
                                    role="tooltip"
                                    className="pointer-events-none absolute z-20 flex h-6 w-28 items-center justify-center gap-1 rounded-md border border-slate-200 bg-surface text-[10px] font-medium tabular-nums text-slate-700 shadow-sm transition-[left,top] duration-150 ease-out motion-reduce:transition-none"
                                    style={{ left: tip.x, top: tip.y }}
                                >
                                    <span
                                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                                            tip.seri === 'ATP' ? 'bg-[#0F766E]' : 'bg-[#16A34A]'
                                        }`}
                                    />
                                    <span className="whitespace-nowrap">{`${tip.label}: ${tip.nilai}`}</span>
                                </div>
                            )}
                        </div>

                        {/* Label bulan di bawah chart, posisinya mengikuti titik data */}
                        <div className="relative mt-1 h-4">
                            {sumbuX.map((t) => (
                                <span
                                    key={t.kunci}
                                    className="absolute -translate-x-1/2 whitespace-nowrap text-[10px] text-slate-500"
                                    style={{ left: `${t.kiri}%` }}
                                >
                                    {t.label}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
