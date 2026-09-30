import React, { useState, useRef, useId } from 'react';
import axios from 'axios';
import { UploadCloud, X, Loader2, ZoomIn, Trash2 } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import Modal from './Modal';
import PhotoGallery from './PhotoGallery';

export default function ImageUpload({
    value = [], // Array of { path, url, name }
    onChange, // Callback: (files) => void
    multiple = false,
    compact = false,
    uploadUrl = '/api/upload-temp',
    onHapusTersimpan = null, // Callback async (img) => boolean untuk foto yang sudah tersimpan di server
}) {
    const uniqueId = useId();
    const [loading, setLoading] = useState(false);
    const [previewIndex, setPreviewIndex] = useState(null);
    const [deleteIndex, setDeleteIndex] = useState(null);
    const [menghapus, setMenghapus] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setLoading(true);
        const uploadedFiles = [...value];

        for (const file of files) {
            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await axios.post(uploadUrl, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                const fileData = {
                    path: response.data.path,
                    url: response.data.url,
                    name: file.name
                };
                if (multiple) {
                    uploadedFiles.push(fileData);
                } else {
                    uploadedFiles[0] = fileData;
                }
            } catch (err) {
                const msg = err.response?.data?.message || err.response?.data?.errors?.image?.[0] || 'Upload gagal';
                alert(msg);
            }
        }

        onChange(uploadedFiles);
        setLoading(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const confirmDelete = (idx) => {
        setDeleteIndex(idx);
    };

    /** Hapus foto: yang sudah tersimpan di server lewat endpoint dulu, baru dilepas dari daftar. */
    const handleDelete = async () => {
        if (deleteIndex === null) return;
        const img = value[deleteIndex];

        if (img?.isExisting && onHapusTersimpan) {
            setMenghapus(true);
            const berhasil = await onHapusTersimpan(img);
            setMenghapus(false);
            if (!berhasil) return;
        }

        const nextFiles = [...value];
        nextFiles.splice(deleteIndex, 1);
        onChange(nextFiles);
        setDeleteIndex(null);
        setPreviewIndex(null);
    };

    // Render Compact Style for Tables/Checklists
    if (compact) {
        return (
            <div className="space-y-2">
                {/* Previews */}
                {value.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {value.map((img, idx) => (
                            <div key={idx} className="relative w-12 h-12 rounded border border-gray-200 overflow-hidden bg-white shadow-sm group">
                                <img src={img.url} className="w-full h-full object-cover cursor-pointer" onClick={() => setPreviewIndex(idx)} alt="Preview" />
                            </div>
                        ))}
                    </div>
                )}

                {/* Upload Trigger / Spinner */}
                {(!multiple && value.length > 0) ? null : (
                    <div className="relative">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            multiple={multiple}
                            accept="image/*"
                            className="hidden"
                            id={`file-upload-compact-${uniqueId}`}
                        />
                        {loading ? (
                            <div className="flex min-h-[44px] items-center gap-1.5 px-3 py-2.5 border border-gray-200 rounded bg-gray-50 text-[10px] text-gray-500 font-semibold sm:min-h-0 sm:px-2 sm:py-1">
                                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                Mengunggah...
                            </div>
                        ) : (
                            <label
                                htmlFor={`file-upload-compact-${uniqueId}`}
                                className="inline-flex min-h-[44px] items-center gap-1.5 px-3 py-2.5 border border-dashed border-primary hover:bg-primary/5 rounded text-[10px] text-primary font-semibold cursor-pointer transition sm:min-h-0 sm:px-2 sm:py-1"
                            >
                                <UploadCloud className="w-3.5 h-3.5" />
                                {value.length > 0 ? 'Tambah Foto' : 'Unggah Foto'}
                            </label>
                        )}
                    </div>
                )}

                {/* Detail View Modal: tombol hapus 44 px di ponsel; foto tersimpan
                    langsung dihapus di server lewat onHapusTersimpan. */}
                <Modal isOpen={previewIndex !== null} onClose={() => setPreviewIndex(null)} size="max-w-xl">
                    <div className="p-1 flex flex-col items-center gap-4">
                        {previewIndex !== null && value[previewIndex] && (
                            <>
                                <img src={value[previewIndex].url} className="w-full h-auto rounded" alt="Large Preview" />
                                <button
                                    type="button"
                                    onClick={() => confirmDelete(previewIndex)}
                                    disabled={menghapus}
                                    className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg shadow-md transition duration-200 flex items-center gap-1.5 text-xs font-bold min-h-[44px] px-4 hover:scale-105 sm:min-h-0 sm:px-3 sm:py-2"
                                >
                                    {menghapus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />}
                                    {value[previewIndex]?.isExisting ? 'Hapus Permanen' : 'Hapus'}
                                </button>
                            </>
                        )}
                    </div>
                </Modal>

                {/* Confirmation Modal */}
                <ConfirmationModal
                    isOpen={deleteIndex !== null}
                    onClose={() => setDeleteIndex(null)}
                    onConfirm={handleDelete}
                    title="Hapus Foto"
                    message="Apakah Anda yakin ingin menghapus foto ini?"
                    type="danger"
                />
            </div>
        );
    }

    // Render Large Dropzone Style
    return (
        <div className="w-full">
            {/* Show Previews if uploaded */}
            {value.length > 0 ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {value.map((img, idx) => (
                            <div key={idx} className="relative aspect-video rounded-lg border border-gray-200 overflow-hidden bg-white shadow group">
                                <img src={img.url} className="w-full h-full object-cover" alt="Preview" />
                                <div className="absolute inset-0 bg-primary/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPreviewIndex(idx)}
                                        className="p-1.5 bg-surface text-gray-800 rounded-full hover:bg-gray-100 transition"
                                    >
                                        <ZoomIn className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => confirmDelete(idx)}
                                        className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {multiple && (
                        <div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                multiple={true}
                                accept="image/*"
                                className="hidden"
                                id={`file-upload-large-${uniqueId}`}
                            />
                            {loading ? (
                                <button type="button" disabled className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 font-bold bg-gray-50">
                                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                    Memproses...
                                </button>
                            ) : (
                                <label
                                    htmlFor={`file-upload-large-${uniqueId}`}
                                    className="inline-flex items-center gap-2 px-4 py-2 border border-dashed border-primary hover:bg-primary/5 rounded-lg text-sm text-primary font-bold cursor-pointer transition"
                                >
                                    <UploadCloud className="w-4 h-4" />
                                    Tambah Foto Lainnya
                                </label>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                /* Initial Dropzone */
                <div className="flex items-center justify-center w-full">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        multiple={multiple}
                        accept="image/*"
                        className="hidden"
                        id={`file-upload-large-${uniqueId}`}
                    />
                    <label
                        htmlFor={`file-upload-large-${uniqueId}`}
                        className="flex flex-col items-center justify-center w-full h-24 bg-surface hover:bg-gray-50 border border-dashed border-gray-300 hover:border-primary rounded-xl cursor-pointer transition group"
                    >
                        {loading ? (
                            <div className="flex flex-col items-center justify-center text-gray-500">
                                <Loader2 className="w-5 h-5 animate-spin text-primary mb-1" />
                                <p className="text-xs font-semibold">Mengunggah file...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-1 text-center px-4">
                                <UploadCloud className="w-5 h-5 text-gray-400 group-hover:text-primary mb-1 transition" />
                                <p className="mb-0.5 text-xs text-gray-600">
                                    <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-[11px] text-gray-400">
                                    PNG, JPG, JPEG or WEBP (MAX. 2MB)
                                </p>
                            </div>
                        )}
                    </label>
                </div>
            )}
            {/* Galeri large: panah prev/next, counter i/n, keyboard, unduh; hapus lewat aksi */}
            <PhotoGallery
                photos={value.map((img) => ({ src: img.url, nama: img.name }))}
                startIndex={previewIndex}
                onClose={() => setPreviewIndex(null)}
                aksi={
                    previewIndex !== null && value[previewIndex] ? (
                        <button
                            type="button"
                            onClick={() => confirmDelete(previewIndex)}
                            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-red-600 px-3 text-xs font-bold text-white shadow-md transition duration-200 hover:scale-105 hover:bg-red-700 sm:min-h-0 sm:px-3 sm:py-2"
                        >
                            <Trash2 className="w-3.5 h-3.5 stroke-[1.5]" />
                            Hapus
                        </button>
                    ) : null
                }
            />

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteIndex !== null}
                onClose={() => setDeleteIndex(null)}
                onConfirm={handleDelete}
                title="Hapus Foto"
                message="Apakah Anda yakin ingin menghapus foto ini?"
                type="danger"
            />
        </div>
    );
}
