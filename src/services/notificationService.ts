// ═══════════════════════════════════════════════════════════════════════════════
// Notification Service — Admin Panel
// ═══════════════════════════════════════════════════════════════════════════════
// Handles calling the onSendNotification Cloud Function and fetching
// notification history from Firestore.
// ═══════════════════════════════════════════════════════════════════════════════

import { getFunctions, httpsCallable } from 'firebase/functions';
import {
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    Timestamp,
    where,
    writeBatch,
    doc,
    deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// ── Types ───────────────────────────────────────────────────────────────────

export interface SendNotificationPayload {
    title: string;
    body: string;
    targetAudience: 'all' | 'batch' | 'students';
    targetBatches?: string[];
    targetStudentIds?: string[];
}

export interface SendNotificationResult {
    success: boolean;
    message: string;
    tokenCount: number;
}

export interface NotificationRecord {
    id: string;
    title: string;
    body: string;
    targetAudience: 'all' | 'batch' | 'students';
    targetBatches: string[];
    targetStudentIds: string[];
    sentBy: string;
    tokenCount: number;
    createdAt: Date;
}

// ── Service Functions ───────────────────────────────────────────────────────

const functions = getFunctions(undefined, 'asia-south1');

/**
 * Send a push notification via the onSendNotification Cloud Function.
 */
export async function sendNotification(
    payload: SendNotificationPayload
): Promise<SendNotificationResult> {
    const callable = httpsCallable<SendNotificationPayload, SendNotificationResult>(
        functions,
        'onSendNotification'
    );
    const result = await callable(payload);
    return result.data;
}

/**
 * Fetch notification history from Firestore (most recent first).
 */
export async function fetchNotificationHistory(
    maxResults = 50
): Promise<NotificationRecord[]> {
    // Run cleanup in background
    cleanupExpiredNotifications().catch(err => console.error("Error during notification cleanup:", err));

    const q = query(
        collection(db, 'notifications'),
        orderBy('createdAt', 'desc'),
        limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            title: data.title || '',
            body: data.body || '',
            targetAudience: data.targetAudience || 'all',
            targetBatches: data.targetBatches || [],
            targetStudentIds: data.targetStudentIds || [],
            sentBy: data.sentBy || '',
            tokenCount: data.tokenCount || 0,
            createdAt: data.createdAt instanceof Timestamp
                ? data.createdAt.toDate()
                : new Date(data.createdAt),
        };
    });
}

/**
 * Cleanup notifications older than 8 days.
 */
export async function cleanupExpiredNotifications(): Promise<void> {
    const EXPIRY_DAYS = 8;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - EXPIRY_DAYS);

    const q = query(
        collection(db, 'notifications'),
        where("createdAt", "<", Timestamp.fromDate(cutoffDate))
    );

    const snap = await getDocs(q);
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Auto-cleaned ${snap.size} expired notifications.`);
}

/**
 * Delete a notification record from history by ID.
 */
export async function deleteNotification(id: string): Promise<void> {
    const docRef = doc(db, 'notifications', id);
    await deleteDoc(docRef);
}
