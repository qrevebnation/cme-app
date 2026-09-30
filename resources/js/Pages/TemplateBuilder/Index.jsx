import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/Card';
import Table from '../../Components/Table';
import ConfirmationModal from '../../Components/ConfirmationModal';
import Search, { filterData } from '../../Components/Search';
import Pagination from '../../Components/Pagination';
import Breadcrumbs from '../../Components/Breadcrumbs';
import PageTabs from '../../Components/PageTabs';
import MetricCard from '../../Components/MetricCard';
import CompactList, { AksiBaris } from '../../Components/CompactList';
import { Sliders, Plus, Edit, Trash2, Layers, CheckCircle2 } from 'lucide-react';

export default function Index({ templates, stats }) {
    const { auth } = usePage().props;
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        templateId: null,
        templateTitle: '',
    });

    const handleSearchChange = (query) => {
        setSearchQuery(query);
        setCurrentPage(1);
    };

    const filteredTemplates = filterData(templates || [], searchQuery);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredTemplates.length / itemsPerPage);
    const paginatedTemplates = filteredTemplates.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const totalTemplates = stats?.total ?? 0;
    const mineTemplates = stats?.mine ?? 0;
    const totalUsed = stats?.total_used ?? 0;
    const shareMine = totalTemplates > 0 ? Math.round((mineTemplates / totalTemplates) * 100) : 0;
    const avgUsedPerTemplate = totalTemplates > 0 ? (totalUsed / totalTemplates).toFixed(1) : '0';

    const handleDeleteClick = (template) => {
        setDeleteModal({
            isOpen: true,
            templateId: template.id,
            templateTitle: template.title,
        });
    };

    const handleConfirmDelete = () => {
        if (!deleteModal.templateId) return;
        router.delete(`/template/${deleteModal.templateId}`, {
            onSuccess: () => {
                setDeleteModal({ isOpen: false, templateId: null, templateTitle: '' });
            },
        });
    };

    return (
        <>
            <Head title="Template Builder ATP - Web CME" />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Template ATP' }
            ]} />

            <PageTabs tabs={[
                { label: 'Daftar ATP', href: '/atp', active: false },
                { label: 'Template ATP', href: '/template', active: true },
            ]} />

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines flex items-center gap-2.5">
                        <Sliders className="h-6 w-6 text-primary stroke-[1.5]" />
                        Template Builder ATP
                    </h1>
                    <p className="text-sm text-gray-500 font-headlines mt-1">
                        Kelola formulir dinamis dan konfigurasi checklist checkpoint inspeksi Acceptance Test Procedure (ATP).
                    </p>
                </div>
                <div>
                    <Link
                        href="/template/baru"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-lg transition shadow-sm"
                    >
                        <Plus className="h-4 w-4 stroke-[2]" />
                        Buat Template Baru
                    </Link>
                </div>
            </div>

            {/* KPI STAT CARDS */}
            {/* Dua kolom rapat di ponsel agar kartu tidak memanjang satu layar; kembali 3 kolom sejak md */}
            <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                <button
                    type="button"
                    onClick={() => handleSearchChange('')}
                    className="w-full min-w-0 cursor-pointer rounded-xl text-left transition duration-150"
                >
                    <MetricCard
                        title="Total Template"
                        value={totalTemplates}
                        badge={`${totalUsed} dokumen`}
                        note="Klik untuk tampilkan semua template"
                    />
                </button>

                <button
                    type="button"
                    onClick={() => handleSearchChange(auth?.user?.name || auth?.user?.username || '')}
                    className="w-full min-w-0 cursor-pointer rounded-xl text-left transition duration-150"
                >
                    <MetricCard
                        title="Milik Saya"
                        value={mineTemplates}
                        badge={`${shareMine}% dari total`}
                        note="Klik untuk filter template Anda"
                    />
                </button>

                <MetricCard
                    title="Sedang Dipakai"
                    value={totalUsed}
                    badge={`${totalTemplates} template`}
                    note={`Rata-rata ${avgUsedPerTemplate} dokumen per template`}
                />
            </div>

            {/* DATA TABLE */}
            <Card
                title="Daftar Template Form ATP"
                headerActions={
                    <div className="w-64">
                        <Search value={searchQuery} onChange={handleSearchChange} placeholder="Cari template..." />
                    </div>
                }
            >
                {/* Desktop: tabel lama tetap tampil sejak xl ke atas */}
                <div className="hidden xl:block">
                    <Table headers={['Nama Template', 'Jumlah Parameter', 'Dibuat Oleh', 'Terakhir Diperbarui', 'Total Penggunaan', 'Aksi']}>
                        {paginatedTemplates.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-10 text-center text-gray-400 font-medium">
                                    <Layers className="h-8 w-8 mx-auto text-gray-300 stroke-[1.5] mb-2" />
                                    Tidak ada data template yang ditemukan
                                </td>
                            </tr>
                        ) : (
                            paginatedTemplates.map((template) => (
                                <tr key={template.id} className="hover:bg-gray-50/50 transition">
                                    <td className="px-3 py-3 sm:px-6 sm:py-4">
                                        <div className="font-bold text-gray-900 text-sm">{template.title}</div>
                                        <div className="text-[11px] text-gray-400 font-mono mt-0.5">ID: #{template.id}</div>
                                    </td>
                                    <td className="px-3 py-3 sm:px-6 sm:py-4">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                            {template.fields_count} Parameter
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 sm:px-6 sm:py-4 text-xs font-medium text-gray-700">
                                        {template.creator_name}
                                    </td>
                                    <td className="px-3 py-3 sm:px-6 sm:py-4 text-xs text-gray-500 font-mono">
                                        {template.updated_at}
                                    </td>
                                    <td className="px-3 py-3 sm:px-6 sm:py-4">
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 stroke-[1.5]" />
                                            {template.records_count} Dokumen
                                        </span>
                                    </td>
                                    <td className="px-3 py-3 sm:px-6 sm:py-4">
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={`/template/${template.id}/edit`}
                                                className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition"
                                                title="Edit Template"
                                            >
                                                <Edit className="h-4 w-4 stroke-[1.5]" />
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteClick(template)}
                                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                title="Hapus Template"
                                            >
                                                <Trash2 className="h-4 w-4 stroke-[1.5]" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </Table>
                </div>

                {/* Mobile: daftar template satu baris agar kolom tidak perlu digeser */}
                <div className="xl:hidden">
                    <CompactList
                        rows={paginatedTemplates}
                        kunci={template => template.id}
                        judul={template => template.title}
                        meta={template => [`${template.fields_count} parameter`, template.creator_name, template.updated_at]}
                        kosong="Tidak ada data template yang ditemukan"
                        aksi={template => (
                            <>
                                <AksiBaris label="Edit Template" href={`/template/${template.id}/edit`} ikon={Edit} />
                                <AksiBaris label="Hapus Template" onClick={() => handleDeleteClick(template)} ikon={Trash2} tone="bahaya" />
                            </>
                        )}
                    />
                </div>

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </Card>

            {/* DELETE CONFIRMATION MODAL */}
            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                title="Hapus Template ATP"
                message={`Apakah Anda yakin ingin menghapus template "${deleteModal.templateTitle}"? Tindakan ini tidak dapat dibatalkan.`}
                type="danger"
                onConfirm={handleConfirmDelete}
                onClose={() => setDeleteModal({ isOpen: false, templateId: null, templateTitle: '' })}
            />
        </>
    );
}

Index.layout = (page) => <AppLayout children={page} />;
