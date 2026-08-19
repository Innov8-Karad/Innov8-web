import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  type DocumentData
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import { COLLECTIONS } from '../constants';
import type { Job, JobApplication, ApplicationStatus } from '../types';

export interface AdzunaSearchResult {
  id: string;
  role: string;
  companyName: string;
  location: string;
  salary: string;
  jobType: 'Full-time' | 'Internship';
  description: string;
  sourceUrl: string;
  created: string;
  isAlreadyImported: boolean;
  importedJobId?: string;
}

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
      source: data.source || 'manual',
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

  async deleteJob(id: string): Promise<void> {
    // 1. Delete all applications in subcollection
    const appsRef = collection(db, COLLECTIONS.JOBS, id, 'applications');
    const appsSnap = await getDocs(appsRef);
    const deletePromises = appsSnap.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // 2. Delete the job doc
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
  },

  // ── Job Import & Approval Methods ──────────────────────────────────────

  /**
   * Real-time subscription to jobs pending admin review.
   */
  subscribeToPendingJobs(
    callback: (jobs: Job[]) => void,
    onError?: (error: Error) => void
  ) {
    const q = query(
      collection(db, COLLECTIONS.JOBS),
      where('pendingApproval', '==', true),
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
   * Approve a pending job — makes it active and visible to students.
   */
  async approveJob(jobId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.JOBS, jobId);
    await updateDoc(docRef, {
      isActive: true,
      pendingApproval: false,
      updatedAt: serverTimestamp()
    });
  },

  /**
   * Reject a pending job — permanently deletes the doc.
   */
  async rejectJob(jobId: string): Promise<void> {
    // Pending jobs won't have applications, but reuse deleteJob for safety
    const docRef = doc(db, COLLECTIONS.JOBS, jobId);
    await deleteDoc(docRef);
  },

  /**
   * Search jobs from Adzuna via Cloud Function.
   */
  async searchAdzunaJobs(params: {
    query: string;
    location?: string;
    page?: number;
    resultsPerPage?: number;
  }): Promise<{ results: AdzunaSearchResult[]; totalCount: number }> {
    const callable = httpsCallable<
      { query: string; location?: string; page?: number; resultsPerPage?: number },
      { results: AdzunaSearchResult[]; totalCount: number }
    >(functions, 'searchAdzunaJobs');
    const response = await callable(params);
    return response.data;
  },

  /**
   * Import an Adzuna search result into the Firestore jobs collection under Pending Review.
   */
  async importAdzunaJob(job: AdzunaSearchResult): Promise<string> {
    const docData: DocumentData = {
      companyName: job.companyName || 'Unknown Company',
      role: job.role || 'Untitled Role',
      location: job.location || 'Pune',
      salary: job.salary || 'Not Disclosed',
      jobType: job.jobType || 'Full-time',
      description: job.description || '',
      requirements: [],
      eligibleStudentIds: [],
      applyLink: job.sourceUrl,
      isActive: false,
      pendingApproval: true,
      source: 'adzuna',
      sourceUrl: job.sourceUrl,
      postedDate: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, COLLECTIONS.JOBS), docData);
    return docRef.id;
  },

  /**
   * Bulk import multiple Adzuna search results into Firestore.
   */
  async bulkImportAdzunaJobs(jobs: AdzunaSearchResult[]): Promise<{ importedCount: number }> {
    let importedCount = 0;
    for (const job of jobs) {
      if (!job.isAlreadyImported) {
        await jobService.importAdzunaJob(job);
        importedCount++;
      }
    }
    return { importedCount };
  },
};

