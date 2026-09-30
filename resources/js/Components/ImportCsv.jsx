import React, { useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { Upload, Download, X } from 'lucide-react';
import Button from './Button';
import Modal from './Modal';
import Table from './Table';

// Kolom wajib templat; satuan/merek/opsional jenis opsional.
const KOLOM_WAJIB = ['kategori', 'tipe', 'jumlah'];
const KOLOM_OPSIONAL = ['satuan', 'merek', 'jenis'];

const CONTOH = [
    { kategori: 'MCB', tipe: '1P 16A', jumlah: '10', satuan: 'Pcs', merek: 'Schneider', jenis: 'consumable' },
    { kategori: 'Kabel', tipe: 'NYM 3x2.5', jumlah: '50', satuan: 'Meter', merek: '', jenis: 'consumable' },
];

const TEMPLATE_CSV = 'kategori,tipe,jumlah,satuan,merek,jenis\n'
    + CONTOH.map((b) => [b.kategori, b.tipe, b.jumlah, b.satuan, b.merek, b.jenis].join(',')).join('\n')
    + '\n';

// Parser CSV kecil tanpa dependensi baru: dukung koma dalam kutip ganda ("a,b").
function parseCsv(teks) {
    const baris = [];
    let sel = [];
    let cur = '';
    let kutip = false;
    const dorong = () => { sel.push(cur); cur = ''; };
    for (let i = 0; i < teks.length; i++) {
        const c = teks[i];
        if (kutip) {
            if (c === '"') {
                if (teks[i + 1] === '"') { cur += '"'; i++; }
                else kutip = false;
            } else cur += c;
        } else if (c === '"') kutip = true;
        else if (c === ',') dorong();
        else if (c === '\n' || c === '\r') {
            if (c === '\r' && teks[i + 1] === '\n') i++;
            dorong();
            if (sel.length > 1 || sel[0].trim() !== '') baris.push(sel);
            sel = [];
        } else cur += c;
    }
    dorong();
    if (sel.length > 1 || sel[0].trim() !== '') baris.push(sel);
    return baris;
}

function validasiBaris(obj) {
    if (!obj.kategori || !obj.tipe) return 'Kolom kategori & tipe wajib diisi.';
    const jumlah = Number(obj.jumlah);
    if (obj.jumlah === '' || !Number.isInteger(jumlah) || jumlah <= 0) return 'Jumlah harus bilangan bulat > 0.';
    if (obj.jenis && obj.jenis !== 'consumable' && obj.jenis !== 'tool') return 'Jenis harus consumable atau tool.';
    return null;
}

export default function ImportCsv({ jenisAktif = 'consumable', onSukses }) {
    const [buka, setBuka] = useState(false);
    const [baris, setBaris] = useState([]);
    const [namaFile, setNamaFile] = useState('');
    const [galatFile, setGalatFile] = useState('');
    const [mengirim, setMengirim] = useState(false);
    const inputRef = useRef(null);

    const unduhTemplate = () => {
        const blob = new Blob(['\uFEFF' + TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template-impor-gudang.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const bacaFile = (file) => {
        if (!file) return;
        setNamaFile(file.name);
        setGalatFile('');
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const matriks = parseCsv(String(reader.result ?? ''));
                if (matriks.length < 2) {
                    setGalatFile('Berkas kosong: butuh baris header + minimal 1 data.');
                    setBaris([]);
                    return;
                }
                const header = matriks[0].map((h) => h.trim().toLowerCase());
                const hilang = KOLOM_WAJIB.filter((k) => !header.includes(k));
                if (hilang.length > 0) {
                    setGalatFile(`Kolom wajib hilang: ${hilang.join(', ')}.`);
                    setBaris([]);
                    return;
                }
                const hasil = matriks.slice(1).map((sel) => {
                    const obj = {};
                    header.forEach((h, i) => { obj[h] = (sel[i] ?? '').trim(); });
                    return {
                        kategori: obj.kategori ?? '',
                        tipe: obj.tipe ?? '',
                        jumlah: obj.jumlah ?? '',
                        satuan: obj.satuan ?? '',
                        merek: obj.merek ?? '',
                        jenis: obj.jenis || jenisAktif,
                        galat: null,
                    };
                }).filter((b) => b.kategori || b.tipe || b.jumlah);
                hasil.forEach((b) => { b.galat = validasiBaris(b); });
                setBaris(hasil);
                if (hasil.length === 0) setGalatFile('Tidak ada baris data terbaca.');
            } catch (e) {
                setGalatFile('Gagal membaca berkas CSV.');
                setBaris([]);
            }
        };
        reader.readAsText(file);
    };

    const barisValid = baris.filter((b) => !b.galat);
    const barisGalat = baris.filter((b) => b.galat).length;

    const kirim = () => {
        if (barisValid.length === 0) return;
        setMengirim(true);
        router.post('/gudang/impor', {
            jenis: jenisAktif,
            items: barisValid.map((b) => ({
                kategori: b.kategori,
                tipe: b.tipe,
                jumlah: Number(b.jumlah),
                satuan: b.satuan || undefined,
                merek: b.merek || undefined,
                jenis: b.jenis || jenisAktif,
            })),
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setMengirim(false);
                setBuka(false);
                setBaris([]);
                setNamaFile('');
                onSukses?.();
            },
            onError: () => setMengirim(false),
            onFinish: () => setMengirim(false),
        });
    };

    const tutup = () => {
        setBuka(false);
        setBaris([]);
        setNamaFile('');
        setGalatFile('');
    };

    return (
        <>
            <Button onClick={() => setBuka(true)} variant="outline" className="h-11 sm:h-9 gap-1.5" title="Impor stok dari CSV">
                <Upload className="h-4 w-4 stroke-[1.5]" />
                Impor CSV
            </Button>

            <Modal isOpen={buka} onClose={tutup} title="Impor Stok dari CSV" size="max-w-3xl">
                <div className="space-y-4 text-xs font-body">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" variant="outline" onClick={unduhTemplate} className="py-1 px-3 text-xs flex items-center gap-1">
                            <Download className="h-3.5 w-3.5" /> Unduh Template CSV
                        </Button>
                        <span className="text-gray-500">Kolom: kategori, tipe, jumlah*, satuan, merek, jenis (*wajib, jumlah &gt; 0).</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            ref={inputRef}
                            type="file"
                            accept=".csv,text/csv"
                            className="hidden"
                            onChange={(e) => bacaFile(e.target.files?.[0])}
                        />
                        <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()} className="py-1 px-3 text-xs flex items-center gap-1">
                            <Upload className="h-3.5 w-3.5" /> Pilih Berkas CSV
                        </Button>
                        {namaFile && <span className="font-semibold text-gray-700">{namaFile}</span>}
                        {namaFile && (
                            <button
                                type="button"
                                onClick={() => { setBaris([]); setNamaFile(''); setGalatFile(''); if (inputRef.current) inputRef.current.value = ''; }}
                                className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400"
                                title="Hapus berkas"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {galatFile && (
                        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 font-semibold text-rose-700">
                            {galatFile}
                        </p>
                    )}

                    {baris.length > 0 && (
                        <>
                            <p className="text-gray-600">
                                Pratinjau: {barisValid.length} valid{barisGalat > 0 && `, ${barisGalat} baris galat ditandai merah dan tidak ikut dikirim`}.
                            </p>
                            <div className="max-h-[40vh] overflow-auto border border-gray-200 rounded-lg">
                                <Table headers={['Kategori', 'Tipe', 'Jumlah', 'Satuan', 'Merek', 'Keterangan']}>
                                    {baris.map((b, i) => (
                                        <tr key={i} className={b.galat ? 'bg-rose-50' : 'hover:bg-gray-50/50'}>
                                            <td className="px-4 py-2">{b.kategori || '-'}</td>
                                            <td className="px-4 py-2">{b.tipe || '-'}</td>
                                            <td className="px-4 py-2 text-center font-semibold">{b.jumlah || '-'}</td>
                                            <td className="px-4 py-2">{b.satuan || '-'}</td>
                                            <td className="px-4 py-2">{b.merek || '-'}</td>
                                            <td className="px-4 py-2 text-rose-600 font-semibold">{b.galat ?? 'OK'}</td>
                                        </tr>
                                    ))}
                                </Table>
                            </div>
                        </>
                    )}

                    <div className="border-t pt-4 flex justify-end gap-2">
                        <Button type="button" variant="primary" onClick={kirim} processing={mengirim} disabled={barisValid.length === 0}>
                            Impor {barisValid.length} Baris
                        </Button>
                        <Button type="button" variant="outline" onClick={tutup}>Batal</Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

export { KOLOM_WAJIB, KOLOM_OPSIONAL, CONTOH };
