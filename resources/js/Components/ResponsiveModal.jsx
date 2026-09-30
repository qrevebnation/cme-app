import { useEffect, useState } from 'react';
import { Drawer } from 'vaul';
import Modal from './Modal';

/**
 * Modal yang menyesuaikan perangkat: drawer bawah pada layar kecil (HP lapangan),
 * modal biasa pada layar lebar. API-nya sama dengan Modal.
 */
export default function ResponsiveModal({ isOpen, onClose, title, children, size = 'max-w-md' }) {
    const [layarBesar, setLayarBesar] = useState(() =>
        typeof window === 'undefined' ? true : window.matchMedia('(min-width: 1024px)').matches,
    );

    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1024px)');
        const ubah = (e) => setLayarBesar(e.matches);
        mq.addEventListener('change', ubah);
        return () => mq.removeEventListener('change', ubah);
    }, []);

    if (layarBesar) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
                {children}
            </Modal>
        );
    }

    return (
        <Drawer.Root open={isOpen} onOpenChange={(buka) => !buka && onClose?.()}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
                <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92vh] flex-col rounded-t-2xl bg-surface outline-none">
                    <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-slate-300" />
                    {title && (
                        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                            <Drawer.Title className="text-sm font-semibold text-slate-900">{title}</Drawer.Title>
                            <button type="button" onClick={onClose} className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 text-slate-400 hover:text-slate-700">
                                ✕
                            </button>
                        </div>
                    )}
                    <div className="overflow-y-auto p-4">{children}</div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
