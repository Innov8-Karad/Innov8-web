import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  where,
  writeBatch,
  type DocumentData 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS, DEFAULT_VALUES } from '../constants';
import type { Announcement } from '../types';

export const announcementService = {
  async fetchAnnouncements(): Promise<Announcement[]> {
    // Run cleanup in background
    this.cleanupExpiredAnnouncements().catch(err => console.error("Error during announcement cleanup:", err));

    const q = query(
      collection(db, COLLECTIONS.ANNOUNCEMENTS), 
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    
    return snap.docs.map(doc => this.mapDocToAnnouncement(doc));
  },

  async cleanupExpiredAnnouncements(): Promise<void> {
    const EXPIRY_DAYS = 8;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - EXPIRY_DAYS);
    
    const q = query(
      collection(db, COLLECTIONS.ANNOUNCEMENTS),
      where("createdAt", "<", Timestamp.fromDate(cutoffDate))
    );
    
    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`Auto-cleaned ${snap.size} expired announcements.`);
  },

  async createAnnouncement(data: Omit<Announcement, 'id' | 'createdAt' | 'author'>): Promise<Announcement> {
    const docData: DocumentData = {
      ...data,
      author: DEFAULT_VALUES.AUTHOR_ADMIN,
      createdAt: Timestamp.now(),
      targetAudience: data.targetAudience || 'all',
      targetBatches: data.targetAudience === 'batch' && data.targetBatches.length > 0 ? data.targetBatches : [DEFAULT_VALUES.TARGET_BATCH_ALL],
      targetStudentIds: data.targetAudience === 'students' ? (data.targetStudentIds || []) : []
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.ANNOUNCEMENTS), docData);
    
    return {
      id: docRef.id,
      ...data,
      author: DEFAULT_VALUES.AUTHOR_ADMIN,
      createdAt: new Date(),
      targetAudience: docData.targetAudience,
      targetBatches: docData.targetBatches,
      targetStudentIds: docData.targetStudentIds
    } as Announcement;
  },

  async updateAnnouncement(id: string, data: Partial<Announcement>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.ANNOUNCEMENTS, id);
    // Clean undefined values
    const cleanedData = Object.fromEntries(
        Object.entries(data).filter((entry) => entry[1] !== undefined)
    );
    await updateDoc(docRef, cleanedData);
  },

  async deleteAnnouncement(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.ANNOUNCEMENTS, id);
    await deleteDoc(docRef);
  },

  async fetchUniqueBatches(): Promise<string[]> {
    try {
      const batches = new Set<string>();
      
      // Fetch from BATCHES collection
      const batchesSnap = await getDocs(collection(db, COLLECTIONS.BATCHES));
      batchesSnap.forEach(doc => {
        const name = doc.data().name;
        const active = doc.data().active;
        if (name && active !== false) batches.add(name);
      });
      
      return Array.from(batches).sort();
    } catch (error) {
      console.error('Error fetching unique batches:', error);
      return [];
    }
  },

  mapDocToAnnouncement(doc: DocumentData): Announcement {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date()
    } as Announcement;
  }
};
