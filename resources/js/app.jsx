import '../css/app.css';

import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import ErrorBoundary from './Components/ErrorBoundary';
const appName = import.meta.env.VITE_APP_NAME || 'CME System';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./Pages/${name}.jsx`, import.meta.glob('./Pages/**/*.jsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(<ErrorBoundary><App {...props} /></ErrorBoundary>);
    },
    progress: {
        color: '#0F766E',
    },
});
