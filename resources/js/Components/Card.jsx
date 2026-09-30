import React from 'react';

export default function Card({
    className = '',
    title = '',
    headerActions = null,
    children,
    ...props
}) {
    return (
        <div
            {...props}
            className={`bg-surface border border-gray-200 rounded-lg shadow-sm overflow-hidden ${className}`}
        >
            {(title || headerActions) && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
                    {title && <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">{title}</h3>}
                    {headerActions && <div className="min-w-0">{headerActions}</div>}
                </div>
            )}
            <div className="px-4 py-3 sm:px-6 sm:py-4">
                {children}
            </div>
        </div>
    );
}
