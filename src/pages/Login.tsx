import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Eye, EyeOff, X } from 'lucide-react';

import logo from '../assets/logo.png';
import { UI_STRINGS } from '../constants';
import { useToast } from '../hooks/useToast';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const { login, resetPassword } = useAuth()!;
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

    async function handleResetPassword(e: React.FormEvent) {
        e.preventDefault();
        if (!resetEmail) return;

        try {
            setResetLoading(true);
            await resetPassword(resetEmail);
            showToast(UI_STRINGS.LOGIN.FORGOT_PASSWORD_SUCCESS, "success");
            setShowResetModal(false);
            setResetEmail('');
        } catch (err) {
            console.error("Reset error:", err);
            showToast(UI_STRINGS.LOGIN.FORGOT_PASSWORD_ERROR, "error");
        }
        setResetLoading(false);
    }

    return (
        <div className="login-container">
            {/* Left Panel: Branding */}
            <div className="login-branding flex flex-col justify-center items-center">
                <div className="animate-slide-right flex flex-col items-center login-branding-inner">
                    <div className="logo-float flex flex-col items-center">
                        <img src={logo} alt="Innov8 Logo" className="login-logo" />
                        <p className="login-tagline">
                            ELEVATING CAREERS • DEFINING FUTURES
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Panel: Login Form */}
            <div className="login-form-panel">
                <div className="animate-slide-up login-form-card">
                    <div className="text-center mb-xl">
                        <h2 className="login-title">{UI_STRINGS.LOGIN.TITLE}</h2>
                        <p className="login-subtitle">{UI_STRINGS.LOGIN.SUBTITLE}</p>
                    </div>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div className="animate-fade-in delay-200">
                            <label className="login-label">{UI_STRINGS.LOGIN.EMAIL_LABEL}</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} className="login-input-icon" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="login-input"
                                    placeholder={UI_STRINGS.LOGIN.EMAIL_PLACEHOLDER}
                                />
                            </div>
                        </div>

                        <div className="animate-fade-in delay-300">
                            <label className="login-label">{UI_STRINGS.LOGIN.PASSWORD_LABEL}</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} className="login-input-icon" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="login-input"
                                    style={{ paddingRight: '48px' }}
                                    placeholder={UI_STRINGS.LOGIN.PASSWORD_PLACEHOLDER}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    className="password-toggle"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            <div className="flex justify-end mt-md">
                                <button
                                    type="button"
                                    onClick={() => setShowResetModal(true)}
                                    className="text-sm font-medium hover:underline p-0"
                                    style={{ 
                                        color: 'var(--primary)', 
                                        background: 'none', 
                                        border: 'none', 
                                        cursor: 'pointer' 
                                    }}
                                >
                                    {UI_STRINGS.LOGIN.FORGOT_PASSWORD_LINK}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary animate-fade-in delay-400 login-submit"
                            disabled={loading}
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

            {/* Reset Password Modal */}
            {showResetModal && (
                <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
                    <div 
                        className="modal-content login-form-card relative" 
                        onClick={e => e.stopPropagation()}
                        style={{ maxWidth: '400px' }}
                    >
                        <button 
                            className="modal-close"
                            onClick={() => setShowResetModal(false)}
                        >
                            <X size={20} />
                        </button>

                        <div className="text-center mb-xl">
                            <h2 className="login-title" style={{ fontSize: '1.5rem' }}>
                                {UI_STRINGS.LOGIN.FORGOT_PASSWORD_TITLE}
                            </h2>
                            <p className="login-subtitle">
                                {UI_STRINGS.LOGIN.FORGOT_PASSWORD_SUBTITLE}
                            </p>
                        </div>

                        <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
                            <div>
                                <label className="login-label">{UI_STRINGS.LOGIN.EMAIL_LABEL}</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={18} className="login-input-icon" />
                                    <input
                                        type="email"
                                        required
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        className="login-input"
                                        placeholder={UI_STRINGS.LOGIN.EMAIL_PLACEHOLDER}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary login-submit w-full"
                                disabled={resetLoading}
                            >
                                {resetLoading ? UI_STRINGS.COMMON.LOADING : UI_STRINGS.LOGIN.SEND_RESET_LINK}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
