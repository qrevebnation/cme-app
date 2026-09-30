import React, { useMemo, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Card from '../../Components/Card';
import Input from '../../Components/Input';
import StatefulButton from '../../Components/StatefulButton';
import Breadcrumbs from '../../Components/Breadcrumbs';
import Cascader from '../../Components/Cascader';
import { ArrowLeft, PackageSearch } from 'lucide-react';

export default function Create({ tools = [], defaults = {} }) {
    const [selectedTool, setSelectedTool] = useState(null);
    const [statusSimpan, setStatusSimpan] = useState('idle');

    const { data, setData, post, processing, errors } = useForm({
        barang_id: '',
        jumlah: 1,
        peminjam: '',
        mengetahui: '',
        tgl_pinjam: defaults.tgl_pinjam || new Date().toISOString().split('T')[0],
        rencana_kembali: '',
        keperluan: '',
        lokasi: '',
    });

    const tersedia = selectedTool ? selectedTool.tersedia : 0;

    const pohonTools = useMemo(() => {
        const perKategori = new Map();
        for (const t of tools) {
            const kat = t.kategori || 'Tanpa kategori';
            const tipe = t.tipe || 'Tanpa tipe';
            if (!perKategori.has(kat)) perKategori.set(kat, new Map());
            const perTipe = perKategori.get(kat);
            if (!perTipe.has(tipe)) perTipe.set(tipe, []);
            perTipe.get(tipe).push({
                value: t.id,
                label: `${t.tipe}${t.merek ? ` · ${t.merek}` : ''}`,
                description:
                    t.tersedia <= 0 ? `habis dipinjam (stok ${t.stok})` : `tersedia ${t.tersedia} dari ${t.stok}`,
                disabled: t.tersedia <= 0,
                meta: t,
            });
        }
        return [...perKategori].map(([kat, perTipe]) => ({
            value: kat,
            label: kat,
            children: [...perTipe].map(([tipe, item]) => ({ value: tipe, label: tipe, children: item })),
        }));
    }, [tools]);

    const handleToolChange = (value, meta) => {
        const tool = meta ?? tools.find((t) => String(t.id) === String(value)) ?? null;
        setSelectedTool(tool);
        setData('barang_id', value);

        const max = tool && tool.tersedia > 0 ? tool.tersedia : 1;
        if (parseInt(data.jumlah, 10) > max) {
            setData('jumlah', max);
        }
    };

    const handleJumlahChange = (e) => {
        let value = parseInt(e.target.value, 10);
        if (isNaN(value) || value < 1) value = 1;
        if (selectedTool && value > selectedTool.tersedia) value = selectedTool.tersedia;
        setData('jumlah', value);
    };

    const statusTombol = processing ? 'loading' : statusSimpan;

    const handleSubmit = (e) => {
        e.preventDefault();
        post('/tools/baru', {
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
            <Head title="Pinjamkan Tool - Web CME" />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Inventory', href: '/gudang' },
                { label: 'Peminjaman Tools', href: '/tools' },
                { label: 'Pinjamkan Tool' }
            ]} />

            <div className="mb-6 flex items-center gap-3">
                <Link
                    href="/tools"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-surface text-gray-500 hover:bg-gray-50 hover:text-black transition sm:h-9 sm:w-9"
                >
                    <ArrowLeft className="h-4 w-4 stroke-[1.5]" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines">
                        Pinjamkan Tool
                    </h1>
                    <p className="text-sm text-gray-500 font-headlines mt-1">
                        Catat peminjaman peralatan kerja. Nomor form dibuat otomatis oleh sistem.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <Card title="Data Peminjaman">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Trigger Cascader dinaikkan ke 44 px hanya di ponsel (mekanisme pemilih tidak diubah). */}
                        <div className="md:col-span-2 [&>div>button]:h-11 sm:[&>div>button]:h-auto">
                            <label className="block font-medium text-xs text-gray-700 mb-1">Tool</label>
                            <Cascader
                                tree={pohonTools}
                                value={data.barang_id}
                                onChange={handleToolChange}
                                placeholder="Pilih tool"
                                kosongTeks="Tool tidak ditemukan."
                                error={errors.barang_id}
                            />
                            <div className="mt-1 text-[11px] text-gray-500 font-body">
                                {selectedTool ? (
                                    <span className="inline-flex items-center gap-1.5">
                                        <PackageSearch className="h-3.5 w-3.5 stroke-[1.5]" />
                                        {selectedTool.kategori} · stok {selectedTool.stok} unit · sedang dipinjam {selectedTool.dipinjam} unit ·
                                        <strong className="text-gray-800"> tersedia {selectedTool.tersedia} unit</strong>
                                    </span>
                                ) : (
                                    <span>Pilih tool untuk melihat ketersediaan unitnya.</span>
                                )}
                            </div>
                        </div>

                        <Input
                            type="number"
                            label="Jumlah"
                            min="1"
                            max={tersedia > 0 ? tersedia : 1}
                            value={data.jumlah}
                            onChange={handleJumlahChange}
                            error={errors.jumlah}
                        />
                        <Input
                            label="Peminjam"
                            value={data.peminjam}
                            onChange={(e) => setData('peminjam', e.target.value)}
                            error={errors.peminjam}
                            required
                        />
                        <Input
                            label="Yang Mengetahui"
                            placeholder="Nama penanggung jawab"
                            value={data.mengetahui}
                            onChange={(e) => setData('mengetahui', e.target.value)}
                            error={errors.mengetahui}
                        />
                        <Input
                            label="Lokasi / Proyek"
                            value={data.lokasi}
                            onChange={(e) => setData('lokasi', e.target.value)}
                            error={errors.lokasi}
                        />
                        <Input
                            type="date"
                            label="Tanggal Pinjam"
                            value={data.tgl_pinjam}
                            onChange={(e) => setData('tgl_pinjam', e.target.value)}
                            error={errors.tgl_pinjam}
                            required
                        />
                        <Input
                            type="date"
                            label="Rencana Kembali"
                            value={data.rencana_kembali}
                            onChange={(e) => setData('rencana_kembali', e.target.value)}
                            error={errors.rencana_kembali}
                        />
                        <div className="md:col-span-2">
                            <Input
                                label="Keperluan"
                                value={data.keperluan}
                                onChange={(e) => setData('keperluan', e.target.value)}
                                error={errors.keperluan}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col-reverse gap-2 pt-4 mt-4 border-t border-gray-100 sm:flex-row sm:justify-end">
                        <Link
                            href="/tools"
                            className="inline-flex h-11 w-full items-center justify-center px-4 py-2 border border-border rounded-md bg-surface text-text hover:bg-primary/5 hover:text-primary text-xs font-semibold uppercase tracking-widest transition sm:h-auto sm:w-auto"
                        >
                            Batal
                        </Link>
                        <StatefulButton type="submit" status={statusTombol} className="h-11 w-full sm:h-auto sm:w-auto">
                            Simpan Peminjaman
                        </StatefulButton>
                    </div>
                </Card>
            </form>
        </>
    );
}

Create.layout = page => <AppLayout children={page} />;
