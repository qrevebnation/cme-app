import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/Card';
import Table from '../../Components/Table';
import CompactList from '../../Components/CompactList';
import Button from '../../Components/Button';
import PasswordField from '../../Components/PasswordField';
import ConfirmationModal from '../../Components/ConfirmationModal';
import { Shield, Key, User, Clock, CheckCircle2 } from 'lucide-react';
import Search, { filterData } from '../../Components/Search';
import Pagination from '../../Components/Pagination';
import Breadcrumbs from '../../Components/Breadcrumbs';

export default function Show({ user, logs, permissions }) {
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const handleSearchChange = (query) => {
        setSearchQuery(query);
        setCurrentPage(1);
    };

    const filteredLogs = filterData(logs, searchQuery);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const { data, setData, post, reset, errors, processing } = useForm({
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        // Trigger confirmation modal
        setConfirmModal({
            isOpen: true,
            title: 'Konfirmasi Ubah Password',
            message: 'Apakah Anda yakin ingin mengubah password akun Anda? Perubahan ini akan segera aktif pada login berikutnya.',
            type: 'warning',
            onConfirm: () => {
                post('/profile/change-password', {
                    preserveScroll: true,
                    onSuccess: () => {
                        reset('current_password', 'new_password', 'new_password_confirmation');
                    }
                });
            }
        });
    };

    return (
        <>
            <Head title="Profil Saya - Web CME" />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Profil Saya' }
            ]} />

            <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines">
                    Profil Saya
                </h1>
                <p className="text-sm text-gray-500 font-headlines mt-1">
                    Kelola informasi akun Anda, lihat wewenang akses, dan perbarui sandi.
                </p>
            </div>

            {/* Kartu bertumpuk satu kolom di ponsel; sidebar baru berdampingan pada lg agar tabel log tetap lebar. */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                {/* Main Content Area (Left/Center: Profile details & Logs) */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Profile & Permissions Card */}
                    <Card title="📄 Informasi Akun & Wewenang">
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-gray-50 p-4 rounded-lg border border-border">
                                <div className="p-3.5 bg-primary/10 rounded-full text-primary dark:text-primary-strong shrink-0 self-start sm:self-auto">
                                    <User className="h-8 w-8 stroke-[1.5]" />
                                </div>
                                <div className="min-w-0 space-y-1">
                                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Username</div>
                                    <div className="break-all text-lg font-bold text-gray-900">{user.username}</div>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary dark:text-primary-strong border border-primary/20 uppercase tracking-wider">
                                            {user.role}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 border-b border-border pb-2">
                                    <Shield className="h-4 w-4 text-primary stroke-[1.5]" />
                                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Hak Akses & Fitur Aktif</h4>
                                </div>
                                {/* Satu kolom sampai md supaya label wewenang tidak berdesakan di layar sempit. */}
                                <ul className="grid grid-cols-1 gap-2 text-xs text-gray-600 font-medium pl-1 md:grid-cols-2">
                                    {permissions.map((perm, idx) => (
                                        <li key={idx} className="flex items-start gap-2">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-ok shrink-0 mt-0.5 stroke-[1.5]" />
                                            <span>{perm}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </Card>

                    {/* Recent Login logs */}
                    <Card title="⏰ Riwayat Aktivitas Masuk">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3 mb-4">
                            <Search value={searchQuery} onChange={handleSearchChange} />
                        </div>

                        {/* Ponsel: daftar rapat satu baris per log, tabel 6 kolom disembunyikan di bawah xl. */}
                        <div className="xl:hidden">
                            <CompactList
                                rows={paginatedLogs}
                                kunci={(log) => log.id}
                                judul={(log) => log.created_at}
                                nuansa={(log) => (
                                    <span
                                        className={`inline-block shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                            log.status === 'success'
                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                                                : 'bg-rose-50 text-rose-800 border-rose-100'
                                        }`}
                                    >
                                        {log.status}
                                    </span>
                                )}
                                meta={(log) => [log.ip_address || '-', log.browser || '-', log.os || '-', log.device || '-']}
                                kosong="Belum ada data aktivitas login"
                            />
                        </div>

                        <div className="hidden xl:block">
                            <Table headers={['Waktu', 'Status', 'IP Address', 'Browser', 'Sistem Operasi', 'Perangkat']}>
                                {paginatedLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-400 font-medium">
                                            Belum ada data aktivitas login
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50/50">
                                            <td className="px-6 py-3.5 text-center text-xs text-gray-500 whitespace-nowrap">{log.created_at}</td>
                                            <td className="px-6 py-3.5 text-center">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                        log.status === 'success'
                                                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                                                            : 'bg-rose-50 text-rose-800 border border-rose-100'
                                                    }`}
                                                >
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5 text-center font-mono text-xs text-gray-600">{log.ip_address || '-'}</td>
                                            <td className="px-6 py-3.5 text-center text-xs text-gray-700">{log.browser || '-'}</td>
                                            <td className="px-6 py-3.5 text-center text-xs text-gray-700">{log.os || '-'}</td>
                                            <td className="px-6 py-3.5 text-center">
                                                <span
                                                    className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                        log.device === 'Mobile'
                                                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                                            : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                                                    }`}
                                                >
                                                    {log.device || '-'}
                                                </span>
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
                            totalItems={filteredLogs.length}
                            itemsPerPage={itemsPerPage}
                        />
                    </Card>
                </div>

                {/* Sidebar area: Change Password */}
                <div>
                    <Card title="🔐 Ubah Kata Sandi">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <PasswordField
                                label="Password Saat Ini"
                                value={data.current_password}
                                onChange={(e) => setData('current_password', e.target.value)}
                                error={errors.current_password}
                                placeholder="Masukkan password sekarang"
                                required
                            />

                            <PasswordField
                                label="Password Baru"
                                value={data.new_password}
                                onChange={(e) => setData('new_password', e.target.value)}
                                error={errors.new_password}
                                placeholder="Masukkan password baru"
                                required
                            />

                            <PasswordField
                                label="Konfirmasi Password Baru"
                                value={data.new_password_confirmation}
                                onChange={(e) => setData('new_password_confirmation', e.target.value)}
                                error={errors.new_password_confirmation}
                                placeholder="Ulangi password baru"
                                required
                            />

                            <Button
                                type="submit"
                                variant="primary"
                                className="w-full mt-2 h-11 sm:h-9"
                                processing={processing}
                            >
                                Perbarui Password
                            </Button>
                        </form>
                    </Card>
                </div>
            </div>

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
            />
        </>
    );
}

Show.layout = page => <AppLayout children={page} />;
