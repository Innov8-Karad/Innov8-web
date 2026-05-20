import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  writeBatch,
  type DocumentData
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
        targetBatches: data.targetBatches,
        showAsPopup: true,
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
        targetBatches: data.targetBatches,
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
};
