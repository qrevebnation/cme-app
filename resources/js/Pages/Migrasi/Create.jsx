import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/Card';
import Input from '../../Components/Input';
import Select from '../../Components/Select';
import StatefulButton from '../../Components/StatefulButton';
import Breadcrumbs from '../../Components/Breadcrumbs';
import { ArrowLeft } from 'lucide-react';

export default function Create({ jenisList = [], statusList = [], satuanList = [] }) {
    const [statusSimpan, setStatusSimpan] = useState('idle');

    const { data, setData, post, processing, errors } = useForm({
        site: '',
        jenis: 'busbar',
        detail: '',
        qty: 1,
        satuan: 'Unit',
        status: 'diajukan',
    });

    const statusTombol = processing ? 'loading' : statusSimpan;

    const handleSubmit = (e) => {
        e.preventDefault();
        post('/migrasi/baru', {
            onStart: () => setStatusSimpan('idle'),
            onSuccess: (halaman) => {
                const flash = halaman?.props?.flash;
                setStatusSimpan(flash?.error || flash?.warning ? 'gagal' : 'sukses');
            },
            onError: () => setStatusSimpan('gagal'),
        });
    };

    return (
        <>
            <Head title="Tambah Kebutuhan Migrasi - Web CME" />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Kebutuhan Migrasi', href: '/migrasi' },
                { label: 'Tambah' },
            ]} />

            <div className="mb-6 flex items-center gap-3">
                <Link
                    href="/migrasi"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-surface text-gray-500 hover:bg-gray-50 hover:text-black transition sm:h-9 sm:w-9"
                >
                    <ArrowLeft className="h-4 w-4 stroke-[1.5]" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-text font-headlines">
                        Tambah Kebutuhan Migrasi
                    </h1>
                    <p className="text-sm text-text-muted font-headlines mt-1">
                        Catat kebutuhan migrasi baru per site.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <Card title="Data Kebutuhan">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Site"
                            value={data.site}
                            onChange={(e) => setData('site', e.target.value)}
                            error={errors.site}
                            required
                        />
                        <Select
                            label="Jenis"
                            value={data.jenis}
                            onChange={(e) => setData('jenis', e.target.value)}
                            options={jenisList.map((j) => ({ value: j, label: j }))}
                            error={errors.jenis}
                        />
                        <div className="md:col-span-2">
                            <Input
                                label="Detail"
                                value={data.detail}
                                onChange={(e) => setData('detail', e.target.value)}
                                error={errors.detail}
                            />
                        </div>
                        <Input
                            type="number"
                            label="Qty"
                            min="1"
                            value={data.qty}
                            onChange={(e) => setData('qty', e.target.value)}
                            error={errors.qty}
                        />
                        <Select
                            label="Satuan"
                            value={data.satuan}
                            onChange={(e) => setData('satuan', e.target.value)}
                            options={satuanList.map((s) => ({ value: s, label: s }))}
                            error={errors.satuan}
                        />
                        <Select
                            label="Status"
                            value={data.status}
                            onChange={(e) => setData('status', e.target.value)}
                            options={statusList.map((s) => ({ value: s, label: s }))}
                            error={errors.status}
                        />
                    </div>

                    <div className="flex flex-col-reverse gap-2 pt-4 mt-4 border-t border-gray-100 sm:flex-row sm:justify-end">
                        <Link
                            href="/migrasi"
                            className="inline-flex h-11 w-full items-center justify-center px-4 py-2 border border-border rounded-md bg-surface text-text hover:bg-primary/5 hover:text-primary text-xs font-semibold uppercase tracking-widest transition sm:h-auto sm:w-auto"
                        >
                            Batal
                        </Link>
                        <StatefulButton type="submit" status={statusTombol} className="h-11 w-full sm:h-auto sm:w-auto">
                            Simpan
                        </StatefulButton>
                    </div>
                </Card>
            </form>
        </>
    );
}

Create.layout = page => <AppLayout children={page} />;
