import { 
  collection, 
  getDocs, 
  getDoc,
  updateDoc,
  doc,
  setDoc,
  Timestamp,
  query,
  where,
  increment,
  runTransaction,
  type DocumentData 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { uploadWithFallback } from '../lib/cloudinary';
import { COLLECTIONS } from '../constants';
import type { User } from '../types';

export const userService = {
  async fetchUsers(): Promise<User[]> {
    const snap = await getDocs(collection(db, COLLECTIONS.USERS));
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      enrollmentDate: (doc.data() as DocumentData).enrollmentDate?.toDate() || new Date(),
    } as User));
  },

  async fetchUsersByBatch(batchId: string): Promise<User[]> {
    const q = query(collection(db, COLLECTIONS.USERS), where('batchId', '==', batchId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      enrollmentDate: (doc.data() as DocumentData).enrollmentDate?.toDate() || new Date(),
    } as User));
  },

  async updateStudentStatus(id: string, status: 'active' | 'inactive'): Promise<void> {
    const docRef = doc(db, COLLECTIONS.USERS, id);
    await updateDoc(docRef, { status, updatedAt: Timestamp.now() });
  },

  async createUser(data: Omit<User, 'id' | 'enrollmentDate' | 'createdAt'>): Promise<User> {
    const userRef = doc(collection(db, COLLECTIONS.USERS));
    const batchRef = data.batchId ? doc(db, COLLECTIONS.BATCHES, data.batchId) : null;

    await runTransaction(db, async (transaction) => {
      // 1. Create student document
      const docData: DocumentData = {
        ...data,
        role: 'student',
        deviceCount: 0,
        enrollmentDate: Timestamp.now(),
        createdAt: Timestamp.now()
      };
      transaction.set(userRef, docData);

      // 2. Increment studentCount on batch if assigned
      if (batchRef) {
        const batchSnap = await transaction.get(batchRef);
        if (batchSnap.exists()) {
          const currentCount = batchSnap.data()?.studentCount || 0;
          transaction.update(batchRef, { studentCount: currentCount + 1 });
        }
      }
    });

    return {
      id: userRef.id,
      ...data,
      enrollmentDate: new Date(),
      createdAt: new Date()
    } as User;
  },

  async updateUser(id: string, data: Partial<User>, oldBatchId?: string): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, id);
    
    // Clean undefined values
    const cleanedData = Object.fromEntries(
        Object.entries(data).filter((entry) => entry[1] !== undefined)
    );
    
    const newBatchId = cleanedData.batchId as string | undefined;

    await runTransaction(db, async (transaction) => {
      // 1. Update the student document
      transaction.update(userRef, {
        ...cleanedData,
        updatedAt: Timestamp.now()
      });

      // 2. Handle batch count changes if batchId is updated
      if (oldBatchId !== undefined && newBatchId !== undefined && oldBatchId !== newBatchId) {
        if (oldBatchId) {
          const oldBatchRef = doc(db, COLLECTIONS.BATCHES, oldBatchId);
          const oldBatchSnap = await transaction.get(oldBatchRef);
          if (oldBatchSnap.exists()) {
            const currentCount = oldBatchSnap.data()?.studentCount || 0;
            transaction.update(oldBatchRef, { studentCount: Math.max(0, currentCount - 1) });
          }
        }
        if (newBatchId) {
          const newBatchRef = doc(db, COLLECTIONS.BATCHES, newBatchId);
          const newBatchSnap = await transaction.get(newBatchRef);
          if (newBatchSnap.exists()) {
            const currentCount = newBatchSnap.data()?.studentCount || 0;
            transaction.update(newBatchRef, { studentCount: currentCount + 1 });
          }
        }
      }
    });
  },

  async deleteUser(id: string, batchId?: string): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, id);
    const batchRef = batchId ? doc(db, COLLECTIONS.BATCHES, batchId) : null;

    await runTransaction(db, async (transaction) => {
      // 1. Delete student document
      transaction.delete(userRef);

      // 2. Decrement studentCount on batch if assigned
      if (batchRef) {
        const batchSnap = await transaction.get(batchRef);
        if (batchSnap.exists()) {
          const currentCount = batchSnap.data()?.studentCount || 0;
          transaction.update(batchRef, { studentCount: Math.max(0, currentCount - 1) });
        }
      }
    });
  },

  async blockUser(id: string, reason?: string): Promise<User> {
    const docRef = doc(db, COLLECTIONS.USERS, id);
    const userSnap = await getDoc(docRef);
    const email = userSnap.data()?.email;

    await updateDoc(docRef, {
      isBlocked: true,
      blockedAt: Timestamp.now(),
      blockedReason: reason || '',
      tokenVersion: increment(1),
      updatedAt: Timestamp.now()
    });
    
    // Update public block status for real-time mobile sync (using email as ID)
    if (email) {
      await setDoc(doc(db, 'user_block_status', email.toLowerCase().trim()), {
        isBlocked: true,
        updatedAt: Timestamp.now()
      });
    }

    const updatedSnap = await getDoc(docRef);
    const data = updatedSnap.data() as DocumentData;
    return {
      id: updatedSnap.id,
      ...data,
      enrollmentDate: data.enrollmentDate?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
    } as User;
  },

  async unblockUser(id: string): Promise<User> {
    const docRef = doc(db, COLLECTIONS.USERS, id);
    const userSnap = await getDoc(docRef);
    const email = userSnap.data()?.email;

    await updateDoc(docRef, {
      isBlocked: false,
      blockedAt: null,
      blockedReason: null,
      tokenVersion: increment(1), // Forces all existing tokens to stay invalid
      updatedAt: Timestamp.now()
    });
    
    // Update public block status for real-time mobile sync (using email as ID)
    if (email) {
      await setDoc(doc(db, 'user_block_status', email.toLowerCase().trim()), {
        isBlocked: false,
        updatedAt: Timestamp.now()
      });
    }

    const updatedSnap = await getDoc(docRef);
    const data = updatedSnap.data() as DocumentData;
    return {
      id: updatedSnap.id,
      ...data,
      enrollmentDate: data.enrollmentDate?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
    } as User;
  },

  /**
   * Upload a profile photo using Cloudinary (with Firebase Storage fallback).
   * @param file - The image file to upload
   * @param onProgress - Optional callback for upload progress (0-100)
   * @returns The uploaded image URL
   */
  async uploadProfilePhoto(file: File, userId?: string, onProgress?: (pct: number) => void): Promise<string> {
    const folderPath = userId ? `innov8/profile-photos/${userId}` : 'innov8/profile-photos';
    const result = await uploadWithFallback(file, {
      preset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
      folder: folderPath,
      onProgress,
    });
    return result.url;
  },

  async findUserByEmail(email: string): Promise<User | null> {
    const q = query(collection(db, COLLECTIONS.USERS), where('email', '==', email.toLowerCase().trim()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      enrollmentDate: (doc.data() as DocumentData).enrollmentDate?.toDate() || new Date(),
    } as User;
  }
};
