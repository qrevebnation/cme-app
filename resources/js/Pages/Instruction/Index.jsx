import React, { useState } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/Card';
import CompactList, { AksiBaris } from '../../Components/CompactList';
import Button from '../../Components/Button';
import ConfirmationModal from '../../Components/ConfirmationModal';
import { BookOpen, Plus, Edit, Trash2 } from 'lucide-react';
import Breadcrumbs from '../../Components/Breadcrumbs';

export default function Index({ guides = [] }) {
    const { props } = usePage();
    const user = props.auth?.user;
    const canManage = user && ['admin', 'project_manager'].includes(user.role);

    const [deleteId, setDeleteId] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const handleDeleteConfirm = () => {
        if (!deleteId) return;
        setDeleting(true);
        router.delete(`/instruction/${deleteId}`, {
            onSuccess: () => {
                setDeleteId(null);
                setDeleting(false);
            },
            onError: () => {
                setDeleting(false);
            }
        });
    };

    return (
        <>
            <Head title="Panduan Teknis (SOW) - Web CME" />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Panduan Teknis (SOW)' }
            ]} />

            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines">
                        Panduan Teknis &amp; Spesifikasi (SOW)
                    </h1>
                    <p className="text-sm text-gray-500 font-headlines mt-1">
                        Pedoman standar konstruksi sipil, kelistrikan, dan mekanikal untuk vendor pelaksana.
                    </p>
                </div>
                {canManage && (
                    <Link href="/instruction/baru">
                        <Button className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold">
                            <Plus className="h-4 w-4 stroke-[1.5]" />
                            Panduan Baru
                        </Button>
                    </Link>
                )}
            </div>

            {guides.length === 0 ? (
                <div className="border border-gray-250 border-dashed rounded-lg p-12 text-center text-gray-400 bg-gray-50/50">
                    <BookOpen className="mx-auto h-12 w-12 stroke-[1.5] text-gray-300" />
                    <h3 className="mt-4 text-sm font-bold text-gray-900 font-headlines">Belum Ada Panduan Teknis</h3>
                    <p className="mt-1 text-xs text-gray-500 max-w-md mx-auto">
                        Silakan buat panduan teknis konstruksi baru jika Anda masuk sebagai Administrator atau Staf CME.
                    </p>
                    {canManage && (
                        <div className="mt-4">
                            <Link href="/instruction/baru">
                                <Button className="text-xs uppercase tracking-wider font-bold">
                                    Mulai Buat Panduan
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            ) : (
                <>
                <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {guides.map((g) => {
                        const description = g.data_json?.description || 'Tidak ada deskripsi.';
                        return (
                            <Card
                                key={g.id}
                                title={`📘 ${g.kategori}`}
                                className="hover:-translate-y-0.5 transition duration-200 flex flex-col justify-between"
                            >
                                <div className="flex-grow">
                                    <p className="text-xs text-gray-500 leading-relaxed min-h-[50px] mb-4">
                                        {description}
                                    </p>
                                </div>
                                <div className="space-y-2 mt-4 pt-4 border-t border-gray-100">
                                    <Link
                                        href={`/instruction/${g.id}`}
                                        className="inline-flex w-full items-center justify-center py-2 bg-text text-bg hover:opacity-90 text-xs font-bold uppercase rounded-lg tracking-wider transition"
                                    >
                                        Buka Panduan &rarr;
                                    </Link>
                                    {canManage && (
                                        <div className="flex gap-2">
                                            <Link
                                                href={`/instruction/${g.id}/edit`}
                                                className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 hover:text-black rounded-lg text-xs font-semibold transition"
                                            >
                                                <Edit className="h-3.5 w-3.5 stroke-[1.5]" />
                                                Edit
                                            </Link>
                                            <button
                                                onClick={() => setDeleteId(g.id)}
                                                className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 rounded-lg text-xs font-semibold transition"
                                            >
                                                <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" />
                                                Hapus
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>

                {/* 390 px: kartu diganti daftar rapat satu baris; tablet/desktop tetap kartu */}
                <div className="md:hidden">
                    <CompactList
                        rows={guides}
                        kunci={(g) => g.id}
                        judul={(g) => g.kategori}
                        meta={(g) => [
                            `${g.data_json?.items?.length || 0} parameter`,
                            g.data_json?.description,
                            g.updated_at ? new Date(g.updated_at).toLocaleDateString('id-ID') : null,
                        ]}
                        aksi={(g) => (
                            <>
                                <AksiBaris label={`Buka panduan ${g.kategori}`} href={`/instruction/${g.id}`} ikon={BookOpen} />
                                {canManage && (
                                    <>
                                        <AksiBaris label={`Edit panduan ${g.kategori}`} href={`/instruction/${g.id}/edit`} ikon={Edit} />
                                        <AksiBaris label={`Hapus panduan ${g.kategori}`} onClick={() => setDeleteId(g.id)} ikon={Trash2} tone="bahaya" />
                                    </>
                                )}
                            </>
                        )}
                    />
                </div>
                </>
            )}

            <ConfirmationModal
                isOpen={deleteId !== null}
                onClose={() => setDeleteId(null)}
                onConfirm={handleDeleteConfirm}
                title="Hapus Panduan Teknis"
                message="Apakah Anda yakin ingin menghapus panduan teknis ini secara permanen? Semua data dan file gambar di dalamnya akan ikut dihapus."
                type="danger"
                processing={deleting}
            />
        </>
    );
}

Index.layout = page => <AppLayout children={page} />;
