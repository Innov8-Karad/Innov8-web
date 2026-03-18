import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, CheckCircle2, Zap, Trophy, ArrowRight } from 'lucide-react';
import bgImage from '../assets/login-bg.png';
import logo from '../assets/logo.png';
import { UI_STRINGS } from '../constants';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth()!;
    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        try {
            setError('');
            setLoading(true);
            await login(email, password);
            navigate('/');
        } catch (err: any) {
            setError(UI_STRINGS.LOGIN.ERROR + ' ' + err.message);
        }
        setLoading(false);
    }

    const features = [
        { icon: CheckCircle2, title: UI_STRINGS.LOGIN.FEATURES.COURSES_TITLE, desc: UI_STRINGS.LOGIN.FEATURES.COURSES_DESC },
        { icon: Zap, title: UI_STRINGS.LOGIN.FEATURES.TRACKING_TITLE, desc: UI_STRINGS.LOGIN.FEATURES.TRACKING_DESC },
        { icon: Trophy, title: UI_STRINGS.LOGIN.FEATURES.MENTORSHIP_TITLE, desc: UI_STRINGS.LOGIN.FEATURES.MENTORSHIP_DESC }
    ];

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            backgroundImage: `linear-gradient(rgba(15, 22, 35, 0.8), rgba(15, 22, 35, 0.9)), url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            color: 'var(--text-main)',
            overflow: 'hidden'
        }}>
            {/* Left Panel: Branding & Features */}
            <div className="flex flex-col justify-center" style={{
                flex: 1,
                padding: 'var(--space-xl)',
                maxWidth: '60%',
                display: 'flex',
                zIndex: 1
            }}>
                <div className="animate-slide-right">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--space-xl)' }}>
                        <img src={logo} alt="Innov8 Logo" style={{ height: '280px', width: 'auto', filter: 'drop-shadow(0 0 50px rgba(var(--primary-rgb), 0.5))' }} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)', maxWidth: '500px' }}>
                        Empowering the <span style={{ color: 'var(--primary)', fontStyle: 'italic' }}>Future</span> of 
                        Digital Learning & Management.
                    </h2>
                </div>

                <div className="flex flex-col gap-6">
                    {features.map((f, i) => (
                        <div key={i} className={`flex items-start gap-4 animate-slide-right delay-${(i + 1) * 100}`}>
                            <div className="icon-hover-scale" style={{ 
                                marginTop: '4px', 
                                color: 'var(--primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <f.icon size={28} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.2rem', marginBottom: '4px', fontWeight: 600 }}>{f.title}</h3>
                                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', margin: 0 }}>{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel: Login Form */}
            <div className="flex items-center justify-center" style={{
                flex: 1,
                padding: 'var(--space-xl)',
                zIndex: 2
            }}>
                <div className="glass-card animate-slide-up" style={{
                    width: '100%',
                    maxWidth: '450px',
                    padding: 'var(--space-xl)',
                    borderRadius: 'var(--radius-xl)'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
                        <h2 style={{ fontSize: '2rem', marginBottom: 'var(--space-xs)' }}>
                            {UI_STRINGS.LOGIN.TITLE}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)' }}>{UI_STRINGS.LOGIN.SUBTITLE}</p>
                    </div>

                    {error && (
                        <div style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: 'var(--error)',
                            padding: 'var(--space-sm)',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: 'var(--space-md)',
                            border: '1px solid var(--error)',
                            fontSize: '0.9rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div className="animate-fade-in delay-200">
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{UI_STRINGS.LOGIN.EMAIL_LABEL}</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    style={{
                                        paddingLeft: '48px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        height: '54px'
                                    }}
                                    placeholder="admin@innov8.com"
                                />
                            </div>
                        </div>

                        <div className="animate-fade-in delay-300">
                            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{UI_STRINGS.LOGIN.PASSWORD_LABEL}</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    style={{
                                        paddingLeft: '48px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        height: '54px'
                                    }}
                                    placeholder="••••••••"
                                />
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
                                gap: '12px'
                            }}
                        >
                            {loading ? UI_STRINGS.LOGIN.LOADING : (
                                <>
                                    {UI_STRINGS.LOGIN.BTN} <ArrowRight size={22} className="icon-hover-scale" />
                                </>
                            )}
                        </button>
                    </form>

                    <div style={{ marginTop: 'var(--space-xl)', textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 'var(--space-lg)' }}>
                        <p style={{ fontSize: '0.85rem' }}>
                            {UI_STRINGS.LOGIN.FOOTER_SUPPORT} <span style={{ color: 'var(--primary)', cursor: 'pointer' }}>{UI_STRINGS.LOGIN.FOOTER_CONTACT}</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
