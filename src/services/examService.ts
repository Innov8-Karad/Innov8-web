import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  addDoc, 
  Timestamp,
  type DocumentData 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../constants';
import type { Exam } from '../types';

export const examService = {
  async fetchExams(): Promise<Exam[]> {
    const q = query(
      collection(db, COLLECTIONS.EXAMS), 
      orderBy("scheduledDate", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      scheduledDate: (doc.data() as DocumentData).scheduledDate?.toDate(),
    } as Exam));
  },

  async createExam(data: Omit<Exam, 'id' | 'questions' | 'createdAt'>): Promise<Exam> {
    const docData: DocumentData = {
      ...data,
      duration: Number(data.duration),
      totalMarks: Number(data.totalMarks),
      scheduledDate: Timestamp.fromDate(new Date(data.scheduledDate as unknown as string)),
      questions: [],
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.EXAMS), docData);
    
    return {
      id: docRef.id,
      ...data,
      duration: Number(data.duration),
      totalMarks: Number(data.totalMarks),
      scheduledDate: new Date(data.scheduledDate as unknown as string),
      questions: []
    } as Exam;
  }
};
