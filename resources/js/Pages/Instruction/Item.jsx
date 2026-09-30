import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/Card';
import Modal from '../../Components/Modal';
import { ArrowLeft, ZoomIn } from 'lucide-react';

export default function Item({ id, kategori, description, items = [] }) {
    const [previewImage, setPreviewImage] = useState(null);

    return (
        <>
            <Head title={`Panduan ${kategori} - Web CME`} />

            {/* flex-wrap: judul panjang dan tombol kembali bertumpuk di 390 px */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines">
                        Panduan {kategori}
                    </h1>
                    <p className="text-sm text-gray-500 font-headlines mt-1">
                        SOW standard, visual drawing blueprint, dan parameter audit.
                    </p>
                </div>
                <Link
                    href="/instruction"
                    className="inline-flex h-11 sm:h-9 shrink-0 items-center justify-center gap-1.5 px-3 rounded-lg border border-gray-300 bg-surface text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-black transition"
                >
                    <ArrowLeft className="h-3.5 w-3.5 stroke-[1.5]" />
                    Kembali
                </Link>
            </div>

            <div className="space-y-6">
                {/* Description Banner */}
                <Card>
                    <div className="p-1">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 font-headlines">Deskripsi Panduan</h2>
                        <p className="text-sm text-gray-700 leading-relaxed font-medium">
                            {description || 'Tidak ada deskripsi untuk panduan teknis ini.'}
                        </p>
                    </div>
                </Card>

                {/* Checklist Parameters Table/Grid Card */}
                <Card title="📐 Parameter &amp; Spesifikasi SOW">
                    {items.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 font-medium">
                            Tidak ada item panduan dalam database.
                        </div>
                    ) : (
                        <>
                            {/* Desktop View Table (hidden on mobile) */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-border bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                            <th className="px-6 py-3 w-1/4">Parameter Name</th>
                                            <th className="px-6 py-3 w-1/4">Specification</th>
                                            <th className="px-6 py-3 w-1/3">SOW</th>
                                            <th className="px-6 py-3 text-center">Images</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-xs">
                                        {items.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-4 font-bold text-gray-900 align-top">
                                                    {row.parameter_name}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 font-medium whitespace-pre-line align-top">
                                                    {row.specification}
                                                </td>
                                                <td className="px-6 py-4 align-top">
                                                    <ul className="list-disc list-inside space-y-1 text-gray-600 font-medium pl-1">
                                                        {row.sow && row.sow.map((step, sIdx) => (
                                                            <li key={sIdx}>{step}</li>
                                                        ))}
                                                    </ul>
                                                </td>
                                                <td className="px-6 py-4 align-top">
                                                    <div className="flex flex-wrap justify-center gap-1.5">
                                                        {row.images && row.images.map((img, imgIdx) => (
                                                            <div key={imgIdx} className="relative w-12 h-12 rounded border border-gray-200 overflow-hidden bg-surface shadow-sm group">
                                                                <img
                                                                    src={img.url}
                                                                    className="w-full h-full object-cover cursor-pointer"
                                                                    onClick={() => setPreviewImage(img.url)}
                                                                    alt="Preview"
                                                                />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none">
                                                                    <ZoomIn className="w-3.5 h-3.5 text-white" />
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {(!row.images || row.images.length === 0) && (
                                                            <span className="text-gray-400 italic text-[10px]">No images</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile View: Collapses 4 columns into a single column grid-cols-1 */}
                            <div className="block md:hidden space-y-4">
                                {items.map((row, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-surface p-4 border border-border rounded-lg shadow-sm space-y-3"
                                    >
                                        <div>
                                            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                                                Parameter Name
                                            </span>
                                            <span className="text-sm font-bold text-gray-900">
                                                {row.parameter_name}
                                            </span>
                                        </div>

                                        <div className="border-t border-gray-100 pt-2">
                                            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                                                Specification
                                            </span>
                                            <span className="text-xs text-gray-700 whitespace-pre-line font-medium">
                                                {row.specification}
                                            </span>
                                        </div>

                                        <div className="border-t border-gray-100 pt-2">
                                            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                                SOW (Scope of Work)
                                            </span>
                                            <ul className="list-disc list-inside text-xs text-gray-600 space-y-1 pl-1 font-medium">
                                                {row.sow && row.sow.map((step, sIdx) => (
                                                    <li key={sIdx}>{step}</li>
                                                ))}
                                            </ul>
                                        </div>

                                        {row.images && row.images.length > 0 && (
                                            <div className="border-t border-gray-100 pt-2">
                                                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                                                    Images / Drawing Blueprint
                                                </span>
                                                <div className="flex flex-wrap gap-2">
                                                    {row.images.map((img, imgIdx) => (
                                                        <div key={imgIdx} className="relative w-14 h-14 rounded border border-gray-200 overflow-hidden bg-surface shadow-sm">
                                                            <img
                                                                src={img.url}
                                                                className="w-full h-full object-cover cursor-pointer"
                                                                onClick={() => setPreviewImage(img.url)}
                                                                alt="Blueprint"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </Card>
            </div>

            {/* Live image preview modal */}
            <Modal isOpen={previewImage !== null} onClose={() => setPreviewImage(null)} size="max-w-xl">
                <div className="p-2 flex flex-col items-center">
                    {previewImage && (
                        <img
                            src={previewImage}
                            className="w-full h-auto rounded-lg shadow max-h-[80vh] object-contain"
                            alt="Drawing Blueprint Preview"
                        />
                    )}
                </div>
            </Modal>
        </>
    );
}

Item.layout = page => <AppLayout children={page} />;
