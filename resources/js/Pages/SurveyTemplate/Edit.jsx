import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '../../Layouts/AppLayout';
import Button from '../../Components/Button';
import Breadcrumbs from '../../Components/Breadcrumbs';
import TemplateEditor from './Components/TemplateEditor';
import { ClipboardList, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function Edit({ template }) {
    const { data, setData, post, processing, errors } = useForm({
        title: template.title || '',
        categories: template.categories || [],
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(`/survey-template/${template.id}/edit`);
    };

    return (
        <>
            <Head title={`Edit Template Survey - ${template.title}`} />

            <Breadcrumbs items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Template Survey', href: '/survey-template' },
                { label: `Edit: ${template.title}` }
            ]} />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-headlines flex items-center gap-2.5">
                        <ClipboardList className="h-6 w-6 text-primary stroke-[1.5]" />
                        Edit Template Survey
                    </h1>
                    <p className="text-sm text-gray-500 font-headlines mt-1">
                        Perbarui kategori dan item checklist pada template ini.
                    </p>
                </div>
                <div>
                    <Link
                        href="/survey-template"
                        className="inline-flex h-11 sm:h-9 items-center justify-center gap-1.5 px-3.5 border border-gray-300 bg-surface hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg transition shadow-xs"
                    >
                        <ArrowLeft className="h-4 w-4 stroke-[1.5]" />
                        Kembali
                    </Link>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                <TemplateEditor data={data} setData={setData} errors={errors} />

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                    <Link
                        href="/survey-template"
                        className="inline-flex h-11 sm:h-9 items-center justify-center px-4 border border-gray-300 bg-surface hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-lg transition"
                    >
                        Batal
                    </Link>
                    <Button
                        type="submit"
                        processing={processing}
                        className="h-11 sm:h-9 px-6"
                    >
                        {processing ? 'Menyimpan Perubahan...' : (
                            <>
                                <CheckCircle2 className="h-4 w-4 stroke-[2]" />
                                Perbarui Template
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </>
    );
}

Edit.layout = (page) => <AppLayout children={page} />;
