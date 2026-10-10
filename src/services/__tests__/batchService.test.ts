import { describe, it, expect, vi, beforeEach } from 'vitest';
import { batchService } from '../batchService';
import { db } from '../../lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';

vi.mock('../../lib/firebase', () => ({
  db: {
    collection: vi.fn(),
    doc: vi.fn(),
  },
  auth: {
    currentUser: null,
  }
}));

vi.mock('../../lib/cloudinary', () => ({
  deleteFromCloudinary: vi.fn(),
}));

vi.mock('firebase/firestore', () => {
    return {
        collection: vi.fn(),
        addDoc: vi.fn(),
        getDocs: vi.fn(),
        getDoc: vi.fn(),
        doc: vi.fn(),
        deleteDoc: vi.fn(),
        updateDoc: vi.fn(),
        query: vi.fn(),
        orderBy: vi.fn(),
        where: vi.fn(),
        runTransaction: vi.fn(),
        writeBatch: vi.fn(),
        arrayUnion: vi.fn(),
        arrayRemove: vi.fn(),
        Timestamp: {
            now: vi.fn(() => ({ toDate: () => new Date('2026-04-12T10:00:00Z') }))
        }
    };
});

describe('batchService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('updateResource', () => {
        it('should strip undefined and empty string fields before calling updateDoc', async () => {
            const mockDocRef = { id: 'resource-456' };
            vi.mocked(doc).mockReturnValue(mockDocRef as unknown as ReturnType<typeof doc>);
            vi.mocked(updateDoc).mockResolvedValue(undefined);

            const dirtyData = {
                title: 'New Video Title',
                url: 'https://youtu.be/example',
                type: 'video' as const,
                platform: 'youtube' as const,
                duration: undefined,
                thumbnailUrl: undefined,
                emptyField: '',
            };

            await batchService.updateResource('batch-123', 'resource-456', dirtyData);

            expect(doc).toHaveBeenCalledWith(db, 'batches', 'batch-123', 'resources', 'resource-456');
            expect(updateDoc).toHaveBeenCalledWith(
                mockDocRef,
                expect.not.objectContaining({ duration: undefined, thumbnailUrl: undefined })
            );
            expect(updateDoc).toHaveBeenCalledWith(
                mockDocRef,
                expect.objectContaining({
                    title: 'New Video Title',
                    url: 'https://youtu.be/example',
                    type: 'video',
                    platform: 'youtube'
                })
            );
        });
    });

    describe('updateBatch', () => {
        it('should clean undefined fields when updating a batch', async () => {
            const mockDocRef = { id: 'batch-123' };
            vi.mocked(doc).mockReturnValue(mockDocRef as unknown as ReturnType<typeof doc>);
            vi.mocked(updateDoc).mockResolvedValue(undefined);

            await batchService.updateBatch('batch-123', {
                name: 'Batch Alpha',
                description: undefined
            });

            expect(updateDoc).toHaveBeenCalledWith(
                mockDocRef,
                expect.not.objectContaining({ description: undefined })
            );
            expect(updateDoc).toHaveBeenCalledWith(
                mockDocRef,
                expect.objectContaining({ name: 'Batch Alpha' })
            );
        });
    });
});
