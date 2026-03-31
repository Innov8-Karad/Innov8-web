import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  doc, 
  Timestamp,
  type DocumentData 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS, FEE_STATUS } from '../constants';
import type { Fee } from '../types';

export const feeService = {
  async fetchFees(): Promise<Fee[]> {
    const q = query(collection(db, COLLECTIONS.FEES), orderBy("dueDate", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      dueDate: (doc.data() as DocumentData).dueDate?.toDate(),
      paidDate: (doc.data() as DocumentData).paidDate?.toDate(),
      createdAt: (doc.data() as DocumentData).createdAt?.toDate(),
    } as Fee));
  },

  async createFee(data: Omit<Fee, 'id' | 'createdAt'>): Promise<Fee> {
    const docData: DocumentData = {
      ...data,
      amount: Number(data.amount),
      dueDate: Timestamp.fromDate(new Date(data.dueDate as unknown as string)),
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.FEES), docData);
    
    return {
      id: docRef.id,
      ...data,
      amount: Number(data.amount),
      dueDate: new Date(data.dueDate as unknown as string),
      createdAt: new Date()
    } as Fee;
  },

  async updateFeeStatus(feeId: string, newStatus: string): Promise<{ status: string, paidDate?: Date }> {
    const feeRef = doc(db, COLLECTIONS.FEES, feeId);
    const updateData: Record<string, unknown> = { status: newStatus };
    let paidDate: Date | undefined;

    if (newStatus === FEE_STATUS.PAID) {
      const now = Timestamp.now();
      updateData.paidDate = now;
      paidDate = now.toDate();
    }

    await updateDoc(feeRef, updateData);
    return { status: newStatus, paidDate };
  }
};
