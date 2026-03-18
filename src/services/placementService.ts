import { 
  collection, 
  getDocs, 
  addDoc, 
  Timestamp,
  type DocumentData 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../constants';
import type { Placement, SuccessStory } from '../types';

export const placementService = {
  async fetchPlacementStats(): Promise<Placement | null> {
    const snap = await getDocs(collection(db, COLLECTIONS.PLACEMENTS));
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Placement;
  },

  async fetchSuccessStories(): Promise<SuccessStory[]> {
    const snap = await getDocs(collection(db, COLLECTIONS.SUCCESS_STORIES));
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as SuccessStory));
  },

  async createSuccessStory(data: Record<string, unknown>): Promise<SuccessStory> {
    const docData: DocumentData = {
      ...data,
      placedDate: Timestamp.now(),
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.SUCCESS_STORIES), docData);

    return {
      id: docRef.id,
      ...data,
      placedDate: new Date()
    } as unknown as SuccessStory;
  }
};
