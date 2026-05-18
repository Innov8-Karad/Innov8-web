import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
  Timestamp,
  runTransaction,
  writeBatch,
  type DocumentData 
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { COLLECTIONS } from '../constants';
import type { Batch, EnrollmentRequest, CourseModule, CourseResource, AssignmentType, AssignmentSubmission } from '../types';

export const batchService = {
  // ── Batch Management ──

  subscribeToBatches(callback: (batches: Batch[]) => void) {
    const q = query(collection(db, COLLECTIONS.BATCHES), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const batches = snapshot.docs.map(document => ({ 
        id: document.id, 
        ...document.data(),
        createdAt: document.data().createdAt?.toDate() || new Date(),
        updatedAt: document.data().updatedAt?.toDate() || null,
        startDate: document.data().startDate || '',
        endDate: document.data().endDate || ''
      } as Batch));
      callback(batches);
    }, (error) => {
      console.error("Error subscribing to batches:", error);
      callback([]);
    });
  },

  async fetchBatches(): Promise<Batch[]> {
    const q = query(collection(db, COLLECTIONS.BATCHES), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(document => ({ 
      id: document.id, 
      ...document.data(),
      createdAt: document.data().createdAt?.toDate() || new Date()
    } as Batch));
  },

  async createBatch(data: Omit<Batch, 'id' | 'createdAt' | 'studentCount'>): Promise<string> {
    const docData: DocumentData = {
      ...data,
      studentCount: 0,
      createdAt: Timestamp.now(),
      active: data.active ?? true
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.BATCHES), docData);
    return docRef.id;
  },

  async updateBatch(id: string, data: Partial<Batch>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.BATCHES, id);
    await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
  },

  async deleteBatch(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.BATCHES, id);
    await deleteDoc(docRef);
  },

  // ── Enrollment Requests (Admin Side) ──

  subscribeToPendingRequests(callback: (requests: EnrollmentRequest[]) => void) {
    // Removed orderBy to avoid missing index errors in production
    const q = query(
      collection(db, COLLECTIONS.ENROLLMENT_REQUESTS), 
      where('status', '==', 'pending')
    );

    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(document => ({ 
        id: document.id, 
        ...document.data(),
        requestedAt: document.data().requestedAt?.toDate() || new Date()
      } as EnrollmentRequest));

      // Sort locally by requestedAt (descending)
      requests.sort((a, b) => {
        const timeA = a.requestedAt instanceof Date ? a.requestedAt.getTime() : 0;
        const timeB = b.requestedAt instanceof Date ? b.requestedAt.getTime() : 0;
        return timeB - timeA;
      });

      callback(requests);
    }, (error) => {
      console.error("Error subscribing to enrollment requests:", error);
      callback([]);
    });
  },

  async approveEnrollment(request: EnrollmentRequest): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, request.userId);
    const batchRef = doc(db, COLLECTIONS.BATCHES, request.batchId);
    const requestRef = doc(db, COLLECTIONS.ENROLLMENT_REQUESTS, request.id);

    console.log("APPROVE DIAGNOSTIC:", {
        requestId: request.id,
        userId: request.userId,
        batchId: request.batchId,
        adminUid: auth.currentUser?.uid
    });

    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      const batchSnap = await transaction.get(batchRef);
      const requestSnap = await transaction.get(requestRef);

      console.log("SNAP STATUS:", {
        user: userSnap.exists(),
        batch: batchSnap.exists(),
        request: requestSnap.exists()
      });

      if (!requestSnap.exists() || requestSnap.data().status !== 'pending') {
        throw new Error("Request no longer valid or already processed.");
      }

      const batchData = batchSnap.data();
      const finalBatchName = request.batchName || batchData?.name || 'Assigned Batch';
      const finalCourseName = request.courseName || batchData?.courseName || '';

      // 1. Update User
      const userUpdate: Record<string, unknown> = {
        batch: finalBatchName,
        batchId: request.batchId,
        updatedAt: Timestamp.now()
      };
      // Only set course fields if they exist
      if (finalCourseName) {
        userUpdate.course = finalCourseName;
        userUpdate.courseId = request.courseId || batchData?.courseId || '';
      }
      transaction.update(userRef, userUpdate);

      // 2. Update Batch Count
      if (batchSnap.exists()) {
        const currentCount = batchData?.studentCount || 0;
        transaction.update(batchRef, { studentCount: currentCount + 1 });
      }

      // 3. Resolve Request
      transaction.update(requestRef, {
        status: 'approved',
        resolvedAt: Timestamp.now()
      });

      // 4. Send Notification
      const notifRef = doc(collection(db, 'notifications'));
      transaction.set(notifRef, {
        title: 'Enrollment Approved!',
        body: `You have been successfully enrolled in ${finalBatchName}.${finalCourseName ? ` (${finalCourseName})` : ''}`,
        userId: request.userId,
        type: 'general',
        isRead: false,
        createdAt: Timestamp.now()
      });
    });
  },

  async rejectEnrollment(requestId: string): Promise<void> {
    const requestRef = doc(db, COLLECTIONS.ENROLLMENT_REQUESTS, requestId);
    await updateDoc(requestRef, {
      status: 'rejected',
      resolvedAt: Timestamp.now()
    });
  },

  // ── Student Actions (Mobile/Web integration) ──

  async requestEnrollment(data: Omit<EnrollmentRequest, 'id' | 'status' | 'requestedAt'>): Promise<void> {
    const docData: DocumentData = {
      ...data,
      status: 'pending',
      requestedAt: Timestamp.now()
    };
    await addDoc(collection(db, COLLECTIONS.ENROLLMENT_REQUESTS), docData);
  },

  async fetchUserRequests(userId: string): Promise<EnrollmentRequest[]> {
    const q = query(
      collection(db, COLLECTIONS.ENROLLMENT_REQUESTS), 
      where('userId', '==', userId),
      orderBy('requestedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(document => ({ 
      id: document.id, 
      ...document.data(),
      requestedAt: document.data().requestedAt?.toDate() || new Date()
    } as EnrollmentRequest));
  },

  async removeStudentFromBatch(userId: string, batchId: string): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const batchRef = doc(db, COLLECTIONS.BATCHES, batchId);

    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      const batchSnap = await transaction.get(batchRef);

      if (userSnap.exists()) {
        transaction.update(userRef, {
          batch: '',
          batchId: '',
          course: '',
          courseId: '',
          updatedAt: Timestamp.now()
        });
      }

      if (batchSnap.exists()) {
        const currentCount = batchSnap.data()?.studentCount || 0;
        transaction.update(batchRef, { studentCount: Math.max(0, currentCount - 1) });
      }
    });
  },

  async addStudentToBatch(userId: string, batchId: string): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const batchRef = doc(db, COLLECTIONS.BATCHES, batchId);

    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      const batchSnap = await transaction.get(batchRef);

      if (!userSnap.exists()) throw new Error("Student not found");
      if (!batchSnap.exists()) throw new Error("Batch not found");

      const batchData = batchSnap.data();
      const finalBatchName = batchData?.name || 'Assigned Batch';
      const finalCourseName = batchData?.courseName || '';

      // 1. Update User
      const userUpdate: Record<string, unknown> = {
        batch: finalBatchName,
        batchId: batchId,
        updatedAt: Timestamp.now()
      };
      if (finalCourseName) {
        userUpdate.course = finalCourseName;
        userUpdate.courseId = batchData?.courseId || '';
      }
      transaction.update(userRef, userUpdate);

      // 2. Update Batch Count
      const currentCount = batchData?.studentCount || 0;
      transaction.update(batchRef, { studentCount: currentCount + 1 });

      // 3. Send Notification
      const notifRef = doc(collection(db, 'notifications'));
      transaction.set(notifRef, {
        title: 'Manually Enrolled!',
        body: `An administrator has manually enrolled you in ${finalBatchName}.${finalCourseName ? ` (${finalCourseName})` : ''}`,
        userId: userId,
        type: 'general',
        isRead: false,
        createdAt: Timestamp.now()
      });
    });
  },

  // ── Batch Curriculum (Modules & Resources) ──

  subscribeToModules(batchId: string, callback: (modules: CourseModule[]) => void) {
    const q = query(
      collection(db, COLLECTIONS.BATCHES, batchId, 'modules'),
      orderBy('order', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      const modules = snapshot.docs.map(document => ({ id: document.id, ...document.data() } as CourseModule));
      callback(modules);
    }, (error) => {
      console.error("Error subscribing to batch modules:", error);
      callback([]);
    });
  },

  async addModule(batchId: string, module: Omit<CourseModule, 'id'>): Promise<CourseModule> {
    const docRef = await addDoc(collection(db, COLLECTIONS.BATCHES, batchId, 'modules'), {
      ...module,
      resources: module.resources || [],
      createdAt: Timestamp.now()
    });
    return { id: docRef.id, ...module };
  },

  async updateModule(batchId: string, moduleId: string, data: Partial<CourseModule>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.BATCHES, batchId, 'modules', moduleId);
    await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
  },

  async deleteModule(batchId: string, moduleId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.BATCHES, batchId, 'modules', moduleId);
    await deleteDoc(docRef);
  },

  subscribeToResources(batchId: string, callback: (resources: CourseResource[]) => void) {
    const q = query(collection(db, COLLECTIONS.BATCHES, batchId, 'resources'));
    return onSnapshot(q, (snapshot) => {
      const resources = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseResource));
      callback(resources);
    }, (error) => {
      console.error("Error subscribing to batch resources:", error);
      callback([]);
    });
  },

  async addResource(batchId: string, moduleId: string, resource: Omit<CourseResource, 'id'>): Promise<void> {
    const cleanedResource = Object.fromEntries(
      Object.entries(resource).filter((entry) => entry[1] !== undefined && entry[1] !== '')
    );
    await addDoc(collection(db, COLLECTIONS.BATCHES, batchId, 'resources'), {
      ...cleanedResource,
      moduleId,
      createdAt: Timestamp.now()
    });
  },

  async updateResource(batchId: string, resourceId: string, data: Partial<CourseResource>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.BATCHES, batchId, 'resources', resourceId);
    await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
  },

  async deleteResource(batchId: string, resourceId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.BATCHES, batchId, 'resources', resourceId);
    await deleteDoc(docRef);
  },

  async cloneBatchCurriculum(sourceBatchId: string, targetBatchId: string): Promise<void> {
    // 1. Get all modules from source
    const modulesSnap = await getDocs(query(collection(db, COLLECTIONS.BATCHES, sourceBatchId, 'modules'), orderBy('order', 'asc')));
    const resourcesSnap = await getDocs(collection(db, COLLECTIONS.BATCHES, sourceBatchId, 'resources'));

    const sourceModules = modulesSnap.docs.map(d => ({ id: d.id, ...d.data() } as CourseModule));
    const sourceResources = resourcesSnap.docs.map(d => ({ id: d.id, ...d.data() } as CourseResource));

    const batch = writeBatch(db);

    // Track module ID mapping (Old ID -> New ID)
    const moduleIdMap: Record<string, string> = {};

    // 2. Clone Modules
    for (const mod of sourceModules) {
      const newModRef = doc(collection(db, COLLECTIONS.BATCHES, targetBatchId, 'modules'));
      moduleIdMap[mod.id] = newModRef.id;
      
      const modData: Partial<CourseModule> = { ...mod };
      delete modData.id;
      batch.set(newModRef, {
        ...modData,
        createdAt: Timestamp.now(),
        updatedAt: null
      });
    }

    // 3. Clone Resources
    for (const res of sourceResources) {
      if (!res.moduleId) continue;
      
      const newResRef = doc(collection(db, COLLECTIONS.BATCHES, targetBatchId, 'resources'));
      const newModuleId = moduleIdMap[res.moduleId];
      
      // Only clone if the module was also cloned (or handle orphaned resources if needed)
      if (newModuleId) {
        const resData: Partial<CourseResource> = { ...res };
        delete resData.id;
        batch.set(newResRef, {
          ...resData,
          moduleId: newModuleId,
          createdAt: Timestamp.now(),
          updatedAt: null
        });
      }
    }

    await batch.commit();
  },

  // ── Assignments ──
  subscribeToAssignments(batchId: string, callback: (assignments: AssignmentType[]) => void) {
    const q = query(collection(db, COLLECTIONS.BATCHES, batchId, 'assignments'));
    return onSnapshot(q, (snapshot) => {
      const assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssignmentType));
      callback(assignments);
    }, (error) => {
      console.error("Error subscribing to batch assignments:", error);
      callback([]);
    });
  },

  async addAssignment(batchId: string, assignment: Omit<AssignmentType, 'id'>): Promise<void> {
    await addDoc(collection(db, COLLECTIONS.BATCHES, batchId, 'assignments'), {
      ...assignment,
      createdAt: Timestamp.now()
    });
  },

  async updateAssignment(batchId: string, assignmentId: string, data: Partial<AssignmentType>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.BATCHES, batchId, 'assignments', assignmentId);
    await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
  },

  async deleteAssignment(batchId: string, assignmentId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.BATCHES, batchId, 'assignments', assignmentId);
    await deleteDoc(docRef);
  },

  // ── Assignment Submissions ──
  subscribeToSubmissions(batchId: string, assignmentId: string, callback: (submissions: AssignmentSubmission[]) => void) {
    const q = query(
      collection(db, COLLECTIONS.BATCHES, batchId, 'assignments', assignmentId, 'submissions'),
      orderBy('submittedAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssignmentSubmission));
      callback(submissions);
    }, (error) => {
      console.error("Error subscribing to batch submissions:", error);
      callback([]);
    });
  },

  async updateSubmissionGrade(batchId: string, assignmentId: string, submissionId: string, data: Partial<AssignmentSubmission>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.BATCHES, batchId, 'assignments', assignmentId, 'submissions', submissionId);
    await updateDoc(docRef, { ...data, gradedAt: Timestamp.now() });
  }
};
