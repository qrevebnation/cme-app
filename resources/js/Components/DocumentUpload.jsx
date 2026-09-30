import React, { useState, useRef, useId } from 'react';
import axios from 'axios';
import { UploadCloud, X, Loader2, FileText, Image as ImageIcon, Trash2 } from 'lucide-react';
import Modal from './Modal';

export default function DocumentUpload({
    value = [], // Array of { path, url, name }
    onChange, // Callback: (files) => void
    uploadUrl = '/api/upload-temp-doc'
}) {
    const uniqueId = useId();
    const [loading, setLoading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    const isPdfFile = (filename = '') => {
        return filename.toLowerCase().endsWith('.pdf');
    };

    const handleFiles = async (files) => {
        if (files.length === 0) return;
        
        // Take the first file only since we are restricting to single upload
        const file = files[0];
        
        // Client-side extension validation
        const allowedExtensions = ['pdf', 'jpeg', 'jpg'];
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!allowedExtensions.includes(fileExtension)) {
            alert('Format file tidak didukung. Harap unggah file PDF, JPEG, atau JPG saja.');
            return;
        }

        // Client-side size validation: max 2MB
        if (file.size > 2 * 1024 * 1024) {
            alert('Ukuran file melebihi batas 2MB.');
            return;
        }

        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post(uploadUrl, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const fileData = {
                path: response.data.path,
                url: response.data.url,
                name: file.name
            };
            // Limit to a single file by wrapping it in a single-element array
            onChange([fileData]);
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.errors?.file?.[0] || 'Upload gagal';
            alert(msg);
        } finally {
            setLoading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        handleFiles(files);
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleDelete = () => {
        onChange([]);
    };

    const uploadedFile = value[0] || null;

    return (
        <div className="w-full">
            {uploadedFile ? (
                /* Uploaded File Indicator Display */
                <div className="p-4 rounded-xl border border-border bg-surface flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2.5 rounded-lg flex-shrink-0 ${isPdfFile(uploadedFile.name) ? 'bg-red-50 text-red-600' : 'bg-primary/10 text-primary dark:text-primary-strong'}`}>
                            {isPdfFile(uploadedFile.name) ? (
                                <FileText className="w-6 h-6 stroke-[1.5]" />
                            ) : (
                                <ImageIcon className="w-6 h-6 stroke-[1.5]" />
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate" title={uploadedFile.name}>
                                {uploadedFile.name}
                            </p>
                            <p className="text-[10px] text-gray-400 font-semibold uppercase mt-0.5">
                                {isPdfFile(uploadedFile.name) ? 'Dokumen PDF' : 'Gambar / Foto'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition duration-150 border border-transparent hover:border-red-200"
                        title="Hapus File"
                    >
                        <Trash2 className="w-4 h-4 stroke-[1.5]" />
                    </button>
                </div>
            ) : (
                /* Dropzone / Upload Target Input */
                <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className="flex items-center justify-center w-full"
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".pdf,.jpeg,.jpg"
                        className="hidden"
                        id={`doc-upload-${uniqueId}`}
                    />
                    <label
                        htmlFor={`doc-upload-${uniqueId}`}
                        className={`flex flex-col items-center justify-center w-full h-36 bg-surface hover:bg-gray-50/50 border border-dashed rounded-xl cursor-pointer transition group px-4 ${
                            dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'
                        }`}
                    >
                        {loading ? (
                            <div className="flex flex-col items-center justify-center text-gray-500">
                                <Loader2 className="w-7 h-7 animate-spin text-primary mb-2" />
                                <p className="text-xs font-bold">Mengunggah file...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center">
                                <UploadCloud className="w-8 h-8 text-gray-400 group-hover:text-primary mb-2 transition" />
                                <p className="mb-1 text-xs text-gray-600">
                                    <span className="font-semibold text-primary">Klik untuk unggah</span> atau seret file ke sini
                                </p>
                                <p className="text-[10px] text-gray-400 font-semibold uppercase mt-0.5">
                                    PDF, JPEG, atau JPG (Maks. 2MB)
                                </p>
                            </div>
                        )}
                    </label>
                </div>
            )}
        </div>
    );
}
