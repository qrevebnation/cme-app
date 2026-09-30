import React from 'react';

export default function Spinner({ size = 'md', className = '' }) {
    const sizes = {
        sm: 'h-4 w-4 border-2',
        md: 'h-8 w-8 border-3',
        lg: 'h-12 w-12 border-4',
    };

    return (
        <div className="flex items-center justify-center p-2">
            <div
                className={`animate-spin rounded-full border-t-transparent border-primary ${sizes[size]} ${className}`}
            ></div>
        </div>
    );
}
