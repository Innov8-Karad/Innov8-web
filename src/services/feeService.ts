import {
  collection,
  getDocs,
  getDoc,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS, FEE_STATUS } from '../constants';
import type { Fee, FeeStatus, InstallmentPayment } from '../types';

// ─── Helper: safe number ──────────────────────────────────────────────────────
const num = (v: unknown): number => Number(v) || 0;

// ─── Helper: Firestore doc → Fee ──────────────────────────────────────────────
function docToFee(d: DocumentData, id: string): Fee {
  return {
    id,
    userId: d.userId || '',
    studentName: d.studentName || '',
    email: d.email || '',
    course: d.course || '',
    description: d.description || '',
    amount: num(d.amount),
    totalPaid: num(d.totalPaid),
    status: d.status || FEE_STATUS.PENDING,
    dueDate: d.dueDate?.toDate?.() ?? new Date(),
    paidDate: d.paidDate?.toDate?.() ?? undefined,
    createdAt: d.createdAt?.toDate?.() ?? new Date(),
    method: d.method,
    receiptUrl: d.receiptUrl,
    studentId: d.studentId || d.userId || '',
  } as Fee;
}

// ─── Helper: Firestore doc → InstallmentPayment ──────────────────────────────
function docToInstallment(d: DocumentData, id: string): InstallmentPayment {
  return {
    id,
    amount: num(d.amount),
    paidDate: d.paidDate?.toDate?.() ?? new Date(),
    method: d.method || 'Manual',
    notes: d.notes || '',
    recordedBy: d.recordedBy || '',
    createdAt: d.createdAt?.toDate?.() ?? new Date(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
export const feeService = {
  // ─── READ ───────────────────────────────────────────────────────────────────
  async fetchFees(): Promise<Fee[]> {
    const q = query(collection(db, COLLECTIONS.FEES), orderBy('dueDate', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => docToFee(d.data(), d.id));
  },

  async fetchFeeById(feeId: string): Promise<Fee | null> {
    const snap = await getDoc(doc(db, COLLECTIONS.FEES, feeId));
    if (!snap.exists()) return null;
    return docToFee(snap.data(), snap.id);
  },

  async fetchInstallments(feeId: string): Promise<InstallmentPayment[]> {
    const q = query(
      collection(db, COLLECTIONS.FEES, feeId, COLLECTIONS.PAYMENT_HISTORY),
      orderBy('createdAt', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => docToInstallment(d.data(), d.id));
  },

  // ─── CREATE ─────────────────────────────────────────────────────────────────
  async createFee(data: Record<string, unknown>): Promise<Fee> {
    const amount = num(data.amount);
    const docData = {
      userId: data.userId || '',
      studentId: data.studentId || data.userId || '',
      studentName: data.studentName || '',
      email: data.email || '',
      course: data.course || '',
      description: data.description || '',
      amount,
      totalPaid: 0,
      status: FEE_STATUS.PENDING,
      dueDate: Timestamp.fromDate(new Date(data.dueDate as string)),
      createdAt: Timestamp.now(),
    };
    const ref = await addDoc(collection(db, COLLECTIONS.FEES), docData);
    return docToFee({ ...docData, dueDate: { toDate: () => new Date(data.dueDate as string) }, createdAt: { toDate: () => new Date() } }, ref.id);
  },

  // ─── UPDATE ─────────────────────────────────────────────────────────────────
  async updateFee(feeId: string, updates: { amount?: number; dueDate?: Date; description?: string }): Promise<void> {
    const ref = doc(db, COLLECTIONS.FEES, feeId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Fee not found');

    const current = snap.data();
    const newAmount = updates.amount !== undefined ? num(updates.amount) : num(current.amount);
    const totalPaid = num(current.totalPaid);

    // Recalculate status
    let newStatus: FeeStatus = FEE_STATUS.PENDING as FeeStatus;
    if (totalPaid >= newAmount && newAmount > 0) {
      newStatus = FEE_STATUS.PAID as FeeStatus;
    } else if (totalPaid > 0) {
      newStatus = FEE_STATUS.PARTIAL as FeeStatus;
    }

    const updateData: Record<string, unknown> = { status: newStatus };
    if (updates.amount !== undefined) updateData.amount = newAmount;
    if (updates.dueDate) updateData.dueDate = Timestamp.fromDate(updates.dueDate);
    if (updates.description !== undefined) updateData.description = updates.description;
    if (newStatus === FEE_STATUS.PAID) {
      updateData.paidDate = current.paidDate || Timestamp.now();
    }

    await updateDoc(ref, updateData);
  },

  // ─── DELETE ─────────────────────────────────────────────────────────────────
  async deleteFee(feeId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.FEES, feeId));
  },

  // ─── INSTALLMENTS ──────────────────────────────────────────────────────────
  async addInstallment(
    feeId: string,
    installment: { amount: number; paidDate: Date; method: string; notes: string; recordedBy: string },
  ): Promise<InstallmentPayment> {
    const instAmount = num(installment.amount);

    // 1. Write installment doc
    const historyRef = collection(db, COLLECTIONS.FEES, feeId, COLLECTIONS.PAYMENT_HISTORY);
    const instDoc = {
      amount: instAmount,
      paidDate: Timestamp.fromDate(installment.paidDate),
      method: installment.method,
      notes: installment.notes,
      recordedBy: installment.recordedBy,
      createdAt: Timestamp.now(),
    };
    const ref = await addDoc(historyRef, instDoc);

    // 2. Read fresh parent fee to avoid stale data
    const feeSnap = await getDoc(doc(db, COLLECTIONS.FEES, feeId));
    if (!feeSnap.exists()) throw new Error('Fee not found');
    const feeData = feeSnap.data();

    const feeAmount = num(feeData.amount);
    const newTotalPaid = num(feeData.totalPaid) + instAmount;

    // 3. Update parent fee
    const feeUpdate: Record<string, unknown> = { totalPaid: newTotalPaid };
    if (newTotalPaid >= feeAmount) {
      feeUpdate.status = FEE_STATUS.PAID;
      feeUpdate.paidDate = Timestamp.now();
    } else if (newTotalPaid > 0) {
      feeUpdate.status = FEE_STATUS.PARTIAL;
    }
    await updateDoc(doc(db, COLLECTIONS.FEES, feeId), feeUpdate);

    return {
      id: ref.id,
      amount: instAmount,
      paidDate: installment.paidDate,
      method: installment.method as 'Cash' | 'Bank' | 'Manual',
      notes: installment.notes,
      recordedBy: installment.recordedBy,
      createdAt: new Date(),
    };
  },

  async markFullyPaid(feeId: string): Promise<InstallmentPayment> {
    // Read fresh fee
    const snap = await getDoc(doc(db, COLLECTIONS.FEES, feeId));
    if (!snap.exists()) throw new Error('Fee not found');
    const data = snap.data();
    const remaining = num(data.amount) - num(data.totalPaid);

    return this.addInstallment(feeId, {
      amount: Math.max(remaining, 0),
      paidDate: new Date(),
      method: 'Manual',
      notes: 'Marked as fully paid by admin',
      recordedBy: 'admin',
    });
  },

  // ─── MIGRATION ──────────────────────────────────────────────────────────────
  async migrateLegacyFees(): Promise<number> {
    const snap = await getDocs(collection(db, COLLECTIONS.FEES));
    let count = 0;
    for (const d of snap.docs) {
      const data = d.data();
      const needsFix =
        (data.userId && !data.studentId) ||
        typeof data.amount !== 'number' ||
        typeof data.totalPaid !== 'number';

      if (needsFix) {
        await updateDoc(doc(db, COLLECTIONS.FEES, d.id), {
          studentId: data.studentId || data.userId || '',
          amount: num(data.amount),
          totalPaid: num(data.totalPaid),
        });
        count++;
      }
    }
    return count;
  },
};
