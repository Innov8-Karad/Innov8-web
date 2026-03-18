import { 
  collection, 
  getDocs, 
  addDoc, 
  Timestamp,
  type DocumentData 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../constants';
import type { Course } from '../types';

export const courseService = {
  async fetchCourses(): Promise<Course[]> {
    const snap = await getDocs(collection(db, COLLECTIONS.COURSES));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
  },

  async createCourse(data: Omit<Course, 'id' | 'createdAt' | 'rating' | 'enrolled'>): Promise<Course> {
    const docData: DocumentData = {
      ...data,
      price: data.isFree ? 0 : Number(data.price),
      rating: 0,
      enrolled: 0,
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.COURSES), docData);
    
    return {
      id: docRef.id,
      ...docData,
      createdAt: new Date()
    } as unknown as Course;
  }
};
