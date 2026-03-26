import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc,
  doc,
  query,
  orderBy,
  Timestamp,
  type DocumentData 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { COLLECTIONS } from '../constants';
import type { Placement, SuccessStory } from '../types';

export const placementService = {
  async fetchPlacementStats(): Promise<Placement | null> {
    const snap = await getDocs(collection(db, COLLECTIONS.PLACEMENTS));
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Placement;
  },

  async fetchSuccessStories(): Promise<SuccessStory[]> {
    const q = query(
      collection(db, COLLECTIONS.SUCCESS_STORIES),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
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
  },

  async updateSuccessStory(id: string, data: Partial<SuccessStory>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.SUCCESS_STORIES, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
  },

  async uploadStudentPhoto(file: File): Promise<string> {
    const fileExtension = file.name.split('.').pop();
    const fileName = `successStories/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const storageRef = ref(storage, fileName);
    
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  }
};
