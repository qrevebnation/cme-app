import React from 'react';
import { useForm, Head } from '@inertiajs/react';
import Button from '../Components/Button';
import Input from '../Components/Input';
import PasswordField from '../Components/PasswordField';
import Alert from '../Components/Alert';
import { Zap } from 'lucide-react';

export default function Login({ status, message }) {
    const { data, setData, post, processing, errors } = useForm({
        username: '',
        password: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post('/login');
    };

    return (
        <div className="min-h-screen bg-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-body">
            <Head title="Login - Web CME" />

            <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center justify-center text-center">
                <div className="flex items-center gap-2">
                    <Zap className="h-8 w-8 text-primary fill-primary stroke-[1.5]" />
                    <h2 className="text-3xl font-bold tracking-wider font-headlines text-text">
                        CME <span className="text-primary">APP</span>
                    </h2>
                </div>
                <p className="mt-2 text-sm text-text/75 font-headlines">
                    Central Monitoring &amp; Evaluation
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-surface py-8 px-4 border border-border sm:rounded-lg sm:px-10 shadow-sm">
                    {/* Display session feedback alert */}
                    {message && (
                        <Alert
                            variant={status === 'error' ? 'error' : status === 'warning' ? 'warning' : 'success'}
                            message={message}
                            className="mb-6"
                        />
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <Input
                            label="Username"
                            type="text"
                            name="username"
                            value={data.username}
                            onChange={(e) => setData('username', e.target.value)}
                            error={errors.username}
                            placeholder="Masukkan username Anda"
                            required
                            isFocused
                        />

                        <PasswordField
                            label="Password"
                            name="password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            error={errors.password}
                            placeholder="Masukkan password Anda"
                            required
                        />

                        <div>
                            <Button
                                type="submit"
                                variant="primary"
                                className="w-full justify-center py-2.5 font-bold uppercase tracking-wider text-xs"
                                processing={processing}
                            >
                                Masuk ke Dashboard
                            </Button>
                        </div>
                    </form>

                    {/* Kredit tim: flex-wrap supaya turun baris rapi, tidak menggeser lebar kartu di ponsel */}
                    <div className="mt-6 pt-4 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-center">
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest whitespace-nowrap">
                            &copy; {new Date().getFullYear()} PT. Integrasi Jaringan Ekosistem
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest whitespace-nowrap">
                            &middot; Pembuat: Dafa
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest whitespace-nowrap">
                            &middot; Frontend: Efraim
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest whitespace-nowrap">
                            &middot; Logic: Rochman
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
