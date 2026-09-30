import React from 'react';

export default function Table({
    headers = [],
    className = '',
    children,
    ...props
}) {
    return (
        <div className={`overflow-x-auto w-full border border-border rounded-lg ${className}`}>
            <table {...props} className="min-w-full divide-y divide-border text-sm text-left">
                <thead className="bg-surface text-text border-b border-border">
                    <tr>
                        {headers.map((head, idx) => (
                            <th
                                key={idx}
                                scope="col"
                                className="px-3 py-3 font-semibold text-xs uppercase tracking-wider text-center sm:px-6"
                            >
                                {head}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-border">
                    {children}
                </tbody>
            </table>
        </div>
    );
}
