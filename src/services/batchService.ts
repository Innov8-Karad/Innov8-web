import { 
  collection, 
  getDocs, 
  getDoc,
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
  arrayUnion,
  arrayRemove,
  type DocumentData,
  type DocumentReference
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { deleteFromCloudinary } from '../lib/cloudinary';
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
    // 1. Resolve student doc reference: direct by request.userId, or fallback by email if doc ID doesn't exist
    let targetUserId = request.userId;
    let altUserId: string | null = null;
    const initialUserSnap = await getDoc(doc(db, COLLECTIONS.USERS, targetUserId));
    if (!initialUserSnap.exists() && request.userEmail) {
      const q = query(collection(db, COLLECTIONS.USERS), where('email', '==', request.userEmail.toLowerCase().trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        targetUserId = snap.docs[0].id;
      }
    } else if (request.userEmail) {
      const q = query(collection(db, COLLECTIONS.USERS), where('email', '==', request.userEmail.toLowerCase().trim()));
      const snap = await getDocs(q);
      if (!snap.empty && snap.docs[0].id !== targetUserId) {
        altUserId = snap.docs[0].id;
      }
    }

    const userRef = doc(db, COLLECTIONS.USERS, targetUserId);
    const altUserRef = altUserId ? doc(db, COLLECTIONS.USERS, altUserId) : null;
    const batchRef = doc(db, COLLECTIONS.BATCHES, request.batchId);
    const requestRef = doc(db, COLLECTIONS.ENROLLMENT_REQUESTS, request.id);

    console.log("APPROVE DIAGNOSTIC:", {
        requestId: request.id,
        targetUserId,
        altUserId,
        originalUserId: request.userId,
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
      if (!userSnap.exists()) {
        throw new Error(`Student document not found for user ID: ${targetUserId}`);
      }

      const batchData = batchSnap.data();
      const userData = userSnap.data();
      const finalBatchName = request.batchName || batchData?.name || 'Assigned Batch';
      const finalCourseName = request.courseName || batchData?.courseName || '';

      // 1. Update User — append to arrays for multi-batch support
      const userUpdate: Record<string, unknown> = {
        batchIds: arrayUnion(request.batchId),
        batches: arrayUnion(finalBatchName),
        updatedAt: Timestamp.now()
      };

      // If user had a legacy batchId, make sure it is also included in batchIds array!
      if (userData?.batchId) {
        userUpdate.batchIds = arrayUnion(userData.batchId, request.batchId);
      }
      if (userData?.batch) {
        userUpdate.batches = arrayUnion(userData.batch, finalBatchName);
      }

      // Set scalar fields only if user has no primary batch yet (backward compat)
      if (!userData?.batchId) {
        userUpdate.batch = finalBatchName;
        userUpdate.batchId = request.batchId;
      }
      // Only set course fields if they exist and user has no primary course
      if (finalCourseName && !userData?.courseId) {
        userUpdate.course = finalCourseName;
        userUpdate.courseId = request.courseId || batchData?.courseId || '';
      }
      transaction.update(userRef, userUpdate);
      if (altUserRef) {
        transaction.update(altUserRef, userUpdate);
      }

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

    // 1. Check for alternate documents matching the student's email before transaction
    const initialUserSnap = await getDoc(userRef);
    let userEmail = '';
    const altUserRefs: DocumentReference[] = [];
    if (initialUserSnap.exists()) {
      userEmail = initialUserSnap.data()?.email?.toLowerCase().trim() || '';
    }
    if (userEmail) {
      const q = query(collection(db, COLLECTIONS.USERS), where('email', '==', userEmail));
      const snaps = await getDocs(q);
      snaps.docs.forEach(d => {
        if (d.id !== userId) {
          altUserRefs.push(d.ref);
        }
      });
    }

    await runTransaction(db, async (transaction) => {
      // ── PHASE 1: Reads ──
      const userSnap = await transaction.get(userRef);
      const batchSnap = await transaction.get(batchRef);
      const altSnaps = await Promise.all(altUserRefs.map(ref => transaction.get(ref)));

      if (!userSnap.exists() && altSnaps.length === 0) {
        throw new Error("Student document not found");
      }

      const batchName = batchSnap.exists() ? (batchSnap.data()?.name || '') : '';
      const allUserSnaps = [userSnap, ...altSnaps].filter(s => s.exists());

      // Check if we need to promote a next batch for primary scalar fields
      let nextBatchData: DocumentData | null = null;
      for (const snap of allUserSnaps) {
        const uData = snap.data();
        if (uData?.batchId === batchId) {
          const currentIds: string[] = uData?.batchIds || [];
          const remaining = currentIds.filter((id: string) => id !== batchId);
          if (remaining.length > 0 && !nextBatchData) {
            const nextBatchRef = doc(db, COLLECTIONS.BATCHES, remaining[0]);
            const nextSnap = await transaction.get(nextBatchRef);
            if (nextSnap.exists()) {
              nextBatchData = nextSnap.data();
            }
          }
        }
      }

      // ── PHASE 2: Writes ──
      for (const snap of allUserSnaps) {
        const uData = snap.data();
        const currentIds: string[] = uData?.batchIds || [];
        const remaining = currentIds.filter((id: string) => id !== batchId);

        const userUpdate: Record<string, unknown> = {
          batchIds: arrayRemove(batchId),
          updatedAt: Timestamp.now()
        };
        if (batchName) {
          userUpdate.batches = arrayRemove(batchName);
        }
        if (uData?.batch && uData.batchId === batchId) {
          userUpdate.batches = arrayRemove(uData.batch);
        }

        // If removing the primary batch, reassign or clear scalar fields
        if (uData?.batchId === batchId) {
          if (remaining.length > 0) {
            userUpdate.batch = nextBatchData?.name || '';
            userUpdate.batchId = remaining[0];
            userUpdate.course = nextBatchData?.courseName || '';
            userUpdate.courseId = nextBatchData?.courseId || '';
          } else {
            userUpdate.batch = '';
            userUpdate.batchId = '';
            userUpdate.course = '';
            userUpdate.courseId = '';
          }
        }

        transaction.update(snap.ref, userUpdate);
      }

      // Decrement Batch Student Count
      if (batchSnap.exists()) {
        const currentCount = batchSnap.data()?.studentCount || 0;
        transaction.update(batchRef, { studentCount: Math.max(0, currentCount - 1) });
      }

      // Notification to student
      const notifRef = doc(collection(db, 'notifications'));
      transaction.set(notifRef, {
        title: 'Batch Enrollment Update',
        body: `You have been removed from ${batchName || 'your batch'}.`,
        userId: userId,
        type: 'general',
        isRead: false,
        createdAt: Timestamp.now()
      });
    });

    // Clean up any enrollment requests for this batch and student
    try {
      const qUser = query(
        collection(db, COLLECTIONS.ENROLLMENT_REQUESTS), 
        where('batchId', '==', batchId), 
        where('userId', '==', userId)
      );
      const snapUser = await getDocs(qUser);
      for (const reqDoc of snapUser.docs) {
        await updateDoc(reqDoc.ref, { status: 'removed', resolvedAt: Timestamp.now() });
      }

      if (userEmail) {
        const qEmail = query(
          collection(db, COLLECTIONS.ENROLLMENT_REQUESTS), 
          where('batchId', '==', batchId), 
          where('userEmail', '==', userEmail)
        );
        const snapEmail = await getDocs(qEmail);
        for (const reqDoc of snapEmail.docs) {
          await updateDoc(reqDoc.ref, { status: 'removed', resolvedAt: Timestamp.now() });
        }
      }
    } catch (reqErr) {
      console.warn("Failed to update enrollment requests on batch removal:", reqErr);
    }
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
      const userData = userSnap.data();
      const finalBatchName = batchData?.name || 'Assigned Batch';
      const finalCourseName = batchData?.courseName || '';

      // 1. Update User — append to arrays for multi-batch support
      const userUpdate: Record<string, unknown> = {
        batchIds: arrayUnion(batchId),
        batches: arrayUnion(finalBatchName),
        updatedAt: Timestamp.now()
      };
      // Set scalar fields only if user has no primary batch yet
      if (!userData?.batchId) {
        userUpdate.batch = finalBatchName;
        userUpdate.batchId = batchId;
      }
      if (finalCourseName && !userData?.courseId) {
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
      const sorted = [...resources].sort((a, b) => {
        const timeA = a.createdAt?.seconds || a.createdAt?.toMillis?.() || (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
        const timeB = b.createdAt?.seconds || b.createdAt?.toMillis?.() || (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
        return timeA - timeB;
      });
      callback(sorted);
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

    // Read doc before deleting to get Cloudinary publicId for cleanup
    const docSnap = await getDoc(docRef);
    const resourceData = docSnap.data();
    const cloudinaryPublicId = resourceData?.cloudinaryPublicId as string | undefined;

    await deleteDoc(docRef);

    // Best-effort: delete Cloudinary asset
    if (cloudinaryPublicId) {
      const resourceType = resourceData?.type === 'pdf' ? 'raw' : resourceData?.type === 'video' ? 'video' : 'image';
      deleteFromCloudinary(cloudinaryPublicId, resourceType);
    }
  },

  async cloneBatchCurriculum(sourceBatchId: string, targetBatchId: string): Promise<void> {
    // 1. Get all modules from source
    const modulesSnap = await getDocs(query(collection(db, COLLECTIONS.BATCHES, sourceBatchId, 'modules'), orderBy('order', 'asc')));
    const resourcesSnap = await getDocs(collection(db, COLLECTIONS.BATCHES, sourceBatchId, 'resources'));

    const sourceModules = modulesSnap.docs.map(d => ({ id: d.id, ...d.data() } as CourseModule));
    const sourceResources = resourcesSnap.docs.map(d => ({ id: d.id, ...d.data() } as CourseResource));

    // Sort sourceResources by createdAt ascending before cloning to preserve sequence
    const sortedSourceResources = [...sourceResources].sort((a, b) => {
      const timeA = a.createdAt?.seconds || a.createdAt?.toMillis?.() || (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
      const timeB = b.createdAt?.seconds || b.createdAt?.toMillis?.() || (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
      return timeA - timeB;
    });

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
    for (const res of sortedSourceResources) {
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
    // 1. Clean up all submission files from Cloudinary
    const submissionsSnap = await getDocs(
      collection(db, COLLECTIONS.BATCHES, batchId, 'assignments', assignmentId, 'submissions')
    );
    for (const submissionDoc of submissionsSnap.docs) {
      const subData = submissionDoc.data();
      if (subData.cloudinaryPublicId) {
        const resType = subData.fileType === 'pdf' ? 'raw' : 'image';
        deleteFromCloudinary(subData.cloudinaryPublicId, resType);
      }
      await deleteDoc(submissionDoc.ref);
    }

    // 2. Delete the assignment document itself
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
  },

  async recalculateBatchStudentCounts(): Promise<void> {
    try {
      const batchesSnap = await getDocs(collection(db, COLLECTIONS.BATCHES));
      const usersSnap = await getDocs(query(collection(db, COLLECTIONS.USERS), where('role', '==', 'student')));
      
      const counts: Record<string, number> = {};
      usersSnap.docs.forEach((document) => {
        const u = document.data();
        // Support both array (multi-batch) and scalar (legacy) formats
        const userBatchIds: string[] = u.batchIds || (u.batchId ? [u.batchId] : []);
        userBatchIds.forEach((bid: string) => {
          counts[bid] = (counts[bid] || 0) + 1;
        });
      });

      const batch = writeBatch(db);
      let updatesCount = 0;
      batchesSnap.docs.forEach((batchDoc) => {
        const currentCount = counts[batchDoc.id] || 0;
        if (batchDoc.data().studentCount !== currentCount) {
          batch.update(doc(db, COLLECTIONS.BATCHES, batchDoc.id), { studentCount: currentCount });
          updatesCount++;
        }
      });
      
      if (updatesCount > 0) {
        await batch.commit();
        console.log(`Successfully synced student counts for ${updatesCount} batches.`);
      }
    } catch (err) {
      console.error("Error recalculating batch student counts:", err);
    }
  }
};
