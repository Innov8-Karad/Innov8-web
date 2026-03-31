import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  doc,
  updateDoc,
  deleteDoc,
  addDoc, 
  Timestamp,
  serverTimestamp,
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

  async createExam(data: Omit<Exam, 'id' | 'createdAt'>): Promise<Exam> {
    const docData: DocumentData = {
      ...data,
      duration: Number(data.duration),
      totalMarks: Number(data.totalMarks),
      scheduledDate: Timestamp.fromDate(new Date(data.scheduledDate as unknown as string)),
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.EXAMS), docData);
    
    return {
      id: docRef.id,
      ...data,
      duration: Number(data.duration),
      totalMarks: Number(data.totalMarks),
      scheduledDate: new Date(data.scheduledDate as unknown as string)
    } as Exam;
  },

  async updateExam(id: string, data: Partial<Exam>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.EXAMS, id);
    const updateData: Record<string, unknown> = { ...data };
    
    if (data.scheduledDate) {
      updateData.scheduledDate = Timestamp.fromDate(new Date(data.scheduledDate as unknown as string));
    }
    
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
  },

  async deleteExam(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.EXAMS, id);
    await deleteDoc(docRef);
  }
};
