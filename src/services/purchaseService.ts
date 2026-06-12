import {
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    serverTimestamp,
    setDoc,
    getDoc,
    writeBatch,
    deleteDoc,
    Timestamp,
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../constants';

export interface PurchaseRequest {
    id: string;
    userId: string;
    courseId: string;
    courseName: string;
    userName: string;
    userEmail: string;
    userPhone?: string;
    screenshotUrl?: string;
    amount: number;
    paymentMethod: string;
    transactionId?: string;
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
    purchasedAt?: Date | { seconds: number; nanoseconds: number } | Timestamp;
    createdAt?: Date | { seconds: number; nanoseconds: number };
    updatedAt?: Date | { seconds: number; nanoseconds: number };
}

export interface PaymentSettings {
    upiId: string;
    qrCodeUrl: string;
    instructionsText: string;
}

/**
 * Fetch all purchase requests, ordered by creation time descending.
 */
export function subscribeToPurchaseRequests(
    callback: (requests: PurchaseRequest[]) => void
): Unsubscribe {
    const q = query(
        collection(db, COLLECTIONS.COURSE_PURCHASES),
        orderBy('purchasedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const requests: PurchaseRequest[] = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const purchasedAtVal = data.purchasedAt instanceof Timestamp ? data.purchasedAt.toDate() : data.purchasedAt;
            const createdAtVal = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? data.createdAt : purchasedAtVal);
            const updatedAtVal = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : data.updatedAt;
            requests.push({
                id: docSnap.id,
                ...data,
                purchasedAt: purchasedAtVal,
                createdAt: createdAtVal,
                updatedAt: updatedAtVal,
            } as PurchaseRequest);
        });
        callback(requests);
    });
}

/**
 * Approve a course purchase request.
 * Sets status to 'approved' and grants the course to the user.
 */
export async function approvePurchaseRequest(
    requestId: string
): Promise<void> {
    const batch = writeBatch(db);

    // 1. Update purchase request status
    const purchaseRef = doc(db, COLLECTIONS.COURSE_PURCHASES, requestId);
    batch.update(purchaseRef, {
        status: 'approved',
        updatedAt: serverTimestamp(),
    });

    await batch.commit();
}

/**
 * Reject a course purchase request.
 * Sets status to 'rejected' and optionally saves a reason.
 */
export async function rejectPurchaseRequest(
    requestId: string,
    reason?: string
): Promise<void> {
    const batch = writeBatch(db);

    // 1. Update purchase request status
    const purchaseRef = doc(db, COLLECTIONS.COURSE_PURCHASES, requestId);
    batch.update(purchaseRef, {
        status: 'rejected',
        rejectionReason: reason || '',
        updatedAt: serverTimestamp(),
    });

    await batch.commit();
}

/**
 * Delete a purchase request record.
 */
export async function deletePurchaseRequest(requestId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.COURSE_PURCHASES, requestId);
    await deleteDoc(docRef);
}

/**
 * Fetch the global payment settings.
 */
export async function fetchPaymentSettings(): Promise<PaymentSettings | null> {
    const docRef = doc(db, COLLECTIONS.PAYMENT_SETTINGS, 'config');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data() as PaymentSettings;
    }
    return null;
}

/**
 * Save the global payment settings.
 */
export async function savePaymentSettings(settings: PaymentSettings): Promise<void> {
    const docRef = doc(db, COLLECTIONS.PAYMENT_SETTINGS, 'config');
    await setDoc(docRef, {
        ...settings,
        updatedAt: serverTimestamp(),
    });
}
