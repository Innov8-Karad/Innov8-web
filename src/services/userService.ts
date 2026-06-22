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
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../lib/firebase';
import { uploadWithFallback, deleteFromCloudinary } from '../lib/cloudinary';
import { COLLECTIONS } from '../constants';
import type { User } from '../types';


export function getUserDisplayName(user: { name?: string; firstName?: string; middleName?: string; surname?: string }): string {
  if (user.firstName || user.surname) {
    return [user.firstName, user.middleName, user.surname]
      .filter(Boolean)
      .join(' ')
      .trim();
  }
  return user.name || 'Unknown Student';
}

export function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  let firstName = '';
  let middleName = '';
  let surname = '';

  if (parts.length === 1) {
    firstName = parts[0];
  } else if (parts.length === 2) {
    firstName = parts[0];
    surname = parts[1];
  } else if (parts.length >= 3) {
    firstName = parts[0];
    surname = parts[parts.length - 1];
    middleName = parts.slice(1, parts.length - 1).join(' ');
  }

  return { firstName, middleName, surname };
}

export const userService = {
  async fetchUsers(): Promise<User[]> {
    const snap = await getDocs(collection(db, COLLECTIONS.USERS));
    return snap.docs.map(doc => {
      const data = doc.data() as DocumentData;
      const user = {
        id: doc.id,
        ...data,
        enrollmentDate: data.enrollmentDate?.toDate() || new Date(),
      } as User;
      user.name = getUserDisplayName(user);
      return user;
    });
  },

  async fetchUsersByBatch(batchId: string): Promise<User[]> {
    const q = query(collection(db, COLLECTIONS.USERS), where('batchId', '==', batchId));
    const snap = await getDocs(q);
    return snap.docs.map(doc => {
      const data = doc.data() as DocumentData;
      const user = {
        id: doc.id,
        ...data,
        enrollmentDate: data.enrollmentDate?.toDate() || new Date(),
      } as User;
      user.name = getUserDisplayName(user);
      return user;
    });
  },

  async updateStudentStatus(id: string, status: 'active' | 'inactive'): Promise<void> {
    const docRef = doc(db, COLLECTIONS.USERS, id);
    await updateDoc(docRef, { status, updatedAt: Timestamp.now() });
  },

  async createUser(data: Omit<User, 'id' | 'enrollmentDate' | 'createdAt'>): Promise<User> {
    const userRef = doc(collection(db, COLLECTIONS.USERS));
    const batchRef = data.batchId ? doc(db, COLLECTIONS.BATCHES, data.batchId) : null;
    const nameParts = splitFullName(data.name || '');

    await runTransaction(db, async (transaction) => {
      // 1. Create student document
      const docData: DocumentData = {
        ...data,
        ...nameParts,
        email: data.email?.toLowerCase().trim() || '',
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

    const createdUser = {
      id: userRef.id,
      ...data,
      ...nameParts,
      enrollmentDate: new Date(),
      createdAt: new Date()
    } as User;
    createdUser.name = getUserDisplayName(createdUser);
    return createdUser;
  },

  async updateUser(id: string, data: Partial<User>, oldBatchId?: string): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, id);
    
    // Clean undefined values
    const cleanedData = Object.fromEntries(
        Object.entries(data).filter((entry) => entry[1] !== undefined)
    );

    // Protect primary account fields — these cannot be changed after creation
    delete cleanedData.name;
    delete cleanedData.email;
    delete cleanedData.phone;

    if (typeof cleanedData.email === 'string') {
      cleanedData.email = cleanedData.email.toLowerCase().trim();
    }
    
    const newBatchId = cleanedData.batchId as string | undefined;
    let nameParts = {};
    if (typeof cleanedData.name === 'string') {
      nameParts = splitFullName(cleanedData.name);
    }

    await runTransaction(db, async (transaction) => {
      // 1. Update the student document
      transaction.update(userRef, {
        ...cleanedData,
        ...nameParts,
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

  async deleteUser(id: string): Promise<void> {
    const functions = getFunctions(undefined, 'asia-south1');
    const deleteStudentFn = httpsCallable<{ studentId: string }, { success: boolean }>(functions, 'deleteStudent');
    await deleteStudentFn({ studentId: id });
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
    
    // Resilient fix: find and update all duplicate user docs with the same email
    if (email) {
      const q = query(collection(db, COLLECTIONS.USERS), where('email', '==', email));
      const querySnap = await getDocs(q);
      const batchPromises = querySnap.docs.map(userDoc => {
        if (userDoc.id !== id) {
          return updateDoc(doc(db, COLLECTIONS.USERS, userDoc.id), {
            isBlocked: true,
            blockedAt: Timestamp.now(),
            blockedReason: reason || '',
            tokenVersion: increment(1),
            updatedAt: Timestamp.now()
          });
        }
        return Promise.resolve();
      });
      await Promise.all(batchPromises);

      // Update public block status for real-time mobile sync (using email as ID)
      await setDoc(doc(db, 'user_block_status', email.toLowerCase().trim()), {
        isBlocked: true,
        updatedAt: Timestamp.now()
      });
    }

    const updatedSnap = await getDoc(docRef);
    const data = updatedSnap.data() as DocumentData;
    const user = {
      id: updatedSnap.id,
      ...data,
      enrollmentDate: data.enrollmentDate?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
    } as User;
    user.name = getUserDisplayName(user);
    return user;
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
    
    // Resilient fix: find and update all duplicate user docs with the same email
    if (email) {
      const q = query(collection(db, COLLECTIONS.USERS), where('email', '==', email));
      const querySnap = await getDocs(q);
      const batchPromises = querySnap.docs.map(userDoc => {
        if (userDoc.id !== id) {
          return updateDoc(doc(db, COLLECTIONS.USERS, userDoc.id), {
            isBlocked: false,
            blockedAt: null,
            blockedReason: null,
            tokenVersion: increment(1),
            updatedAt: Timestamp.now()
          });
        }
        return Promise.resolve();
      });
      await Promise.all(batchPromises);

      // Update public block status for real-time mobile sync (using email as ID)
      await setDoc(doc(db, 'user_block_status', email.toLowerCase().trim()), {
        isBlocked: false,
        updatedAt: Timestamp.now()
      });
    }

    const updatedSnap = await getDoc(docRef);
    const data = updatedSnap.data() as DocumentData;
    const user = {
      id: updatedSnap.id,
      ...data,
      enrollmentDate: data.enrollmentDate?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
    } as User;
    user.name = getUserDisplayName(user);
    return user;
  },

  /**
   * Upload a profile photo using Cloudinary.
   * Deletes the previous photo from Cloudinary if an oldPublicId is provided.
   * @param file - The image file to upload
   * @param userId - Optional user ID for folder organization
   * @param onProgress - Optional callback for upload progress (0-100)
   * @param oldPublicId - Optional publicId of the previous photo to delete
   * @returns Object with the uploaded image URL and publicId
   */
  async uploadProfilePhoto(
    file: File,
    userId?: string,
    onProgress?: (pct: number) => void,
    oldPublicId?: string
  ): Promise<{ url: string; publicId: string }> {
    const folderPath = userId ? `innov8/profile-photos/${userId}` : 'innov8/profile-photos';
    const result = await uploadWithFallback(file, {
      preset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
      folder: folderPath,
      onProgress,
    });

    // Best-effort: delete old photo after successful upload
    if (oldPublicId) {
      deleteFromCloudinary(oldPublicId);
    }

    return { url: result.url, publicId: result.publicId };
  },

  async findUserByEmail(email: string): Promise<User | null> {
    const q = query(collection(db, COLLECTIONS.USERS), where('email', '==', email.toLowerCase().trim()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const doc = snap.docs[0];
    const data = doc.data() as DocumentData;
    const user = {
      id: doc.id,
      ...data,
      enrollmentDate: data.enrollmentDate?.toDate() || new Date(),
    } as User;
    user.name = getUserDisplayName(user);
    return user;
  }
};
