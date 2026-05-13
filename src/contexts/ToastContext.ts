import { createContext } from 'react';

export type ToastType = 'success' | 'error' | 'warning';

export interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);
