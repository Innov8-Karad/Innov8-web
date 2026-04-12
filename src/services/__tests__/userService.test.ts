import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService } from '../userService';
import { db } from '../../lib/firebase';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';

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

vi.mock('firebase/firestore', () => {
    return {
        collection: vi.fn(),
        addDoc: vi.fn(),
        getDocs: vi.fn(),
        doc: vi.fn(),
        deleteDoc: vi.fn(),
        updateDoc: vi.fn(),
        query: vi.fn(),
        orderBy: vi.fn(),
        where: vi.fn(),
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

      const mockDocRef = { id: 'new-user-123' };
      vi.mocked(addDoc).mockResolvedValue(mockDocRef as unknown as Awaited<ReturnType<typeof addDoc>>);

      const result = await userService.createUser(mockUser);

      expect(collection).toHaveBeenCalledWith(db, 'users');
      expect(addDoc).toHaveBeenCalled();
      expect(result.id).toBe('new-user-123');
      expect(result.name).toBe('Test Student');
    });

    it('should throw an error if addDoc fails', async () => {
        vi.mocked(addDoc).mockRejectedValue(new Error('Firestore error'));

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
        const docRef = { id: 'user-to-update' };
        vi.mocked(doc).mockReturnValue(docRef as ReturnType<typeof doc>);
        vi.mocked(updateDoc).mockResolvedValue(undefined);

        await userService.updateUser('user-to-update', { name: 'Updated Name' });

        expect(doc).toHaveBeenCalledWith(db, 'users', 'user-to-update');
        expect(updateDoc).toHaveBeenCalledWith(docRef, expect.objectContaining({ name: 'Updated Name' }));
    });
  });

    describe('deleteUser', () => {
        it('should delete a user document by ID', async () => {
            const docRef = { id: 'user-to-delete' };
            vi.mocked(doc).mockReturnValue(docRef as ReturnType<typeof doc>);
            vi.mocked(deleteDoc).mockResolvedValue(undefined);

            await userService.deleteUser('user-to-delete');

            expect(doc).toHaveBeenCalledWith(db, 'users', 'user-to-delete');
            expect(deleteDoc).toHaveBeenCalledWith(docRef);
        });
    });
});
