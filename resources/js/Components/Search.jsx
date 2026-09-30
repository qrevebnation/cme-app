import React from 'react';
import { Search as SearchIcon, X } from 'lucide-react';

export default function Search({
    value,
    onChange,
    placeholder = 'Cari data...',
    className = '',
    ...props
}) {
    return (
        <div className={`relative w-full md:w-72 ${className}`}>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-4 w-4 text-gray-400 stroke-[1.5]" />
            </div>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-9 pr-8 py-1.5 border border-border rounded-lg shadow-sm text-sm focus:border-primary focus:ring focus:ring-primary/20 outline-none transition bg-surface text-text placeholder-gray-400 font-body"
                {...props}
            />
            {value && (
                <button
                    onClick={() => onChange('')}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-text transition"
                    type="button"
                >
                    <X className="h-4 w-4 stroke-[1.5]" />
                </button>
            )}
        </div>
    );
}

// Deep text matching search logic helper
export function filterData(data, query) {
    if (!query) return data;
    const lowerQuery = query.toLowerCase();

    const deepMatch = (val) => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'object') {
            return Object.values(val).some(deepMatch);
        }
        return String(val).toLowerCase().includes(lowerQuery);
    };

    return data.filter(item => deepMatch(item));
}
