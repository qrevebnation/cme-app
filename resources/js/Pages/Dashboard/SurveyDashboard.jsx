import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/Card';
import MetricCard from '../../Components/MetricCard';
import Table from '../../Components/Table';
import CompactList, { AksiBaris } from '../../Components/CompactList';
import ConfirmationModal from '../../Components/ConfirmationModal';
import Search, { filterData } from '../../Components/Search';
import Pagination from '../../Components/Pagination';
import Breadcrumbs from '../../Components/Breadcrumbs';
import PageTabs from '../../Components/PageTabs';

/** admin & project_manager bebas menghapus; peran lain hanya baris dengan created_by miliknya. */
const bolehHapusBaris = (row, user) =>
    !!row && (['admin', 'project_manager'].includes(user?.role) || (user?.id != null && row.created_by === user.id));

export default function SurveyDashboard({ stats, recent }) {
    const { auth } = usePage().props;
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pendingHapus, setPendingHapus] = useState(null);

    const bolehHapus = (row) => bolehHapusBaris(row, auth?.user);

    const kirimHapus = () => {
        if (!pendingHapus) return;

        router.delete(`/survey/${pendingHapus.id}`, { preserveScroll: true });
        setPendingHapus(null);
    };

    const handleSearchChange = (query) => {
        setSearchQuery(query);
        setCurrentPage(1);
    };

    const filteredRecent = filterData(recent, searchQuery);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredRecent.length / itemsPerPage);
    const paginatedRecent = filteredRecent.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const totalSurvey = stats.total ?? 0;
    const mineSurvey = stats.mine ?? 0;
    const shareMine = totalSurvey > 0 ? Math.round((mineSurvey / totalSurvey) * 100) : 0;
    const surveyorCount = new Set((recent ?? []).map((row) => row.nama_surveyor).filter(Boolean)).size;

    return (
        <>
            <Head title="Survey Dashboard - Web CME" />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Survey' }
            ]} />

            <PageTabs tabs={[
                { label: 'Daftar Survey', href: '/survey', active: true },
                { label: 'Template Survey', href: '/survey-template', active: false },
            ]} />

            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines">
                    Survey Dashboard
                </h1>
                <p className="text-sm text-gray-500 font-headlines mt-1">
                    Web CME: Radio Base Station Site Surveyor Stats Hub
                </p>
            </div>

            {/* Mobile: dua kartu per baris agar metrik tidak memanjang satu kolom */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 mb-8">
                <button type="button" onClick={() => handleSearchChange('')} className="w-full min-w-0 text-left">
                    <MetricCard
                        title="Total Survey"
                        value={totalSurvey}
                        badge={`${mineSurvey} milik saya`}
                        note="Klik untuk tampilkan semua survey"
                    />
                </button>

                <button
                    type="button"
                    onClick={() => handleSearchChange(auth?.user?.name || auth?.user?.username || '')}
                    className="w-full min-w-0 text-left"
                >
                    <MetricCard
                        title="Survey Saya"
                        value={mineSurvey}
                        badge={`${shareMine}% dari total`}
                        note="Klik untuk filter survey Anda"
                    />
                </button>

                <Link href="/users" className="block min-w-0">
                    <MetricCard
                        title="Total Pengguna"
                        value={stats.users ?? 0}
                        badge={`${surveyorCount} surveyor`}
                        note="Lihat daftar pengguna"
                    />
                </Link>
            </div>

            <div className="space-y-8">
                <Card
                    title="Survey Terbaru"
                    headerActions={
                        <Link
                            href="/survey/baru"
                            className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] sm:min-h-0 bg-primary hover:bg-primary-strong text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-lg transition"
                        >
                            + Survey Baru
                        </Link>
                    }
                >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3 mb-4">
                        <Search value={searchQuery} onChange={handleSearchChange} />
                    </div>

                    {/* Mobile: daftar rapat agar kolom tidak perlu digeser */}
                    <div className="xl:hidden">
                        <CompactList
                            rows={paginatedRecent}
                            kunci={(row) => row.id}
                            judul={(row) => row.nama_site || '-'}
                            meta={(row) => [
                                row.tanggal_survey,
                                row.nama_surveyor,
                                row.latitude ? `${row.latitude}, ${row.longitude}` : null,
                            ]}
                            tautan={(row) => `/survey/${row.id}`}
                            aksi={(row) =>
                                bolehHapus(row) && (
                                    <AksiBaris
                                        label={`Hapus Survey ${row.nama_site || ''}`}
                                        onClick={() => setPendingHapus(row)}
                                        ikon={Trash2}
                                        tone="bahaya"
                                    />
                                )
                            }
                            kosong="Belum ada data survey"
                        />
                    </div>

                    {/* Desktop: tabel lama tetap dipakai dari xl ke atas */}
                    <div className="hidden xl:block">
                        <Table headers={['Nama Site', 'Tanggal Survey', 'Surveyor', 'Lokasi', 'Aksi']}>
                            {paginatedRecent.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400 font-medium">
                                        Belum ada data survey
                                    </td>
                                </tr>
                            ) : (
                                paginatedRecent.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4 font-bold text-gray-900">{row.nama_site}</td>
                                        <td className="px-6 py-4 text-center text-gray-500">{row.tanggal_survey}</td>
                                        <td className="px-6 py-4 text-center font-medium text-gray-700">{row.nama_surveyor}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {row.lokasi || '-'}
                                            {row.latitude && (
                                                <div className="mt-1">
                                                    <code className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                                        {row.latitude}, {row.longitude}
                                                    </code>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Link
                                                    href={`/survey/${row.id}`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 min-h-[44px] sm:min-h-0 rounded-lg border border-gray-300 bg-surface text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-black transition"
                                                >
                                                    Detail
                                                </Link>
                                                {/* Hapus tampil hanya bila peran/pemilik baris mengizinkan */}
                                                {bolehHapus(row) && (
                                                    <AksiBaris
                                                        label={`Hapus Survey ${row.nama_site || ''}`}
                                                        onClick={() => setPendingHapus(row)}
                                                        ikon={Trash2}
                                                        tone="bahaya"
                                                    />
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </Table>
                    </div>

                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={filteredRecent.length}
                        itemsPerPage={itemsPerPage}
                    />
                </Card>

                <Card title="Peta & Panduan Lapangan">
                    <div className="space-y-4 text-xs text-gray-600">
                        <div className="p-3 bg-teal-50 border border-teal-100 rounded-lg text-teal-900">
                            <h5 className="font-bold mb-1">Standard ODC Survey</h5>
                            <p className="leading-relaxed">Pastikan koordinat GPS presisi dan foto terdokumentasi lengkap (Depan, Dalam, Samping, Detail Grounding).</p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                <span>Gunakan kamera HP dengan geotagging aktif</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                <span>Isi semua form checklist template dengan lengkap</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                <span>Sync data ketika sinyal internet stabil</span>
                            </div>
                        </div>
                        <div className="pt-2 border-t">
                            <Link href="/instruction" className="text-xs font-bold text-primary hover:underline">
                                Lihat Panduan Teknis (SOW) &rarr;
                            </Link>
                        </div>
                    </div>
                </Card>
            </div>

            <ConfirmationModal
                isOpen={pendingHapus !== null}
                onClose={() => setPendingHapus(null)}
                onConfirm={kirimHapus}
                title="Hapus Survey"
                message={`Data survey site ${pendingHapus?.nama_site || '-'} beserta seluruh checkpoint dan fotonya akan dihapus permanen. Lanjutkan?`}
                type="danger"
                confirmText="Ya, Hapus"
            />
        </>
    );
}

SurveyDashboard.layout = page => <AppLayout children={page} />;
