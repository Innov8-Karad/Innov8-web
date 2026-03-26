import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';

import logo from '../assets/logo.png';
import { UI_STRINGS } from '../constants';
import { useToast } from '../contexts/ToastContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth()!;
    const { showToast } = useToast();
    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            setLoading(true);
            await login(email, password);
            showToast("login succesfully", "success");
            navigate('/');
        } catch (err) {
            console.error("Auth error:", err);
            showToast("invalid email or passward", "error");
        }
        setLoading(false);
    }



    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            backgroundColor: '#FFFFFF',
            color: '#111827',
            overflow: 'hidden'
        }}>
            {/* Left Panel: Branding */}
            <div className="flex flex-col justify-center items-center" style={{
                flex: 1,
                padding: 'var(--space-2xl)',
                maxWidth: '60%',
                display: 'flex',
                zIndex: 1,
                borderRight: '1px solid #F3F4F6',
                backgroundColor: '#FFFFFF'
            }}>
                <div className="animate-slide-right flex flex-col items-center" style={{ marginTop: '-100px' }}>
                    <div className="logo-float" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
                        <img
                            src={logo}
                            alt="Innov8 Logo"
                            style={{
                                height: '350px',
                                width: 'auto',
                                filter: 'drop-shadow(0 0 30px rgba(var(--primary-rgb), 0.15))'
                            }}
                        />
                        <p style={{
                            fontSize: '1.25rem',
                            fontWeight: 600,
                            letterSpacing: '2px',
                            color: '#4B5563',
                            textAlign: 'center',
                            marginTop: '-120px',
                            textTransform: 'uppercase'
                        }}>
                            ELEVATING CAREERS • DEFINING FUTURES
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Panel: Login Form */}
            <div className="flex items-center justify-center" style={{
                flex: 1,
                padding: 'var(--space-xl)',
                zIndex: 2,
                backgroundColor: '#F9FAFB'
            }}>
                <div className="animate-slide-up" style={{
                    width: '100%',
                    maxWidth: '450px',
                    padding: 'var(--space-xl)',
                    borderRadius: 'var(--radius-xl)',
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    border: '1px solid #F3F4F6'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
                        <h2 style={{ fontSize: '2rem', marginBottom: 'var(--space-xs)', color: '#111827' }}>
                            {UI_STRINGS.LOGIN.TITLE}
                        </h2>
                        <p style={{ color: '#6B7280' }}>{UI_STRINGS.LOGIN.SUBTITLE}</p>
                    </div>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div className="animate-fade-in delay-200">
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '0.9rem', color: '#4B5563', fontWeight: 500 }}>{UI_STRINGS.LOGIN.EMAIL_LABEL}</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    style={{
                                        paddingLeft: '48px',
                                        backgroundColor: '#FFFFFF',
                                        border: '1px solid #E5E7EB',
                                        height: '54px',
                                        color: '#111827'
                                    }}
                                    placeholder={UI_STRINGS.LOGIN.EMAIL_PLACEHOLDER}
                                />
                            </div>
                        </div>

                        <div className="animate-fade-in delay-300">
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '0.9rem', color: '#4B5563', fontWeight: 500 }}>{UI_STRINGS.LOGIN.PASSWORD_LABEL}</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{
                                        paddingLeft: '48px',
                                        paddingRight: '48px',
                                        backgroundColor: '#FFFFFF',
                                        border: '1px solid #E5E7EB',
                                        height: '54px',
                                        color: '#111827'
                                    }}
                                    placeholder={UI_STRINGS.LOGIN.PASSWORD_PLACEHOLDER}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: '#9CA3AF',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = '#9CA3AF'}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary animate-fade-in delay-400"
                            disabled={loading}
                            style={{
                                marginTop: 'var(--space-md)',
                                height: '56px',
                                fontSize: '1.1rem',
                                gap: '12px',
                                color: '#FFFFFF'
                            }}
                        >
                            {loading ? UI_STRINGS.LOGIN.LOADING : (
                                <>
                                    {UI_STRINGS.LOGIN.BTN} <ArrowRight size={22} className="icon-hover-scale" />
                                </>
                            )}
                        </button>
                    </form>

                </div>
            </div>
        </div>
    );
}
