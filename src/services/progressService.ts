import {
  collection,
  getDocs,
  doc,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../constants';
import type { StudentProgress, User } from '../types';
import { jsPDF } from 'jspdf';

export const progressService = {
  async fetchProgress(): Promise<StudentProgress[]> {
    const [progressSnap, usersSnap, batchesSnap] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.PROGRESS)),
      getDocs(collection(db, COLLECTIONS.USERS)),
      getDocs(collection(db, COLLECTIONS.BATCHES))
    ]);

    const progressMap = new Map<string, DocumentData>();
    progressSnap.docs.forEach(doc => {
      const p = doc.data();
      const docUserId = doc.id.split('_')[0];
      const key = p.userId || p.studentId || docUserId;
      progressMap.set(key, { ...p, id: doc.id });
    });

    const batchNameToIdMap = new Map<string, string>();
    const existingBatchNamesMap = new Map<string, string>();
    batchesSnap.docs.forEach(doc => {
      const b = doc.data();
      if (b.name) {
        const normalized = b.name.trim().toLowerCase();
        batchNameToIdMap.set(normalized, doc.id);
        existingBatchNamesMap.set(normalized, b.name.trim());
      }
    });

    return usersSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as User))
      .filter(user => user.role === 'student')
      .map(userData => {
        const progressData = progressMap.get(userData.id) || {};

        // Calculate Course Completion percentage from granular items
        const completedVideoIds = progressData.completedVideoIds || [];
        const completedNoteIds = progressData.completedNoteIds || [];
        const completedAssignmentIds = progressData.completedAssignmentIds || [];
        const totalItems = Number(progressData.totalItems || 0);
        const completedItems = Number(progressData.completedItems || (completedVideoIds.length + completedNoteIds.length + completedAssignmentIds.length));

        const completionPercentage = totalItems > 0
          ? Math.min(Math.round((completedItems / totalItems) * 100), 100)
          : 0;

        // Overall Integrated Progress is now just the Completion Percentage
        const overallIntegratedProgress = completionPercentage;

        // Last active timestamp
        let lastActive: Date | null = null;
        if (progressData.updatedAt) {
          if (progressData.updatedAt.toDate) {
            lastActive = progressData.updatedAt.toDate();
          } else if (progressData.updatedAt.seconds) {
            lastActive = new Date(progressData.updatedAt.seconds * 1000);
          } else if (progressData.updatedAt instanceof Date) {
            lastActive = progressData.updatedAt;
          }
        }

        let studentBatch = userData.batch || 'Unassigned';
        const normalizedStudentBatch = studentBatch.trim().toLowerCase();
        if (studentBatch !== 'Unassigned' && existingBatchNamesMap.has(normalizedStudentBatch)) {
          studentBatch = existingBatchNamesMap.get(normalizedStudentBatch)!;
        } else if (studentBatch !== 'Unassigned') {
          studentBatch = 'Unassigned';
        }

        return {
          id: progressData.id || `${userData.id}_${userData.course || 'default'}`,
          studentId: userData.id,
          studentName: userData.name || 'Unknown Student',
          email: userData.email || '',
          batch: studentBatch,

          overallScore: Number(progressData.overallScore || 0),
          completedVideoIds,
          completedNoteIds,
          completedAssignmentIds,
          totalItems,
          completedItems,
          updatedAt: lastActive || new Date(),
          profilePhoto: userData.profilePhoto || '',
          // Map fields for UI
          userId: userData.id,
          userName: userData.name || 'Unknown Student',
          overallProgress: overallIntegratedProgress,
          courseCompletionPercentage: completionPercentage,
          lastAccessed: lastActive || undefined,
        } as StudentProgress;
      });
  },

  async updateProgress(id: string, data: Partial<StudentProgress>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.PROGRESS, id);
    const [userId, courseId] = id.split('_');
    await setDoc(docRef, {
      ...data,
      userId: userId || id,
      studentId: userId || id,
      courseId: courseId || 'default',
      email: data.email || '',
      studentName: data.studentName || '',
      updatedAt: serverTimestamp()
    }, { merge: true });
  },

  async getBatchProgress() {
    const progress = await this.fetchProgress();
    const batches: Record<string, { totalScore: number; totalCompletion: number; count: number }> = {};

    progress.forEach(p => {
      const b = p.batch || 'Unassigned';
      if (b === 'Unassigned') {
        return;
      }
      if (!batches[b]) {
        batches[b] = { totalScore: 0, totalCompletion: 0, count: 0 };
      }
      batches[b].totalScore += p.overallScore ?? 0;
      batches[b].totalCompletion += p.overallProgress ?? 0;
      batches[b].count += 1;
    });

    return Object.entries(batches).map(([name, stats]) => ({
      name,
      avgScore: Math.round(stats.totalScore / stats.count),
      avgCompletion: Math.round(stats.totalCompletion / stats.count)
    }));
  },

  exportProgressReport(student: StudentProgress) {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(33, 150, 243); // Primary color
    doc.text('Student Progress Report', 105, 20, { align: 'center' });

    doc.setDrawColor(33, 150, 243);
    doc.line(20, 25, 190, 25);

    // Details
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);

    const startY = 40;
    const lineSpacing = 10;

    doc.setFont('helvetica', 'bold');
    doc.text(`Overall Score:`, 20, startY + lineSpacing * 2);
    doc.text(student.studentName || 'Unknown', 60, startY);
    doc.text(student.batch || 'N/A', 60, startY + lineSpacing);
    doc.text(`${student.overallScore ?? 0}`, 60, startY + lineSpacing * 2);

    // Additional Metrics
    doc.setFont('helvetica', 'bold');
    doc.text(`Course Completion:`, 20, startY + lineSpacing * 3);
    doc.text(`Integrated Progress:`, 20, startY + lineSpacing * 4);

    doc.setFont('helvetica', 'normal');
    doc.text(`${student.courseCompletionPercentage ?? 0}%`, 60, startY + lineSpacing * 3);
    doc.text(`${student.overallProgress ?? 0}%`, 60, startY + lineSpacing * 4);

    // Activity Summary
    doc.setFont('helvetica', 'bold');
    const activityY = startY + lineSpacing * 6;
    doc.text(`• Videos Watched: ${student.completedVideoIds?.length || 0}`, 25, activityY);
    doc.text(`• Tasks Completed: ${student.completedAssignmentIds?.length || 0}`, 25, activityY + 7);
    doc.text(`• Resources Read: ${student.completedNoteIds?.length || 0}`, 25, activityY + 14);

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${new Date().toLocaleDateString()} | Innov8 Learning Platform`, 105, pageHeight - 10, { align: 'center' });

    doc.save(`${(student.studentName || 'Student').replace(/\s+/g, '_')}_Progress.pdf`);
  }
};
