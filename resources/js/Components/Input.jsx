import React, { useEffect, useId, useRef } from 'react';

export default function Input({
    type = 'text',
    className = '',
    isFocused = false,
    label = '',
    error = '',
    ...props
}) {
    const inputRef = useRef();
    const idOtomatis = useId();
    const idInput = props.id ?? idOtomatis;

    useEffect(() => {
        if (isFocused) {
            inputRef.current.focus();
        }
    }, [isFocused]);

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={idInput} className="block font-medium text-xs text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <input
                {...props}
                id={idInput}
                type={type}
                ref={inputRef}
                className={
                    `w-full border-border rounded-md shadow-sm text-sm p-2 focus:border-primary focus:ring focus:ring-primary/20 outline-none transition ` +
                    (props.disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-75 border-gray-200 select-none ' : 'bg-surface ') +
                    (error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : '') +
                    ` ` +
                    className
                }
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
}
