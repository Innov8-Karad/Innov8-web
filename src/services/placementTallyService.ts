import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  onSnapshot,
  serverTimestamp,
  type DocumentData,
  type Timestamp,
  type FieldValue
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../constants';

export interface PaymentRecord {
    id: string;
    date: string;
    amount: number;
    accountNo: string;
}

export interface PlacementTallyStudent {
    id: string;
    name: string;
    emailId: string;
    companyName: string;
    joiningDate: string;
    designation: string;
    package: number;
    totalPayable: number;
    placementCharges: number;

    // Previous Company Details
    internshipStartDate?: string;
    internshipEndDate?: string;
    jobJoiningDate?: string;
    jobReleaseDate?: string;
    employeeId?: string;
    previousCompanyName?: string;
    mobileNo?: string;
    client?: string;

    // Payment Details
    paymentDetails: PaymentRecord[];

    createdAt?: Timestamp | FieldValue | null;
    updatedAt?: Timestamp | FieldValue | null;
}

export const placementTallyService = {
  subscribeToStudents(callback: (students: PlacementTallyStudent[]) => void, onError?: (error: Error) => void) {
    const q = query(collection(db, COLLECTIONS.PLACEMENT_TALLY));

    return onSnapshot(q, (snap) => {
      const students = snap.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as PlacementTallyStudent)).sort((a, b) => {
        const dateA = (a.createdAt as Timestamp)?.seconds || 0;
        const dateB = (b.createdAt as Timestamp)?.seconds || 0;
        return dateB - dateA;
      });
      callback(students);
    }, onError);
  },

  async createStudent(data: Partial<PlacementTallyStudent>): Promise<string> {
    try {
      const docData: DocumentData = {
        ...data,
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, COLLECTIONS.PLACEMENT_TALLY), docData);
      return docRef.id;
    } catch (error) {
      console.error("Error in createStudent:", error);
      throw error;
    }
  },

  async updateStudent(id: string, data: Partial<PlacementTallyStudent>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.PLACEMENT_TALLY, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  async deleteStudent(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.PLACEMENT_TALLY, id);
    await deleteDoc(docRef);
  }
};
