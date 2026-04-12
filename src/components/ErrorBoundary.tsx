import React, { Component, type ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    background: 'var(--bg-main, #0a0e1a)',
                    color: 'var(--text-main, #e0e0e0)',
                    padding: '32px',
                    textAlign: 'center',
                }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '24px',
                    }}>
                        <AlertTriangle size={40} color="#ef4444" />
                    </div>

                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px' }}>
                        Something went wrong
                    </h1>

                    <p style={{
                        opacity: 0.6,
                        maxWidth: '400px',
                        lineHeight: 1.6,
                        marginBottom: '8px',
                    }}>
                        An unexpected error occurred. Please try again or refresh the page.
                    </p>

                    {this.state.error && (
                        <pre style={{
                            fontSize: '0.75rem',
                            opacity: 0.4,
                            maxWidth: '500px',
                            overflow: 'auto',
                            marginBottom: '24px',
                            padding: '12px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                        }}>
                            {this.state.error.message}
                        </pre>
                    )}

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={this.handleReset}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: 'var(--primary, #6366f1)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}
                        >
                            <RefreshCw size={18} />
                            Try Again
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: 'transparent',
                                color: 'var(--text-secondary, #94a3b8)',
                                border: '1px solid var(--divider, rgba(255,255,255,0.1))',
                                borderRadius: '12px',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            Refresh Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
