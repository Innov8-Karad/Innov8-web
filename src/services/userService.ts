import { 
  collection, 
  getDocs, 
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
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

  async createUser(data: Omit<User, 'id' | 'enrollmentDate' | 'createdAt'>): Promise<User> {
    const docData: DocumentData = {
      ...data,
      role: 'student',
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
  async uploadProfilePhoto(file: File, onProgress?: (pct: number) => void): Promise<string> {
    const result = await uploadWithFallback(file, {
      preset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
      folder: 'innov8/profile-photos',
      onProgress,
    });
    return result.url;
  }
};
