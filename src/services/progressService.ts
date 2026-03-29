import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../constants';
import type { StudentProgress } from '../types';

export const progressService = {
  async fetchProgress(): Promise<StudentProgress[]> {
    const [progressSnap, usersSnap, coursesSnap] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.PROGRESS)),
      getDocs(collection(db, COLLECTIONS.USERS)),
      getDocs(collection(db, COLLECTIONS.COURSES))
    ]);

    const usersMap = new Map<string, string>();
    usersSnap.docs.forEach(doc => usersMap.set(doc.id, doc.data().name));

    const coursesMap = new Map<string, string>();
    coursesSnap.docs.forEach(doc => coursesMap.set(doc.id, doc.data().title));

    return progressSnap.docs.map(doc => {
      const parts = doc.id.split('_');
      const userId = parts[0] || doc.id;
      const courseId = parts[1] || '';
      return {
        userId,
        courseId,
        userName: usersMap.get(userId) || 'Unknown Student',
        courseName: coursesMap.get(courseId) || 'Unknown Course',
        ...doc.data()
      } as StudentProgress & { courseName?: string };
    });
  }
};
