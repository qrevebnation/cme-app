import React from 'react';

export default function Button({
    type = 'button',
    className = '',
    processing = false,
    variant = 'primary',
    children,
    ...props
}) {
    const baseStyle = "inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] sm:min-h-0 border rounded-md font-semibold text-xs uppercase tracking-widest transition ease-in-out duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-primary border-transparent text-primary-foreground hover:bg-primary/90 active:bg-primary/95 focus:ring-primary",
        secondary: "bg-primary/10 border-transparent text-primary dark:text-primary-strong hover:bg-primary/20 active:bg-primary/25 focus:ring-primary",
        outline: "bg-surface border-border text-text hover:bg-primary/5 hover:text-primary hover:border-primary focus:ring-primary",
        danger: "bg-ng border-transparent text-ng-foreground hover:bg-ng/90 active:bg-ng/95 focus:ring-ng",
    };

    return (
        <button
            {...props}
            type={type}
            className={`${baseStyle} ${variants[variant]} ${className}`}
            disabled={processing || props.disabled}
        >
            {processing && (
                <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            )}
            {children}
        </button>
    );
}
