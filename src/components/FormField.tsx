import React, { type ReactNode } from 'react';

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
    className?: string;
}

export function FormRow({ children, className }: FormRowProps) {
    return <div className={`form-row ${className || ''}`}>{children}</div>;
}

interface FormActionsProps {
    children: ReactNode;
    className?: string;
}

export function FormActions({ children, className }: FormActionsProps) {
    return <div className={`form-actions ${className || ''}`}>{children}</div>;
}

interface BadgeProps {
  children: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'accent-blue' | 'neutral';
  className?: string;
}

export function Badge({ children, color = 'neutral', className = '' }: BadgeProps) {
  const colorMap = {
    primary: 'bg-primary-light text-primary',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
    'accent-blue': 'bg-blue-100 text-blue-700',
    neutral: 'bg-gray-100 text-gray-700',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colorMap[color]} ${className}`}>
      {children}
    </span>
  );
}

