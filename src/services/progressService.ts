import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../constants';
import type { StudentProgress } from '../types';

export const progressService = {
  async fetchProgress(): Promise<StudentProgress[]> {
    const [progressSnap, usersSnap] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.PROGRESS)),
      getDocs(collection(db, COLLECTIONS.USERS))
    ]);

    const usersMap = new Map<string, string>();
    usersSnap.docs.forEach(doc => usersMap.set(doc.id, doc.data().name));

    return progressSnap.docs.map(doc => ({
      userId: doc.id,
      userName: usersMap.get(doc.id) || 'Unknown Student',
      ...doc.data()
    } as StudentProgress));
  }
};
