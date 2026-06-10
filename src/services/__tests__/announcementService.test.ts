import { describe, it, expect, vi, beforeEach } from 'vitest';
import { announcementService } from '../announcementService';
import { getDocs, addDoc, writeBatch } from 'firebase/firestore';

// Mock Firebase
vi.mock('../../lib/firebase', () => ({
  db: {
    collection: vi.fn(),
    doc: vi.fn(),
  }
}));

vi.mock('firebase/firestore', () => {
  class MockTimestamp {
    toDate() { return new Date(); }
    static now() { return new MockTimestamp(); }
    static fromDate() { return new MockTimestamp(); }
  }
  return {
    collection: vi.fn(),
    doc: vi.fn(),
    getDocs: vi.fn(() => Promise.resolve({ docs: [], empty: true, size: 0 })),
    getDoc: vi.fn(),
    addDoc: vi.fn(),
    deleteDoc: vi.fn(),
    updateDoc: vi.fn(),
    writeBatch: vi.fn(() => ({
      delete: vi.fn(),
      commit: vi.fn(() => Promise.resolve())
    })),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    Timestamp: MockTimestamp
  };
});

describe('announcementService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchAnnouncements', () => {
    it('should fetch announcements and return formatted list', async () => {
      const mockDocs = [
        { 
          id: '1', 
          data: () => ({ 
            title: 'Test', 
            content: 'Body', 
            priority: 'high', 
            targetBatches: ['B1'],
            createdAt: { toDate: () => new Date() }
          }) 
        }
      ];
      
      vi.mocked(getDocs).mockResolvedValue({ docs: mockDocs } as never);

      const items = await announcementService.fetchAnnouncements();
      
      expect(getDocs).toHaveBeenCalled();
      expect(items.length).toBe(1);
      expect(items[0].title).toBe('Test');
    });
  });

  describe('createAnnouncement', () => {
    it('should add a new announcement document', async () => {
      const data = {
        title: 'New Announcement',
        content: 'Something important',
        priority: 'medium' as const,
        targetBatches: ['All']
      };

      vi.mocked(addDoc).mockResolvedValueOnce({ id: 'new-id' } as never);

      const result = await announcementService.createAnnouncement(data);
      
      expect(addDoc).toHaveBeenCalled();
      expect(result.title).toBe(data.title);
    });
  });

  describe('cleanupExpiredAnnouncements', () => {
    it('should delete announcements older than 8 days', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      const mockDocs = [
        { id: 'old-1', data: () => ({ createdAt: { toDate: () => oldDate } }) }
      ];

      const mockBatch = {
        delete: vi.fn(),
        commit: vi.fn(() => Promise.resolve())
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(writeBatch).mockReturnValue(mockBatch as any);
      vi.mocked(getDocs).mockResolvedValue({ docs: mockDocs, empty: false, size: 1 } as never);

      await announcementService.cleanupExpiredAnnouncements();

      expect(mockBatch.delete).toHaveBeenCalled();
      expect(mockBatch.commit).toHaveBeenCalled();
    });

    it('should not delete recent announcements', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2);

      const mockBatch = {
        delete: vi.fn(),
        commit: vi.fn(() => Promise.resolve())
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(writeBatch).mockReturnValue(mockBatch as any);
      vi.mocked(getDocs).mockResolvedValue({ docs: [], empty: true, size: 0 } as never);

      await announcementService.cleanupExpiredAnnouncements();

      expect(mockBatch.delete).not.toHaveBeenCalled();
    });
  });
});
