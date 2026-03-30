import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  type DocumentData 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { COLLECTIONS } from '../constants';
import type { SuccessStory, PlacementStats } from '../types';

export const placementService = {
  // 1. Success Stories Subscriptions (Year-wise)
  subscribeToSuccessStories(year: number, callback: (stories: SuccessStory[]) => void, onError?: (error: Error) => void) {
    const q = query(
      collection(db, COLLECTIONS.PLACEMENTS),
      where('year', '==', year)
    );
    
    return onSnapshot(q, (snap) => {
      const stories = snap.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as SuccessStory)).sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      callback(stories);
    }, onError);
  },

  // 2. Placement Stats Subscriptions (Year-wise)
  subscribeToPlacementStats(year: number, callback: (stats: PlacementStats | null) => void, onError?: (error: Error) => void) {
    const q = query(
      collection(db, COLLECTIONS.PLACEMENT_STATS),
      where('year', '==', year)
    );

    return onSnapshot(q, (snap) => {
      if (snap.empty) {
        callback(null);
      } else {
        callback({ ...snap.docs[0].data(), id: snap.docs[0].id } as PlacementStats);
      }
    }, onError);
  },

  // 3. Success Story CRUD
  async createPlacement(data: Partial<SuccessStory>): Promise<string> {
    try {
      const docData: DocumentData = {
        ...data,
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, COLLECTIONS.PLACEMENTS), docData);
      return docRef.id;
    } catch (error) {
      console.error("Error in createPlacement:", error);
      throw error;
    }
  },

  async updateSuccessStory(id: string, data: Partial<SuccessStory>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.PLACEMENTS, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  async deleteSuccessStory(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.PLACEMENTS, id);
    await deleteDoc(docRef);
  },

  // 4. Statistics Update
  async updatePlacementStats(year: number, stats: Partial<PlacementStats>): Promise<void> {
    // Check if stat document already exists for this year
    const q = query(collection(db, COLLECTIONS.PLACEMENT_STATS), where('year', '==', year));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const docRef = doc(db, COLLECTIONS.PLACEMENT_STATS, snap.docs[0].id);
      await updateDoc(docRef, { ...stats, updatedAt: serverTimestamp() });
    } else {
      await addDoc(collection(db, COLLECTIONS.PLACEMENT_STATS), {
        ...stats,
        year,
        updatedAt: serverTimestamp()
      });
    }
  },

  // 5. Asset Upload
  async uploadStudentPhoto(file: File): Promise<string> {
    const fileExtension = file.name.split('.').pop();
    const fileName = `successStories/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const storageRef = ref(storage, fileName);
    
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  }
};
