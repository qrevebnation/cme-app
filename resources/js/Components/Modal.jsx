import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = 'max-w-md'
}) {
    // Handle ESC key press
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    {/* Backdrop Overlay */}
                    <motion.div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Modal Content Dialog */}
                    <motion.div
                        className={`bg-surface rounded-xl shadow-2xl w-full ${size} z-10 overflow-hidden relative border border-gray-100 flex flex-col`}
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 15 }}
                        transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
                    >
                        {/* Header */}
                        {title ? (
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                <h3 className="text-base font-bold text-gray-900 font-headlines">{title}</h3>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-1.5 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-lg text-gray-400 hover:bg-primary/10 hover:text-primary dark:text-primary-strong border border-transparent hover:border-primary/20 transition"
                                >
                                    <X className="h-5 w-5 stroke-[1.5]" />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={onClose}
                                className="absolute top-4 right-4 bg-primary hover:bg-primary/80 text-primary-foreground p-2 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full shadow-md transition-all duration-200 hover:scale-105 z-20"
                            >
                                <X className="h-5 w-5 stroke-[1.5]" />
                            </button>
                        )}

                        {/* Body */}
                        <div className="p-6 overflow-y-auto max-h-[80vh]">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
