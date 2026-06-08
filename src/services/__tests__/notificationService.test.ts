import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchNotificationHistory, sendNotification, cleanupExpiredNotifications } from '../notificationService';
import { getDocs, writeBatch } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

// Mock Firebase
vi.mock('../../lib/firebase', () => ({
  db: {
    collection: vi.fn(),
    doc: vi.fn(),
  },
  app: {}
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
    deleteDoc: vi.fn(),
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

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(),
}));

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchNotificationHistory', () => {
    it('should fetch notifications and return list', async () => {
      const mockDocs = [
        { 
          id: 'n1', 
          data: () => ({ 
            title: 'Notif', 
            body: 'Text', 
            sentAt: { toDate: () => new Date() },
            type: 'announcement'
          }) 
        }
      ];
      
      vi.mocked(getDocs).mockResolvedValue({ docs: mockDocs } as never);

      const items = await fetchNotificationHistory();
      
      expect(getDocs).toHaveBeenCalled();
      expect(items.length).toBe(1);
    });
  });

  describe('sendNotification', () => {
    it('should call onSendNotification cloud function', async () => {
      const mockCallable = vi.fn().mockResolvedValue({ data: { success: true } });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

      const result = await sendNotification({
        title: 'Title',
        body: 'Body',
        targetAudience: 'batch',
        targetBatches: ['B1']
      });

      expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'onSendNotification');
      expect(result.success).toBe(true);
    });
  });

  describe('cleanupExpiredNotifications', () => {
    it('should delete notifications older than 8 days', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10);

      const mockDocs = [
        { id: 'old-notif', data: () => ({ sentAt: { toDate: () => oldDate } }) }
      ];

      const mockBatch = {
        delete: vi.fn(),
        commit: vi.fn(() => Promise.resolve())
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(writeBatch).mockReturnValue(mockBatch as any);
      vi.mocked(getDocs).mockResolvedValue({ docs: mockDocs, empty: false, size: 1 } as never);

      await cleanupExpiredNotifications();

      expect(mockBatch.delete).toHaveBeenCalled();
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });
});
