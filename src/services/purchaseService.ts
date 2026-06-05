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
    arrayUnion,
    arrayRemove,
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
    purchasedAt: Timestamp;
    status: 'pending' | 'approved' | 'rejected';
    paymentMethod: string;
    transactionId?: string;
    rejectionReason?: string;
    updatedAt?: Timestamp;
}

export interface PaymentSettings {
    upiId: string;
    qrCodeUrl: string;
    instructionsText: string;
}

/**
 * Subscribe to all course purchase requests in real-time.
 */
export function subscribeToPurchaseRequests(
    callback: (requests: PurchaseRequest[]) => void
): Unsubscribe {
    const q = query(
        collection(db, COLLECTIONS.COURSE_PURCHASES),
        orderBy('purchasedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as PurchaseRequest[];
        callback(requests);
    }, (error) => {
        console.error("Error subscribing to purchase requests:", error);
        callback([]);
    });
}

/**
 * Approve a course purchase request.
 * Sets the request status to 'approved' and adds the userId to the course's purchasedBy array.
 */
export async function approvePurchaseRequest(
    requestId: string,
    courseId: string,
    userId: string
): Promise<void> {
    const batch = writeBatch(db);

    // 1. Update purchase request status
    const purchaseRef = doc(db, COLLECTIONS.COURSE_PURCHASES, requestId);
    batch.update(purchaseRef, {
        status: 'approved',
        updatedAt: serverTimestamp(),
    });

    // 2. Add student to course's purchasedBy list
    const courseRef = doc(db, COLLECTIONS.COURSES, courseId);
    batch.update(courseRef, {
        purchasedBy: arrayUnion(userId),
    });

    await batch.commit();
}

/**
 * Reject a course purchase request.
 * Sets status to 'rejected' and optionally saves a reason.
 */
export async function rejectPurchaseRequest(
    requestId: string,
    courseId: string,
    userId: string,
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

    // 2. Remove student from course's purchasedBy list (if previously added)
    const courseRef = doc(db, COLLECTIONS.COURSES, courseId);
    batch.update(courseRef, {
        purchasedBy: arrayRemove(userId),
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
