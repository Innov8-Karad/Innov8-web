import type { ReactNode } from 'react';

interface FormFieldProps {
    label: string;
    children: ReactNode;
    htmlFor?: string;
    required?: boolean;
}

export function FormField({ label, children, htmlFor, required }: FormFieldProps) {
    return (
        <div className="form-field">
            <label htmlFor={htmlFor}>
                {label} {required && <span className="text-red-500" style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>}
            </label>
            {children}
        </div>
    );
}

interface FormRowProps {
    children: ReactNode;
}

export function FormRow({ children }: FormRowProps) {
    return <div className="form-row">{children}</div>;
}

interface FormActionsProps {
    children: ReactNode;
    style?: React.CSSProperties;
}

export function FormActions({ children, style }: FormActionsProps) {
    return <div className="form-actions" style={style}>{children}</div>;
}
