import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface AuthContextType {
    currentUser: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

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

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Verify admin role on auth state change (e.g., page refresh)
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists() && userDoc.data().role === 'admin') {
                        setCurrentUser(user);
                    } else {
                        // Not admin — force sign out
                        await signOut(auth);
                        setCurrentUser(null);
                    }
                } catch {
                    // If Firestore check fails, still allow (graceful degradation)
                    setCurrentUser(user);
                }
            } else {
                setCurrentUser(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        loading,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
