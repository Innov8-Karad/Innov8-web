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
    const answers = data.questions.map(q => ({
      questionId: q.id || `q_${Math.random().toString(36).substr(2, 9)}`,
      correctAnswerIndex: q.correctAnswerIndex
    }));
    
    const questionsWithoutAnswers = data.questions.map((q, idx) => {
      const qCopy = { ...q };
      delete qCopy.correctAnswerIndex;
      delete qCopy.explanation;
      return { ...qCopy, id: answers[idx].questionId };
    });

    const docData: DocumentData = {
      ...data,
      questions: questionsWithoutAnswers,
      duration: Number(data.duration),
      totalMarks: Number(data.totalMarks),
      scheduledDate: Timestamp.fromDate(new Date(data.scheduledDate as unknown as string)),
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.EXAMS), docData);
    
    // Save answers
    const { setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'exam_answers', docRef.id), {
      answers,
      explanations: data.questions.map((q, idx) => ({ questionId: answers[idx].questionId, explanation: q.explanation || '' }))
    });
    
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
    
    if (data.questions) {
      const answers = data.questions.map(q => ({
        questionId: q.id || `q_${Math.random().toString(36).substr(2, 9)}`,
        correctAnswerIndex: q.correctAnswerIndex
      }));
      
      updateData.questions = data.questions.map((q, idx) => {
        const qCopy = { ...q };
        delete qCopy.correctAnswerIndex;
        delete qCopy.explanation;
        return { ...qCopy, id: answers[idx].questionId };
      });

      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'exam_answers', id), {
        answers,
        explanations: data.questions.map((q, idx) => ({ questionId: answers[idx].questionId, explanation: q.explanation || '' }))
      });
    }

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
    try {
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'exam_answers', id));
    } catch {
      // Ignored if exam_answers doesn't exist
    }
  }
};
