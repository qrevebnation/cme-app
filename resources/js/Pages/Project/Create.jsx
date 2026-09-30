import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/Card';
import Input from '../../Components/Input';
import StatefulButton from '../../Components/StatefulButton';
import Breadcrumbs from '../../Components/Breadcrumbs';
import { ArrowLeft } from 'lucide-react';

export default function Create({ users = [] }) {
    const { data, setData, post, processing, errors } = useForm({
        nama: '', deskripsi: '', mulai: '', deadline: '', status: 'on_track', brief: '', members: [],
    });

    const toggleMember = (id) => {
        setData('members', data.members.includes(id) ? data.members.filter((m) => m !== id) : [...data.members, id]);
    };

    const submit = (e) => { e.preventDefault(); post('/proyek/baru'); };

    return (
        <>
            <Head title="Proyek Baru" />
            <Breadcrumbs items={[{ label: 'Proyek', href: '/proyek' }, { label: 'Baru' }]} />
            <Card>
                <Link href="/proyek" className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"><ArrowLeft className="h-4 w-4" /> Kembali</Link>
                <form onSubmit={submit} className="space-y-4">
                    <Input label="Nama proyek" value={data.nama} onChange={(e) => setData('nama', e.target.value)} error={errors.nama} required />
                    <Input label="Deskripsi" type="textarea" value={data.deskripsi} onChange={(e) => setData('deskripsi', e.target.value)} error={errors.deskripsi} />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Input label="Mulai" type="date" value={data.mulai} onChange={(e) => setData('mulai', e.target.value)} error={errors.mulai} />
                        <Input label="Tenggat" type="date" value={data.deadline} onChange={(e) => setData('deadline', e.target.value)} error={errors.deadline} />
                    </div>
                    <Input label="Brief" type="textarea" value={data.brief} onChange={(e) => setData('brief', e.target.value)} error={errors.brief} />
                    <div>
                        <p className="mb-2 text-sm font-medium text-text">Anggota tim</p>
                        <div className="flex flex-wrap gap-2">
                            {users.map((u) => (
                                <label key={u.id} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text">
                                    <input type="checkbox" checked={data.members.includes(u.id)} onChange={() => toggleMember(u.id)} className="h-4 w-4 accent-teal-700" />
                                    {u.username}
                                </label>
                            ))}
                        </div>
                    </div>
                    <StatefulButton type="submit" loading={processing}>Simpan Proyek</StatefulButton>
                </form>
            </Card>
        </>
    );
}

Create.layout = page => <AppLayout children={page} />;
