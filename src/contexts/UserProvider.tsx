import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../constants';
import type { User } from '../types';
import { UserContext } from './UserContext';

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Sync students collection in real-time
    const q = query(
      collection(db, COLLECTIONS.USERS),
      where('role', '==', 'student')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const studentList = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            enrollmentDate: data.enrollmentDate?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
          } as User;
        });
        
        const sorted = [...studentList].sort((a, b) => 
          (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
        );

        setStudents(sorted);
        setLoading(false);
      },
      (err) => {
        console.error('Firestore subscription error:', err);
        setError(`Connection Error: ${err.message}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ students, loading, error }}>
      {children}
    </UserContext.Provider>
  );
};
