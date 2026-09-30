import React from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Breadcrumbs from '../../Components/Breadcrumbs';
import MaterialRequestForm from './Components/MaterialRequestForm';
import { ArrowLeft } from 'lucide-react';

export default function Create({ uomList = [], barangList = [], defaultTtd = {}, defaultRequestor = '', tanggalHariIni = '' }) {
    return (
        <>
            <Head title="Buat Request Material - Web CME" />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Request Material', href: '/material-request' },
                { label: 'Buat Baru' },
            ]} />

            <div className="mb-6 flex items-center gap-3">
                <Link
                    href="/material-request"
                    className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-lg border border-border bg-surface text-gray-500 hover:bg-gray-50 hover:text-black transition"
                >
                    <ArrowLeft className="h-4 w-4 stroke-[1.5]" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines">
                        Form Request Material
                    </h1>
                    <p className="text-sm text-gray-500 font-headlines">
                        Nomor pengajuan dibuat otomatis saat data disimpan.
                    </p>
                </div>
            </div>

            <div className="max-w-5xl">
                <MaterialRequestForm
                    uomList={uomList}
                    barangList={barangList}
                    defaultTtd={defaultTtd}
                    defaultRequestor={defaultRequestor}
                    tanggalHariIni={tanggalHariIni}
                    submitUrl="/material-request/baru"
                    submitLabel="Simpan"
                />
            </div>
        </>
    );
}

Create.layout = page => <AppLayout children={page} />;
