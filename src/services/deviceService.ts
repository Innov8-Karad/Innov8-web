// ═══════════════════════════════════════════════════════════════════════════════
// Device Approval Service — Firestore queries for the devices collection
// ═══════════════════════════════════════════════════════════════════════════════

import {
    collection,
    query,
    orderBy,
    onSnapshot,
    doc,
    updateDoc,
    serverTimestamp,
    where,
    deleteDoc,
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../constants';
import type { DeviceDocument, DeviceStatus } from '../types';

export interface DeviceDocumentWithId extends DeviceDocument {
    id: string;
}

/**
 * Subscribe to all device documents with real-time updates.
 */
export function subscribeToDevices(
    callback: (devices: DeviceDocumentWithId[]) => void,
    filterStatus?: DeviceStatus | 'all'
): Unsubscribe {
    let q;

    if (filterStatus && filterStatus !== 'all') {
        q = query(
            collection(db, COLLECTIONS.DEVICES),
            where('status', '==', filterStatus),
            orderBy('createdAt', 'desc')
        );
    } else {
        q = query(
            collection(db, COLLECTIONS.DEVICES),
            orderBy('createdAt', 'desc')
        );
    }

    return onSnapshot(q, (snapshot) => {
        const devices: DeviceDocumentWithId[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as DeviceDocumentWithId[];

        callback(devices);
    });
}

/**
 * Approve a device login request.
 */
export async function approveDevice(deviceDocId: string, adminUid: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.DEVICES, deviceDocId);
    await updateDoc(docRef, {
        status: 'approved',
        reviewedBy: adminUid,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Reject a device login request.
 */
export async function rejectDevice(deviceDocId: string, adminUid: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.DEVICES, deviceDocId);
    await updateDoc(docRef, {
        status: 'rejected',
        reviewedBy: adminUid,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Delete a device document entirely (removes the device registration).
 */
export async function deleteDevice(deviceDocId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.DEVICES, deviceDocId);
    await deleteDoc(docRef);
}
