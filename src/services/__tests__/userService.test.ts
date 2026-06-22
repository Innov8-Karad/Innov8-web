import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from '../userService';
import { db } from '../../lib/firebase';
import { collection, doc, runTransaction } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

// Mock Firebase
vi.mock('../../lib/firebase', () => ({
  db: {
    collection: vi.fn(),
    doc: vi.fn(),
  },
  auth: {
    currentUser: { uid: 'admin-123' }
  }
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(),
}));

vi.mock('firebase/firestore', () => {
    const mockCollection = vi.fn((_dbInstance, path) => ({ _isCollection: true, path }));
    const mockDoc = vi.fn((collOrDb, collectionName, docId) => {
        if (collOrDb && collOrDb._isCollection) {
            return { id: 'new-user-123', path: `${collOrDb.path}/new-user-123` };
        }
        return { id: docId || 'mock-doc-id', path: `${collectionName}/${docId}` };
    });

    const mockTransaction = {
        get: vi.fn(async () => ({
            exists: () => true,
            data: () => ({ studentCount: 5 })
        })),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
    };

    return {
        collection: mockCollection,
        doc: mockDoc,
        getDoc: vi.fn(async () => ({
            exists: () => true,
            data: () => ({ email: 'test@student.com' })
        })),
        addDoc: vi.fn(),
        getDocs: vi.fn(),
        deleteDoc: vi.fn(),
        updateDoc: vi.fn(),
        query: vi.fn(),
        orderBy: vi.fn(),
        where: vi.fn(),
        increment: vi.fn((n) => n),
        runTransaction: vi.fn(async (_dbInstance, updateFunction) => {
            return await updateFunction(mockTransaction);
        }),
        Timestamp: {
            now: vi.fn(() => ({ toDate: () => new Date('2026-04-12T10:00:00Z') }))
        }
    }
});

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createUser', () => {
    it('should add a new user document to Firestore', async () => {
      const mockUser = {
        name: 'Test Student',
        email: 'test@student.com',
        phone: '9876543210',
        batch: 'B1',
        course: 'CS101',
        skills: []
      };

      const result = await userService.createUser(mockUser);

      expect(collection).toHaveBeenCalledWith(db, 'users');
      expect(result.id).toBe('new-user-123');
      expect(result.name).toBe('Test Student');
    });

    it('should throw an error if transaction fails', async () => {
        vi.mocked(runTransaction).mockRejectedValueOnce(new Error('Firestore error'));

        await expect(userService.createUser({
            name: 'Fail Auth',
            email: 'fail@test.com',
            phone: '1234567890',
            batch: 'B2',
            course: 'IT102',
            skills: []
        })).rejects.toThrow('Firestore error');
    });
  });

  describe('updateUser', () => {
    it('should update an existing user document', async () => {
        await userService.updateUser('user-to-update', { name: 'Updated Name' });

        expect(doc).toHaveBeenCalledWith(db, 'users', 'user-to-update');
        expect(runTransaction).toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
        it('should call the deleteStudent cloud function', async () => {
            const mockCallable = vi.fn().mockResolvedValue({ data: { success: true } });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            vi.mocked(httpsCallable).mockReturnValue(mockCallable as any);

            await userService.deleteUser('user-to-delete');

            expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'deleteStudent');
            expect(mockCallable).toHaveBeenCalledWith({ studentId: 'user-to-delete' });
        });
  });
});
