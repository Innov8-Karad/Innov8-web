import { 
  collection, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type DocumentData 
} from 'firebase/firestore';
import { db, storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { COLLECTIONS } from '../constants';
import type { Job, JobApplication } from '../types';

export const jobService = {
  // 1. Job CRUD
  subscribeToJobs(callback: (jobs: Job[]) => void, onError?: (error: Error) => void) {
    const q = query(
      collection(db, COLLECTIONS.JOBS),
      orderBy('postedAt', 'desc')
    );
    
    return onSnapshot(q, (snap) => {
      const jobs = snap.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as Job));
      callback(jobs);
    }, onError);
  },

  async createJob(data: Partial<Job>): Promise<string> {
    try {
      const docData: DocumentData = {
        ...data,
        postedAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, COLLECTIONS.JOBS), docData);
      return docRef.id;
    } catch (error) {
      console.error("Error in createJob:", error);
      throw error;
    }
  },

  async updateJob(id: string, data: Partial<Job>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.JOBS, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  },

  async deleteJob(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.JOBS, id);
    await deleteDoc(docRef);
  },

  // 2. Applicant Tracking
  subscribeToApplicants(jobId: string, callback: (applicants: JobApplication[]) => void, onError?: (error: Error) => void) {
    const q = query(
      collection(db, `${COLLECTIONS.JOBS}/${jobId}/applications`),
      orderBy('appliedAt', 'desc')
    );
    
    return onSnapshot(q, (snap) => {
      const applicants = snap.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as JobApplication));
      callback(applicants);
    }, onError);
  },

  async updateApplicationStatus(jobId: string, userId: string, status: JobApplication['status']): Promise<void> {
    const docRef = doc(db, COLLECTIONS.JOBS, jobId, 'applications', userId);
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp()
    });
  },

  async uploadJobLogo(file: File): Promise<string> {
    const fileExtension = file.name.split('.').pop();
    const fileName = `jobLogos/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExtension}`;
    const storageRef = ref(storage, fileName);
    
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  }
};
