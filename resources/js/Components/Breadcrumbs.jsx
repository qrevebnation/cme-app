import React from 'react';
import { Link } from '@inertiajs/react';

export default function Breadcrumbs({ items }) {
    if (!items || items.length === 0) return null;

    return (
        <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-gray-500 font-headlines">
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;
                    return (
                        <React.Fragment key={index}>
                            {index > 0 && (
                                <li className="text-gray-300 flex items-center shrink-0" aria-hidden="true">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-4 w-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m9 20.247 6-16.5" />
                                    </svg>
                                </li>
                            )}
                            <li className="flex items-center">
                                {isLast || !item.href ? (
                                    <span className="font-semibold text-gray-900 truncate max-w-[150px] sm:max-w-[300px]">
                                        {item.label}
                                    </span>
                                ) : (
                                    <Link
                                        href={item.href}
                                        className="transition-colors hover:text-primary"
                                    >
                                        {item.label}
                                    </Link>
                                )}
                            </li>
                        </React.Fragment>
                    );
                })}
            </ol>
        </nav>
    );
}
