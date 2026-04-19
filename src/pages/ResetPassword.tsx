import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { Lock, Eye, EyeOff, CheckCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { auth } from '../lib/firebase';
import { useToast } from '../hooks/useToast';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const { showToast } = useToast();

    // Firebase Auth Action Code (oobCode)
    const oobCode = searchParams.get('oobCode');
    const mode = searchParams.get('mode'); // e.g., resetPassword
    const isOnboarding = searchParams.get('type') === 'onboarding';

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [email, setEmail] = useState('');
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function verifyCode() {
            if (!oobCode || mode !== 'resetPassword') {
                setError('Invalid or expired password reset link.');
                setVerifying(false);
                return;
            }

            try {
                const userEmail = await verifyPasswordResetCode(auth, oobCode);
                setEmail(userEmail);
                setError(null);
            } catch (err) {
                console.error('Link verification error:', err);
                setError('This link has expired or has already been used.');
            } finally {
                setVerifying(false);
            }
        }

        verifyCode();
    }, [oobCode, mode]);

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword.length < 6) {
            showToast('Password must be at least 6 characters long', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        setLoading(true);
        try {
            if (!oobCode) throw new Error('Missing code');
            await confirmPasswordReset(auth, oobCode, newPassword);
            setSuccess(true);
            showToast('Password updated successfully', 'success');
        } catch (err) {
            console.error('Password reset confirmation error:', err);
            showToast('Failed to update password. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (verifying) {
        return (
            <div className="login-container flex justify-center items-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#6366f1]"></div>
                    <p className="text-[#94a3b8]">Verifying secure link...</p>
                </div>
            </div>
        );
    }

    if (error && !success) {
        return (
            <div className="login-container flex justify-center items-center">
                <div className="login-form-card animate-slide-up max-w-[440px] w-full text-center">
                    <div className="mb-8 p-4 bg-red-500/10 rounded-2xl border border-red-500/20 inline-block">
                        <ShieldCheck size={48} className="text-red-500 mx-auto" strokeWidth={1.5} />
                    </div>
                    <h2 className="login-title mb-4">Link Invalid</h2>
                    <p className="login-subtitle mb-8">{error}</p>
                    <Link to="/login" className="btn btn-primary w-full flex items-center justify-center gap-2">
                        <ArrowLeft size={18} /> Back to Login
                    </Link>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="login-container flex justify-center items-center">
                <div className="login-form-card animate-slide-up max-w-[440px] w-full text-center">
                    <div className="mb-8 p-4 bg-green-500/10 rounded-2xl border border-green-500/20 inline-block">
                        <CheckCircle size={48} className="text-green-500 mx-auto" strokeWidth={1.5} />
                    </div>
                    <h2 className="login-title mb-4">Password Updated!</h2>
                    <p className="login-subtitle mb-8">
                        Your password for <b>{email}</b> has been successfully updated. You can now log in with your new credentials.
                    </p>
                    <Link to="/login" className="btn btn-primary w-full flex items-center justify-center gap-2">
                        Get Started <CheckCircle size={18} />
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="login-container flex justify-center items-center p-6 bg-[#0a0e1a] min-h-screen">
            <div className="login-form-card animate-slide-up max-w-md w-full">
                <div className="text-center mb-10">
                    <h2 className="login-title text-3xl font-bold mb-3">
                        {isOnboarding ? 'Create Password' : 'Reset Password'}
                    </h2>
                    <p className="login-subtitle text-zinc-400">
                        Setting password for <span className="text-[#6366f1] font-medium">{email}</span>
                    </p>
                </div>

                <form onSubmit={handlePasswordUpdate} className="flex flex-col gap-6">
                    {/* New Password */}
                    <div className="animate-fade-in delay-100">
                        <label className="login-label block text-zinc-400 text-sm font-medium mb-2">New Password</label>
                        <div className="relative group">
                            <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#6366f1] transition-colors" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="login-input w-full bg-[#121629] border border-[#1e233d] rounded-2xl py-4 pl-12 pr-12 text-white focus:outline-none focus:border-[#6366f1] transition-all"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="animate-fade-in delay-200">
                        <label className="login-label block text-zinc-400 text-sm font-medium mb-2">Confirm New Password</label>
                        <div className="relative group">
                            <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#6366f1] transition-colors" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="login-input w-full bg-[#121629] border border-[#1e233d] rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-[#6366f1] transition-all"
                                placeholder="••••••••"
                            />
                            {confirmPassword.length > 0 && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    {newPassword === confirmPassword ? 
                                        <CheckCircle size={20} className="text-green-500" /> : 
                                        <div className="w-2 h-2 rounded-full bg-red-500" />
                                    }
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        className="btn btn-primary w-full py-4 rounded-2xl bg-[#6366f1] hover:bg-[#4f46e5] text-white font-bold text-lg shadow-lg shadow-[#6366f1]/20 transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-50 disabled:cursor-not-allowed group"
                        disabled={loading || newPassword !== confirmPassword || newPassword.length < 6}
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/30 border-t-white"></div>
                        ) : (
                            <>
                                Confirm New Password
                                <ShieldCheck size={22} className="group-hover:scale-110 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center animate-fade-in delay-300">
                    <Link to="/login" className="text-zinc-500 hover:text-[#6366f1] transition-colors text-sm font-medium flex items-center justify-center gap-2 p-2">
                            Cancel and go back
                    </Link>
                </div>
            </div>
        </div>
    );
}
