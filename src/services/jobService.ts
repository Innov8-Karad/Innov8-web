import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  type DocumentData
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../constants';
import type { Job, JobApplication, ApplicationStatus } from '../types';

export const jobService = {
  /**
   * Real-time subscription to all jobs, ordered by creation date (newest first).
   */
  subscribeToJobs(
    callback: (jobs: Job[]) => void,
    onError?: (error: Error) => void
  ) {
    const q = query(
      collection(db, COLLECTIONS.JOBS),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snap) => {
      const jobs = snap.docs.map(d => ({
        ...d.data(),
        id: d.id
      } as Job));
      callback(jobs);
    }, onError);
  },

  /**
   * Create a new job posting.
   */
  async createJob(data: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docData: DocumentData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, COLLECTIONS.JOBS), docData);
    return docRef.id;
  },

  /**
   * Update an existing job posting.
   */
  async updateJob(id: string, data: Partial<Job>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.JOBS, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  /**
   * Delete a job posting.
   */
  async deleteJob(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.JOBS, id);
    await deleteDoc(docRef);
  },

  /**
   * Real-time subscription to applicants for a specific job.
   */
  subscribeToApplications(
    jobId: string,
    callback: (applications: JobApplication[]) => void,
    onError?: (error: Error) => void
  ) {
    const q = query(
      collection(db, COLLECTIONS.JOBS, jobId, 'applications'),
      orderBy('appliedAt', 'desc')
    );

    return onSnapshot(q, (snap) => {
      const apps = snap.docs.map(d => ({
        ...d.data(),
        id: d.id
      } as JobApplication));
      callback(apps);
    }, onError);
  },

  /**
   * Update an applicant's status.
   */
  async updateApplicationStatus(
    jobId: string,
    applicationId: string,
    status: ApplicationStatus
  ): Promise<void> {
    const docRef = doc(db, COLLECTIONS.JOBS, jobId, 'applications', applicationId);
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp()
    });
  }
};
