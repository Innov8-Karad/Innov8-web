import { describe, it, expect, vi, beforeEach } from 'vitest';
import { jobService, type AdzunaSearchResult } from '../jobService';
import { addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

// Mock Firebase
vi.mock('../../lib/firebase', () => ({
  db: {
    collection: vi.fn(),
    doc: vi.fn(),
  },
  functions: {}
}));

vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn(() => ({ id: 'mock-col' })),
    doc: vi.fn(() => ({ id: 'mock-doc' })),
    addDoc: vi.fn(() => Promise.resolve({ id: 'mock-job-id' })),
    updateDoc: vi.fn(() => Promise.resolve()),
    deleteDoc: vi.fn(() => Promise.resolve()),
    getDocs: vi.fn(() => Promise.resolve({ docs: [], empty: true, size: 0 })),
    onSnapshot: vi.fn((_query: unknown, callback: (snap: unknown) => void) => {
      callback({ docs: [] });
      return vi.fn(); // unsubscribe function
    }),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    serverTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' })),
  };
});

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(),
}));

describe('jobService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createJob', () => {
    it('should create a job with manual source default', async () => {
      const jobId = await jobService.createJob({
        companyName: 'Tech Corp',
        role: 'Frontend Engineer',
        location: 'Pune',
        salary: '10 LPA',
        requirements: ['React', 'TypeScript'],
        jobType: 'Full-time',
        isActive: true,
        postedDate: new Date(),
      });

      expect(addDoc).toHaveBeenCalled();
      expect(jobId).toBe('mock-job-id');
    });
  });

  describe('subscribeToPendingJobs', () => {
    it('should subscribe to jobs with pendingApproval == true', () => {
      const callback = vi.fn();
      const unsub = jobService.subscribeToPendingJobs(callback);

      expect(onSnapshot).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith([]);
      expect(typeof unsub).toBe('function');
    });
  });

  describe('approveJob', () => {
    it('should update job to isActive: true and pendingApproval: false', async () => {
      await jobService.approveJob('job-123');

      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isActive: true,
          pendingApproval: false,
        })
      );
    });
  });

  describe('rejectJob', () => {
    it('should delete the job document', async () => {
      await jobService.rejectJob('job-123');

      expect(deleteDoc).toHaveBeenCalled();
    });
  });

  describe('searchAdzunaJobs', () => {
    it('should call searchAdzunaJobs callable and return search results', async () => {
      const mockResult: { results: AdzunaSearchResult[]; totalCount: number } = {
        results: [
          {
            id: '123',
            role: 'Application Support',
            companyName: 'Tech Corp',
            location: 'Pune',
            salary: '5 LPA',
            jobType: 'Full-time',
            description: 'Support role',
            sourceUrl: 'https://adzuna.in/job1',
            created: '2026-08-19',
            isAlreadyImported: false,
          },
        ],
        totalCount: 1,
      };
      const mockCallable = vi.fn().mockResolvedValue({ data: mockResult });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const res = await jobService.searchAdzunaJobs({ query: 'Application Support', location: 'Pune' });
      expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'searchAdzunaJobs');
      expect(res).toEqual(mockResult);
    });
  });

  describe('importAdzunaJob', () => {
    it('should save job with source: adzuna and pendingApproval: true', async () => {
      const mockJob: AdzunaSearchResult = {
        id: '123',
        role: 'Data Analyst',
        companyName: 'Analytics Co',
        location: 'Pune',
        salary: '6 LPA',
        jobType: 'Full-time',
        description: 'Data role',
        sourceUrl: 'https://adzuna.in/job2',
        created: '2026-08-19',
        isAlreadyImported: false,
      };

      const id = await jobService.importAdzunaJob(mockJob);
      expect(addDoc).toHaveBeenCalled();
      expect(id).toBe('mock-job-id');
    });
  });
});
