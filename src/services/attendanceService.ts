import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { COLLECTIONS } from '../constants';
import type { AttendanceRecord } from '../types';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Format a JS Date to YYYY-MM-DD string (local timezone) */
function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Normalize a Date to midnight UTC for consistent Firestore storage */
function toMidnightUTC(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/** Convert Firestore Timestamp or raw object to JS Date */
function toDate(val: unknown): Date {
  if (val instanceof Date) return val;
  if (val && typeof val === 'object' && 'seconds' in (val as object)) {
    return new Date((val as { seconds: number }).seconds * 1000);
  }
  return new Date();
}

/** Map a Firestore document snapshot to an AttendanceRecord */
function mapDoc(snap: { id: string; data(): Record<string, unknown> }): AttendanceRecord {
  const d = snap.data();
  return {
    id: snap.id,
    studentId: d.studentId as string,
    studentName: d.studentName as string,
    studentEmail: d.studentEmail as string,
    batchId: d.batchId as string,
    batchName: d.batchName as string,
    date: toDate(d.date),
    status: d.status as 'present' | 'absent',
    markedBy: d.markedBy as string,
    createdAt: toDate(d.createdAt),
    updatedAt: d.updatedAt ? toDate(d.updatedAt) : undefined,
  };
}

// ── Service Object ─────────────────────────────────────────────────────────────

export interface AttendanceStudentRow {
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: 'present' | 'absent' | 'unmarked';
  recordId?: string; // existing doc ID if already marked
}

export const attendanceService = {
  /**
   * Real-time listener for all attendance records for a given batch on a given date.
   * Used in the Daily View to pre-fill statuses.
   */
  subscribeToAttendance(
    batchId: string,
    date: Date,
    callback: (records: AttendanceRecord[]) => void
  ): () => void {
    const dayStart = Timestamp.fromDate(toMidnightUTC(date));
    // End of day (exclusive upper bound)
    const dayEnd = Timestamp.fromDate(
      new Date(toMidnightUTC(date).getTime() + 24 * 60 * 60 * 1000)
    );

    const q = query(
      collection(db, COLLECTIONS.ATTENDANCE),
      where('batchId', '==', batchId),
      where('date', '>=', dayStart),
      where('date', '<', dayEnd)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        callback(snapshot.docs.map(mapDoc));
      },
      (error) => {
        console.error('Error subscribing to attendance:', error);
        callback([]);
      }
    );
  },

  /**
   * Batch-write all attendance records atomically using deterministic document IDs.
   * ID format: {batchId}_{studentId}_{YYYY-MM-DD}
   * This ensures whole-day attendance is taken only once — subsequent saves upsert.
   */
  async markAttendance(
    rows: AttendanceStudentRow[],
    batchId: string,
    batchName: string,
    date: Date
  ): Promise<void> {
    const adminUid = auth.currentUser?.uid || 'admin';
    const dateStr = toDateString(date);
    const normalizedDate = Timestamp.fromDate(toMidnightUTC(date));
    const now = Timestamp.now();

    const batch = writeBatch(db);

    for (const row of rows) {
      if (row.status === 'unmarked') continue; // skip unmarked rows
      const docId = `${batchId}_${row.studentId}_${dateStr}`;
      const docRef = doc(db, COLLECTIONS.ATTENDANCE, docId);
      batch.set(
        docRef,
        {
          studentId: row.studentId,
          studentName: row.studentName,
          studentEmail: row.studentEmail,
          batchId,
          batchName,
          date: normalizedDate,
          status: row.status,
          markedBy: adminUid,
          createdAt: now,
          updatedAt: now,
        },
        { merge: true }
      );
    }

    await batch.commit();
  },

  /**
   * Toggle a single student's attendance status for a given record.
   */
  async updateAttendanceStatus(
    recordId: string,
    status: 'present' | 'absent'
  ): Promise<void> {
    const docRef = doc(db, COLLECTIONS.ATTENDANCE, recordId);
    await updateDoc(docRef, {
      status,
      updatedAt: Timestamp.now(),
      markedBy: auth.currentUser?.uid || 'admin',
    });
  },

  /**
   * Fetch all attendance records for a batch in a given month.
   * Used in the Monthly Report view — client-side groups by studentId.
   */
  async fetchMonthlyAttendance(
    batchId: string,
    year: number,
    month: number // 0-indexed (Jan = 0)
  ): Promise<AttendanceRecord[]> {
    const monthStart = Timestamp.fromDate(new Date(Date.UTC(year, month, 1)));
    const monthEnd = Timestamp.fromDate(new Date(Date.UTC(year, month + 1, 1)));

    const q = query(
      collection(db, COLLECTIONS.ATTENDANCE),
      where('batchId', '==', batchId),
      where('date', '>=', monthStart),
      where('date', '<', monthEnd)
    );

    const snap = await getDocs(q);
    return snap.docs.map(mapDoc);
  },

  /**
   * Fetch all attendance records for a specific student (mobile / admin student detail).
   */
  async fetchStudentAttendance(studentEmail: string): Promise<AttendanceRecord[]> {
    const q = query(
      collection(db, COLLECTIONS.ATTENDANCE),
      where('studentEmail', '==', studentEmail),
      orderBy('date', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(mapDoc);
  },
};
