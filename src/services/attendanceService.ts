import { 
  collection, 
  getDocs, 
  query, 
  where,
  orderBy, 
  doc, 
  writeBatch,
  Timestamp,
  updateDoc,
  type DocumentData 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../constants';
import type { AttendanceRecord, AttendanceStatus } from '../types';

export const attendanceService = {
  // Uses client-side filtering for courseId and date because we only have [studentId, date] composite index
  async fetchByBatchAndDate(courseId: string, batchId: string, date: Date): Promise<AttendanceRecord[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, COLLECTIONS.ATTENDANCE),
      where('batchId', '==', batchId)
    );
    
    const snap = await getDocs(q);
    
    // Client-side mapping and filtering to obey index limits
    return snap.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data() as DocumentData).date?.toDate(),
        markedAt: (doc.data() as DocumentData).markedAt?.toDate(),
      } as AttendanceRecord))
      .filter(record => 
        record.courseId === courseId && 
        record.date >= startOfDay && 
        record.date <= endOfDay
      )
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  },

  // Optimized query using the existing composite index [studentId ASC, date DESC]
  async fetchByStudent(studentId: string): Promise<AttendanceRecord[]> {
    const q = query(
      collection(db, COLLECTIONS.ATTENDANCE),
      where('studentId', '==', studentId),
      orderBy('date', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: (doc.data() as DocumentData).date?.toDate(),
      markedAt: (doc.data() as DocumentData).markedAt?.toDate(),
    } as AttendanceRecord));
  },

  // Client-side filter for courseId to avoid needing [batchId, courseId] index
  async fetchByBatch(courseId: string, batchId: string): Promise<AttendanceRecord[]> {
    const q = query(
      collection(db, COLLECTIONS.ATTENDANCE),
      where('batchId', '==', batchId)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data() as DocumentData).date?.toDate(),
        markedAt: (doc.data() as DocumentData).markedAt?.toDate(),
      } as AttendanceRecord))
      .filter(record => record.courseId === courseId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  },

  async fetchAll(): Promise<AttendanceRecord[]> {
    const q = query(
      collection(db, COLLECTIONS.ATTENDANCE),
      orderBy('date', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: (doc.data() as DocumentData).date?.toDate(),
      markedAt: (doc.data() as DocumentData).markedAt?.toDate(),
    } as AttendanceRecord));
  },

  async bulkSaveAttendance(records: AttendanceRecord[], markedBy: string): Promise<void> {
    const batch = writeBatch(db);
    const now = Timestamp.now();

    records.forEach(record => {
      if (record.id) {
        // Update existing record
        const docRef = doc(db, COLLECTIONS.ATTENDANCE, record.id);
        batch.update(docRef, {
          status: record.status,
          markedBy,
          markedAt: now,
          notes: record.notes || ''
        });
      } else {
        // Create new record
        const docRef = doc(collection(db, COLLECTIONS.ATTENDANCE));
        const docData: DocumentData = {
          ...record,
          date: Timestamp.fromDate(record.date),
          markedBy,
          markedAt: now,
          notes: record.notes || ''
        };
        delete docData.id; // Remove empty ID field for new docs
        batch.set(docRef, docData);
      }
    });

    await batch.commit();
  },

  async fetchBatchDailyStats(courseId: string, batchId: string, month: number, year: number) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // Fetch all records for this batch/course to compute stats
    // Note: In production with huge data, we might want a 'dailyAttendanceSummary' collection
    const q = query(
      collection(db, COLLECTIONS.ATTENDANCE),
      where('batchId', '==', batchId)
    );
    
    const snap = await getDocs(q);
    const records = snap.docs
      .map(doc => ({
        ...(doc.data() as AttendanceRecord),
        date: (doc.data() as DocumentData).date?.toDate(),
      }))
      .filter(r => 
        r.courseId === courseId && 
        r.date >= startDate && 
        r.date <= endDate
      );

    const stats: Record<number, { present: number; absent: number; late: number; excused: number }> = {};
    
    records.forEach(r => {
      const day = r.date.getDate();
      if (!stats[day]) stats[day] = { present: 0, absent: 0, late: 0, excused: 0 };
      const status = r.status as AttendanceStatus;
      if (stats[day][status] !== undefined) {
        stats[day][status]++;
      }
    });

    return stats;
  },

  async markAttendance(records: Omit<AttendanceRecord, 'id' | 'markedAt'>[]): Promise<void> {
    const batch = writeBatch(db);
    const now = Timestamp.now();

    records.forEach(record => {
      const docRef = doc(collection(db, COLLECTIONS.ATTENDANCE));
      const docData: DocumentData = {
        ...record,
        date: Timestamp.fromDate(record.date),
        markedAt: now
      };
      batch.set(docRef, docData);
    });

    await batch.commit();
  },

  async updateStatus(recordId: string, status: AttendanceStatus, markedBy: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.ATTENDANCE, recordId);
    await updateDoc(docRef, {
      status,
      markedBy,
      markedAt: Timestamp.now()
    });
  }
};
