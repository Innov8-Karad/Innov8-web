import type { ReactNode } from 'react';

interface FormFieldProps {
    label: string;
    children: ReactNode;
    htmlFor?: string;
}

export function FormField({ label, children, htmlFor }: FormFieldProps) {
    return (
        <div className="form-field">
            <label htmlFor={htmlFor}>{label}</label>
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
}

export function FormActions({ children }: FormActionsProps) {
    return <div className="form-actions">{children}</div>;
}
