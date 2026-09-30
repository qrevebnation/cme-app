import { useCallback, useEffect, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X, ImageIcon } from 'lucide-react';

/**
 * Unggah berkas bergaya dropzone: tarik-lepas atau klik, dengan pratinjau gambar,
 * validasi tipe/ukuran, dan hapus per berkas.
 */
export default function PhotoDropzone({
    files = [],
    onChange,
    maxFiles = 12,
    maxSizeMb = 8,
    accept = { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    label = 'Foto',
    hint = 'Tarik foto ke sini atau klik untuk memilih',
    error = '',
}) {
    const onDrop = useCallback(
        (diterima, ditolak) => {
            const gabungan = [...files, ...diterima].slice(0, maxFiles);
            onChange?.(gabungan, ditolak);
        },
        [files, maxFiles, onChange],
    );

    const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
        onDrop,
        accept,
        maxFiles: Math.max(1, maxFiles - files.length),
        maxSize: maxSizeMb * 1024 * 1024,
    });

    const pratinjau = useMemo(
        () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
        [files],
    );

    useEffect(() => () => pratinjau.forEach((p) => URL.revokeObjectURL(p.url)), [pratinjau]);

    const hapus = (nama, ukuran, terakhirDiubah) => {
        onChange?.(files.filter((f) => !(f.name === nama && f.size === ukuran && f.lastModified === terakhirDiubah)));
    };

    const pesanTolak = fileRejections[0]?.errors?.[0]?.message ?? '';

    return (
        <div>
            {label && <p className="mb-1 text-xs font-medium text-gray-700">{label}</p>}

            <div
                {...getRootProps()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-3 py-2.5 text-center transition ${
                    isDragActive ? 'border-primary bg-primary/5' : 'border-slate-300 bg-slate-50 hover:border-primary/60'
                }`}
            >
                <input {...getInputProps()} />
                <UploadCloud className="h-4 w-4 text-slate-400" />
                <p className="text-xs font-medium text-slate-600">{isDragActive ? 'Lepaskan berkas di sini' : hint}</p>
                <p className="text-[11px] text-slate-400">
                    Maksimal {maxFiles} berkas, {maxSizeMb} MB per berkas
                </p>
            </div>

            {(error || pesanTolak) && <p className="mt-1 text-xs text-red-500">{error || pesanTolak}</p>}

            {pratinjau.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                    {pratinjau.map((p) => (
                        <div key={p.url} className="group relative overflow-hidden rounded-lg border border-slate-200">
                            <img src={p.url} alt={p.file.name} className="h-16 w-full object-cover" />
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    hapus(p.file.name, p.file.size, p.file.lastModified);
                                }}
                                className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white opacity-100 transition md:h-6 md:w-6 md:opacity-0 md:group-hover:opacity-100"
                                title="Hapus"
                                aria-label="Hapus foto"
                            >
                                <X className="h-4 w-4 md:h-3 md:w-3" />
                            </button>
                            <p className="truncate bg-surface px-1 py-0.5 text-[10px] text-slate-500" title={p.file.name}>
                                {p.file.name}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {pratinjau.length === 0 && (
                <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-400">
                    <ImageIcon className="h-3 w-3" /> Belum ada foto dipilih
                </p>
            )}
        </div>
    );
}
