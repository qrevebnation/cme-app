import { Head } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import TrendAreaChart from './Components/TrendAreaChart';
import OperationalPanels from './Components/OperationalPanels';
import RecentAtpTable from './Components/RecentAtpTable';

export default function CmeDashboard({
    stats = {},
    recentAtp = [],
    trend = [],
    gudangTerbaru = {},
    toolsTerbaru = [],
    requestTerbaru = [],
}) {
    return (
        <>
            <Head title="Dashboard - Web CME" />

            {/* Jarak antar panel lebih rapat di ponsel agar tidak perlu banyak menggulir */}
            <div className="space-y-4 px-1 sm:space-y-6 lg:px-2">
                <div className="flex flex-col gap-1">
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
                    <p className="text-sm text-slate-500">
                        Ringkasan operasional: tren dokumen, aktivitas gudang, peminjaman alat, dan permintaan barang.
                    </p>
                </div>

                <TrendAreaChart trend={trend} />
                <OperationalPanels
                    gudangTerbaru={gudangTerbaru}
                    toolsTerbaru={toolsTerbaru}
                    requestTerbaru={requestTerbaru}
                />
                <RecentAtpTable recentAtp={recentAtp} />
            </div>
        </>
    );
}

CmeDashboard.layout = page => <AppLayout children={page} />;
