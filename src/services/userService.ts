import { 
  collection, 
  getDocs, 
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  query,
  where,
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
    const docData: DocumentData = {
      ...data,
      role: 'student',
      deviceCount: 0,
      enrollmentDate: Timestamp.now(),
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.USERS), docData);
    
    return {
      id: docRef.id,
      ...data,
      enrollmentDate: new Date(),
      createdAt: new Date()
    } as User;
  },

  async updateUser(id: string, data: Partial<User>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.USERS, id);
    
    // Clean undefined values
    const cleanedData = Object.fromEntries(
        Object.entries(data).filter((entry) => entry[1] !== undefined)
    );
    
    await updateDoc(docRef, {
      ...cleanedData,
      updatedAt: Timestamp.now()
    });
  },

  async deleteUser(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.USERS, id);
    await deleteDoc(docRef);
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
