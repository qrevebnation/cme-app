import React from 'react';
import { CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export default function Alert({
    variant = 'info',
    message = '',
    className = '',
    children,
    ...props
}) {
    const styles = {
        info: "bg-blue-50 border-blue-200 text-blue-800",
        success: "bg-emerald-50 border-emerald-200 text-emerald-800",
        warning: "bg-amber-50 border-amber-200 text-amber-800",
        error: "bg-rose-50 border-rose-200 text-rose-800",
    };

    const icons = {
        info: <Info className="h-4 w-4 stroke-[1.5]" />,
        success: <CheckCircle className="h-4 w-4 stroke-[1.5]" />,
        warning: <AlertTriangle className="h-4 w-4 stroke-[1.5]" />,
        error: <AlertCircle className="h-4 w-4 stroke-[1.5]" />,
    };

    return (
        <div
            {...props}
            className={`border rounded-lg p-4 flex items-start gap-3 text-sm ${styles[variant]} ${className}`}
        >
            <div className="flex-shrink-0 mt-0.5">{icons[variant]}</div>
            <div className="flex-grow">
                {message || children}
            </div>
        </div>
    );
}
