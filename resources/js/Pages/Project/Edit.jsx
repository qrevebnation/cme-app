import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/Card';
import Input from '../../Components/Input';
import StatefulButton from '../../Components/StatefulButton';
import Breadcrumbs from '../../Components/Breadcrumbs';
import { ArrowLeft } from 'lucide-react';

export default function Edit({ project }) {
    const { data, setData, post, processing, errors } = useForm({
        nama: project.nama || '', deskripsi: project.deskripsi || '',
        mulai: project.mulai || '', deadline: project.deadline || '',
        status: project.status || 'on_track',
    });

    const submit = (e) => { e.preventDefault(); post(`/proyek/${project.id}/edit`); };

    return (
        <>
            <Head title={`Ubah ${project.nama}`} />
            <Breadcrumbs items={[{ label: 'Proyek', href: '/proyek' }, { label: project.nama, href: `/proyek/${project.id}` }, { label: 'Ubah' }]} />
            <Card>
                <Link href={`/proyek/${project.id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"><ArrowLeft className="h-4 w-4" /> Kembali</Link>
                <form onSubmit={submit} className="space-y-4">
                    <Input label="Nama proyek" value={data.nama} onChange={(e) => setData('nama', e.target.value)} error={errors.nama} required />
                    <Input label="Deskripsi" type="textarea" value={data.deskripsi} onChange={(e) => setData('deskripsi', e.target.value)} error={errors.deskripsi} />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Input label="Mulai" type="date" value={data.mulai} onChange={(e) => setData('mulai', e.target.value)} error={errors.mulai} />
                        <Input label="Tenggat" type="date" value={data.deadline} onChange={(e) => setData('deadline', e.target.value)} error={errors.deadline} />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-text">Status</label>
                        <select value={data.status} onChange={(e) => setData('status', e.target.value)} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text">
                            <option value="on_track">On Track</option>
                            <option value="complete">Selesai</option>
                        </select>
                        {errors.status && <p className="mt-1 text-xs text-red-600">{errors.status}</p>}
                    </div>
                    <StatefulButton type="submit" loading={processing}>Simpan Perubahan</StatefulButton>
                </form>
            </Card>
        </>
    );
}

Edit.layout = page => <AppLayout children={page} />;
