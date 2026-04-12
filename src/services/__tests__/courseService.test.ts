import { describe, it, expect, vi, beforeEach } from 'vitest';
import { courseService } from '../courseService';
import { db } from '../../lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';

vi.mock('../../lib/firebase', () => ({
  db: {
    collection: vi.fn(),
    doc: vi.fn(),
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

describe('courseService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createCourse', () => {
        it('should add a new course to Firestore', async () => {
            const mockCourse = {
                title: 'Test Course',
                description: 'Test Desc',
                price: 100,
                isFree: false,
                duration: '4 Weeks',
                instructor: 'Prof Test'
            };

            const mockDocRef = { id: 'course-123' };
            vi.mocked(addDoc).mockResolvedValue(mockDocRef as unknown as Awaited<ReturnType<typeof addDoc>>);

            const result = await courseService.createCourse(mockCourse);

            expect(collection).toHaveBeenCalledWith(db, 'courses');
            expect(addDoc).toHaveBeenCalled();
            expect(result.id).toBe('course-123');
        });
    });

    describe('updateCourse', () => {
        it('should update course document', async () => {
            const docRef = { id: 'course-123' };
            vi.mocked(doc).mockReturnValue(docRef as ReturnType<typeof doc>);
            vi.mocked(updateDoc).mockResolvedValue(undefined);

            await courseService.updateCourse('course-123', { price: 200 });

            expect(doc).toHaveBeenCalledWith(db, 'courses', 'course-123');
            expect(updateDoc).toHaveBeenCalledWith(docRef, expect.objectContaining({ price: 200 }));
        });
    });

    describe('deleteCourse', () => {
        it('should delete course document', async () => {
            const docRef = { id: 'course-to-delete' };
            vi.mocked(doc).mockReturnValue(docRef as ReturnType<typeof doc>);
            vi.mocked(deleteDoc).mockResolvedValue(undefined);

            await courseService.deleteCourse('course-to-delete');

            expect(doc).toHaveBeenCalledWith(db, 'courses', 'course-to-delete');
            expect(deleteDoc).toHaveBeenCalledWith(docRef);
        });
    });
});
