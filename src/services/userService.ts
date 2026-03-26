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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
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
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
  },

  async deleteUser(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.USERS, id);
    await deleteDoc(docRef);
  },

  async uploadProfilePhoto(file: File): Promise<string> {
    const fileExtension = file.name.split('.').pop();
    const fileName = `profilePhotos/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const storageRef = ref(storage, fileName);
    
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  }
};
