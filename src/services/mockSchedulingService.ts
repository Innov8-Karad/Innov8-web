import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  Timestamp,
  writeBatch,
  runTransaction,
  type DocumentData,
  type DocumentReference,
  type QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../constants';
import type { MockSchedule, MockRegistration } from '../types';
import { announcementService } from './announcementService';
import { sendNotification } from './notificationService';

export const mockSchedulingService = {
  /**
   * Create a new mock schedule, publish its announcement, and send push notifications.
   */
  async createMockSchedule(
    data: Omit<MockSchedule, 'id' | 'registeredCount' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<MockSchedule> {
    const docData: DocumentData = {
      title: data.title,
      description: data.description,
      scheduledDate: Timestamp.fromDate(new Date(data.scheduledDate)),
      studentLimit: Number(data.studentLimit),
      registeredCount: 0,
      status: 'open',
      targetAudience: data.targetAudience,
      targetBatches: data.targetBatches || [],
      createdBy: data.createdBy,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.MOCK_SCHEDULES), docData);
    const scheduleId = docRef.id;

    // Resolve batch IDs to batch names for announcements & notifications.
    // The Cloud Function queries users by `batch` (name), not `batchId`,
    // so we must pass human-readable names instead of Firestore document IDs.
    let resolvedBatchNames: string[] = data.targetBatches || [];
    if (data.targetAudience === 'batch' && resolvedBatchNames.length > 0) {
      const names: string[] = [];
      for (const batchId of resolvedBatchNames) {
        try {
          const batchSnap = await getDoc(doc(db, COLLECTIONS.BATCHES, batchId));
          if (batchSnap.exists()) {
            names.push(batchSnap.data().name || batchId);
          } else {
            names.push(batchId); // fallback to ID if doc not found
          }
        } catch {
          names.push(batchId);
        }
      }
      resolvedBatchNames = names;
    }

    // Create corresponding announcement
    try {
      await announcementService.createAnnouncement({
        title: `Mock Session: ${data.title}`,
        content: `A new mock session has been scheduled for ${new Date(data.scheduledDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}. Seats are limited to ${data.studentLimit}. Tap here to register!`,
        targetAudience: data.targetAudience,
        targetBatches: resolvedBatchNames,
        showAsPopup: false,
        mockScheduleId: scheduleId,
        priority: 'high',
      });
    } catch (annError) {
      console.error('Failed to create mock scheduling announcement:', annError);
    }

    // Trigger targeted push notifications via Cloud Function
    try {
      await sendNotification({
        title: 'New Mock Session Available!',
        body: `${data.title} - scheduled for ${new Date(data.scheduledDate).toLocaleDateString()}. Tap to register!`,
        targetAudience: data.targetAudience,
        targetBatches: resolvedBatchNames,
      });
    } catch (notifError) {
      console.error('Failed to send mock scheduling push notification:', notifError);
    }

    return {
      id: scheduleId,
      ...docData,
      scheduledDate: new Date(data.scheduledDate),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as MockSchedule;
  },

  /**
   * Real-time listener for all mock schedules.
   */
  subscribeToMockSchedules(callback: (schedules: MockSchedule[]) => void) {
    const q = query(
      collection(db, COLLECTIONS.MOCK_SCHEDULES),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const schedules = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          scheduledDate: data.scheduledDate instanceof Timestamp ? data.scheduledDate.toDate() : new Date(data.scheduledDate),
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
        } as MockSchedule;
      });
      callback(schedules);
    }, (error) => {
      console.error('Error subscribing to mock schedules:', error);
      callback([]);
    });
  },

  /**
   * Real-time listener for student registrations under a specific schedule.
   */
  subscribeToRegistrations(scheduleId: string, callback: (registrations: MockRegistration[]) => void) {
    const q = query(
      collection(db, COLLECTIONS.MOCK_SCHEDULES, scheduleId, 'registrations'),
      orderBy('registeredAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const registrations = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          registeredAt: data.registeredAt instanceof Timestamp ? data.registeredAt.toDate() : new Date(data.registeredAt),
        } as MockRegistration;
      });
      callback(registrations);
    }, (error) => {
      console.error('Error subscribing to mock registrations:', error);
      callback([]);
    });
  },

  /**
   * Close registration manually.
   */
  async closeMockSchedule(scheduleId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.MOCK_SCHEDULES, scheduleId);
    await updateDoc(docRef, {
      status: 'closed',
      updatedAt: Timestamp.now(),
    });
  },

  /**
   * Delete a mock schedule and all its registrations sub-collection documents.
   */
  async deleteMockSchedule(scheduleId: string): Promise<void> {
    // 1. Fetch and delete all registrations under sub-collection
    const registrationsRef = collection(db, COLLECTIONS.MOCK_SCHEDULES, scheduleId, 'registrations');
    const registrationsSnap = await getDocs(registrationsRef);

    const batch = writeBatch(db);
    registrationsSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // 2. Commit sub-collection deletions
    await batch.commit();

    // 3. Delete the main schedule document
    const docRef = doc(db, COLLECTIONS.MOCK_SCHEDULES, scheduleId);
    await deleteDoc(docRef);

    // 4. Find and delete corresponding announcements that reference this mockScheduleId
    try {
      const q = query(collection(db, COLLECTIONS.ANNOUNCEMENTS));
      const annSnap = await getDocs(q);
      const annDeleteBatch = writeBatch(db);
      let found = false;

      annSnap.docs.forEach((annDoc) => {
        if (annDoc.data().mockScheduleId === scheduleId) {
          annDeleteBatch.delete(annDoc.ref);
          found = true;
        }
      });

      if (found) {
        await annDeleteBatch.commit();
      }
    } catch (err) {
      console.error('Failed to clear associated announcements:', err);
    }
  },

  /**
   * Block a student globally: Add to mock_blocked_students, and mark all their active registrations as 'blocked'
   */
  async blockStudentGlobally(user: MockRegistration): Promise<void> {
    const batch = writeBatch(db);

    // 1. Add to global block list
    const blockRef = doc(db, 'mock_blocked_students', user.userId);
    batch.set(blockRef, {
      userId: user.userId,
      userName: user.userName,
      userEmail: user.userEmail,
      userPhone: user.userPhone || '',
      userBatch: user.userBatch,
      blockedAt: Timestamp.now(),
    });

    // 2. Query all active mock schedules
    const schedulesRef = collection(db, COLLECTIONS.MOCK_SCHEDULES);
    const schedulesQuery = query(schedulesRef, where('status', '==', 'open'));
    const schedulesSnap = await getDocs(schedulesQuery);

    const registrationsToBlock: { regRef: DocumentReference, scheduleDoc: QueryDocumentSnapshot }[] = [];

    // 3. Find if user is registered in any active schedule
    for (const scheduleDoc of schedulesSnap.docs) {
      const regRef = doc(db, COLLECTIONS.MOCK_SCHEDULES, scheduleDoc.id, 'registrations', user.userId);
      registrationsToBlock.push({ regRef, scheduleDoc });
    }

    // We can't safely batch get within the loop and mix with batch sets easily, so let's do a runTransaction for each found schedule?
    // Actually, a simple update is fine. Let's just do it directly.
    await batch.commit(); // commit the block first.

    // Now process active schedules individually to handle seats properly via transactions
    for (const { regRef, scheduleDoc } of registrationsToBlock) {
      try {
        await runTransaction(db, async (transaction) => {
          const rDoc = await transaction.get(regRef);
          if (rDoc.exists() && (rDoc.data() as MockRegistration).status !== 'blocked') {
            const sDoc = await transaction.get(scheduleDoc.ref);
            if (sDoc.exists()) {
              const sData = sDoc.data() as MockSchedule;
              const newCount = Math.max(0, sData.registeredCount - 1);
              transaction.update(regRef, {
                status: 'blocked',
                updatedAt: Timestamp.now()
              });
              transaction.update(scheduleDoc.ref, {
                registeredCount: newCount,
                status: newCount < sData.studentLimit ? 'open' : sData.status,
                updatedAt: Timestamp.now()
              });
            }
          }
        });
      } catch (err) {
        console.error('Error blocking registration in schedule', scheduleDoc.id, err);
      }
    }
  },

  /**
   * Unblock a student globally.
   */
  async unblockStudentGlobally(userId: string): Promise<void> {
    const blockRef = doc(db, 'mock_blocked_students', userId);
    await deleteDoc(blockRef);
  },

  /**
   * Subscribe to globally blocked students
   */
  subscribeToGlobalBlockedStudents(callback: (blocked: MockRegistration[]) => void) {
    const q = query(
      collection(db, 'mock_blocked_students'),
      orderBy('blockedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const blocked = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          userPhone: data.userPhone,
          userBatch: data.userBatch,
          registeredAt: data.blockedAt instanceof Timestamp ? data.blockedAt.toDate() : new Date(data.blockedAt),
          status: 'blocked',
        } as MockRegistration;
      });
      callback(blocked);
    }, (error) => {
      console.error('Error subscribing to mock blocked students:', error);
      callback([]);
    });
  },
};
