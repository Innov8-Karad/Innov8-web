import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, type User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, type FirestoreError } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextType {
    currentUser: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_TIMEOUT_MS = 10_000; // 10 second timeout for Firebase auth init

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    return useContext(AuthContext);
}

/** Full-screen loading spinner shown while Firebase auth initializes */
function AuthLoadingScreen() {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'var(--bg-main, #0a0e1a)',
            color: 'var(--text-main, #e0e0e0)',
            gap: '20px',
        }}>
            <div style={{
                width: '48px',
                height: '48px',
                border: '4px solid rgba(255,255,255,0.1)',
                borderTopColor: 'var(--primary, #6366f1)',
                borderRadius: '50%',
                animation: 'authSpin 0.8s linear infinite',
            }} />
            <p style={{ fontSize: '1rem', opacity: 0.7, margin: 0 }}>Connecting to server...</p>
            <style>{`@keyframes authSpin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

/** Error screen shown when Firebase auth times out */
function AuthErrorScreen({ onRetry }: { onRetry: () => void }) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            background: 'var(--bg-main, #0a0e1a)',
            color: 'var(--text-main, #e0e0e0)',
            gap: '16px',
            padding: '24px',
            textAlign: 'center',
        }}>
            <div style={{ fontSize: '3rem' }}>⚠️</div>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Connection Timeout</h2>
            <p style={{ margin: 0, opacity: 0.7, maxWidth: '400px', lineHeight: 1.6 }}>
                Could not connect to the authentication server. Please check your internet connection and try again.
            </p>
            <button
                onClick={onRetry}
                style={{
                    marginTop: '12px',
                    padding: '12px 32px',
                    backgroundColor: 'var(--primary, #6366f1)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                }}
            >
                Retry Connection
            </button>
        </div>
    );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [timedOut, setTimedOut] = useState(false);
    const authResolved = useRef(false);

    async function login(email: string, password: string) {
        const credential = await signInWithEmailAndPassword(auth, email, password);

        // Verify the user has admin role in Firestore
        const userDoc = await getDoc(doc(db, 'users', credential.user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role !== 'admin') {
                // Not an admin — sign out and reject
                await signOut(auth);
                throw new Error('Access denied. This portal is for administrators only.');
            }
        } else {
            // No user document found — sign out and reject
            await signOut(auth);
            throw new Error('Access denied. No admin profile found for this account.');
        }
    }

    function logout() {
        return signOut(auth);
    }

    function resetPassword(email: string) {
        return sendPasswordResetEmail(auth, email);
    }

    useEffect(() => {
        authResolved.current = false;

        // Safety timeout: if onAuthStateChanged never fires, unblock the UI
        const timeoutId = setTimeout(() => {
            if (!authResolved.current) {
                console.warn('[AuthProvider] Firebase auth timed out after', AUTH_TIMEOUT_MS, 'ms');
                setTimedOut(true);
                setLoading(false);
            }
        }, AUTH_TIMEOUT_MS);

        let userUnsubscribe: (() => void) | undefined;

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            authResolved.current = true;
            clearTimeout(timeoutId);
            setTimedOut(false);

            if (userUnsubscribe) {
                userUnsubscribe();
                userUnsubscribe = undefined;
            }

            if (user) {
                // Set up real-time listener for user document to catch "Blocked" status instantly
                userUnsubscribe = onSnapshot(doc(db, 'users', user.uid), async (snapshot) => {
                    if (snapshot.exists()) {
                        const userData = snapshot.data();
                        
                        // Requirement: Immediate Auto Logout
                        if (userData.isBlocked === true) {
                            console.warn('[AuthContext] Account blocked by admin. Forcing logout.');
                            await signOut(auth);
                            setCurrentUser(null);
                            // We don't have a toast here but the UI will redirect to /login via PrivateRoute
                            return;
                        }

                        if (userData.role === 'admin') {
                            setCurrentUser(user);
                        } else {
                            // Not admin — force sign out
                            await signOut(auth);
                            setCurrentUser(null);
                        }
                    } else {
                        // Document doesn't exist — maybe deleted?
                        await signOut(auth);
                        setCurrentUser(null);
                    }
                }, async (error) => {
                    console.error('[AuthContext] User listener error:', error);
                    // If permission-denied, it means the user is blocked or session invalidated
                    if (error.message?.includes('permission-denied') || (error as FirestoreError).code === 'permission-denied') {
                        await signOut(auth);
                        setCurrentUser(null);
                    } else {
                        // Fallback to initial check if it's another error
                        setCurrentUser(user);
                    }
                });
            } else {
                setCurrentUser(null);
            }
            setLoading(false);
        });

        return () => {
            clearTimeout(timeoutId);
            unsubscribe();
            if (userUnsubscribe) userUnsubscribe();
        };
    }, []);

    const handleRetry = () => {
        // Force a page reload to re-init Firebase
        window.location.reload();
    };

    const value = {
        currentUser,
        loading,
        login,
        logout,
        resetPassword
    };

    // Show loading spinner while waiting for Firebase
    if (loading && !timedOut) {
        return (
            <AuthContext.Provider value={value}>
                <AuthLoadingScreen />
            </AuthContext.Provider>
        );
    }

    // Show error screen if Firebase timed out
    if (timedOut) {
        return (
            <AuthContext.Provider value={value}>
                <AuthErrorScreen onRetry={handleRetry} />
            </AuthContext.Provider>
        );
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
