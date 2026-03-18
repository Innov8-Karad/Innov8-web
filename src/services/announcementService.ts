import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  addDoc, 
  Timestamp,
  type DocumentData 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS, DEFAULT_VALUES } from '../constants';
import type { Announcement } from '../types';

export const announcementService = {
  async fetchAnnouncements(): Promise<Announcement[]> {
    const q = query(
      collection(db, COLLECTIONS.ANNOUNCEMENTS), 
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => this.mapDocToAnnouncement(doc));
  },

  async createAnnouncement(data: Omit<Announcement, 'id' | 'createdAt' | 'author'>): Promise<Announcement> {
    const docData: DocumentData = {
      ...data,
      author: DEFAULT_VALUES.AUTHOR_ADMIN,
      createdAt: Timestamp.now(),
      targetBatches: data.targetBatches.length > 0 ? data.targetBatches : [DEFAULT_VALUES.TARGET_BATCH_ALL]
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.ANNOUNCEMENTS), docData);
    
    return {
      id: docRef.id,
      ...data,
      author: DEFAULT_VALUES.AUTHOR_ADMIN,
      createdAt: new Date(),
      targetBatches: docData.targetBatches
    } as Announcement;
  },

  mapDocToAnnouncement(doc: any): Announcement {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date()
    } as Announcement;
  }
};
