// ═══════════════════════════════════════════════════════════════════════════════
// Interview Service — Innov8 Web Admin Panel
// ═══════════════════════════════════════════════════════════════════════════════

import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    orderBy,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Interview } from '../types';

const INTERVIEWS_COLLECTION = 'interviews';

export const interviewService = {
    /**
     * Subscribe to all interviews (real-time)
     */
    subscribeToInterviews(callback: (interviews: Interview[]) => void) {
        const q = query(
            collection(db, INTERVIEWS_COLLECTION),
            orderBy('scheduledDate', 'desc')
        );
        return onSnapshot(q, (snapshot) => {
            const interviews = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                scheduledDate: doc.data().scheduledDate?.toDate?.() || new Date(doc.data().scheduledDate),
                createdAt: doc.data().createdAt?.toDate?.() || undefined,
                updatedAt: doc.data().updatedAt?.toDate?.() || undefined,
            } as Interview));
            callback(interviews);
        }, (error) => {
            console.error("Error subscribing to interviews:", error);
            callback([]);
        });
    },

    /**
     * Create a new interview
     */
    async createInterview(interview: Omit<Interview, 'id'>): Promise<void> {
        await addDoc(collection(db, INTERVIEWS_COLLECTION), {
            ...interview,
            scheduledDate: interview.scheduledDate instanceof Date
                ? Timestamp.fromDate(interview.scheduledDate)
                : interview.scheduledDate,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
    },

    /**
     * Update an existing interview
     */
    async updateInterview(id: string, data: Partial<Interview>): Promise<void> {
        const docRef = doc(db, INTERVIEWS_COLLECTION, id);
        const updateData: Record<string, unknown> = { ...data, updatedAt: Timestamp.now() };
        
        if (data.scheduledDate instanceof Date) {
            updateData.scheduledDate = Timestamp.fromDate(data.scheduledDate);
        }
        
        await updateDoc(docRef, updateData);
    },

    /**
     * Delete an interview
     */
    async deleteInterview(id: string): Promise<void> {
        const docRef = doc(db, INTERVIEWS_COLLECTION, id);
        await deleteDoc(docRef);
    },
};
