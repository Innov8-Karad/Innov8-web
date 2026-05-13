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
