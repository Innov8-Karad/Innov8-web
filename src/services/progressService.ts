import { 
  collection, 
  getDocs, 
  doc, 
  serverTimestamp,
  setDoc,
  type DocumentData 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../constants';
import type { StudentProgress, User } from '../types';
import { jsPDF } from 'jspdf';

export const progressService = {
  async fetchProgress(): Promise<StudentProgress[]> {
    const [progressSnap, usersSnap] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.PROGRESS)),
      getDocs(collection(db, COLLECTIONS.USERS))
    ]);

    const progressMap = new Map<string, DocumentData>();
    progressSnap.docs.forEach(doc => {
      const p = doc.data();
      const docUserId = doc.id.split('_')[0];
      const key = p.userId || p.studentId || docUserId;
      progressMap.set(key, { ...p, id: doc.id });
    });


    return usersSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as User))
      .filter(user => user.role === 'student')
      .map(userData => {
        const progressData = progressMap.get(userData.id) || {};
        
        return {
          id: progressData.id || `${userData.id}_${userData.course || 'default'}`,
          studentId: userData.id,
          studentName: userData.name || 'Unknown Student',
          email: userData.email || '',
          batch: userData.batch || 'Unassigned',
          attendancePercentage: Number(progressData.attendancePercentage || progressData.attendance || 0),
          overallScore: Number(progressData.overallScore || 0),
          currentModule: progressData.currentModule || 'None',
          completedModules: progressData.completedModules || [],
          updatedAt: progressData.updatedAt?.toDate() || new Date(),
          profilePhoto: userData.profilePhoto || '',
          // Map legacy fields for backward compatibility
          userId: userData.id,
          userName: userData.name || 'Unknown Student'
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
    const batches: Record<string, { totalScore: number; totalAttendance: number; totalModules: number; count: number }> = {};

    progress.forEach(p => {
      const b = p.batch;
      if (!batches[b]) {
        batches[b] = { totalScore: 0, totalAttendance: 0, totalModules: 0, count: 0 };
      }
      batches[b].totalScore += p.overallScore;
      batches[b].totalAttendance += p.attendancePercentage;
      batches[b].totalModules += p.completedModules.length;
      batches[b].count += 1;
    });

    return Object.entries(batches).map(([name, stats]) => ({
      name,
      avgScore: Math.round(stats.totalScore / stats.count),
      avgAttendance: Math.round(stats.totalAttendance / stats.count),
      avgCompletion: Math.round(stats.totalModules / stats.count)
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
    doc.text(`Student Name:`, 20, startY);
    doc.text(`Batch:`, 20, startY + lineSpacing);
    doc.text(`Attendance:`, 20, startY + lineSpacing * 2);
    doc.text(`Overall Score:`, 20, startY + lineSpacing * 3);
    doc.text(`Current Module:`, 20, startY + lineSpacing * 4);
    
    doc.setFont('helvetica', 'normal');
    doc.text(student.studentName, 60, startY);
    doc.text(student.batch, 60, startY + lineSpacing);
    doc.text(`${student.attendancePercentage}%`, 60, startY + lineSpacing * 2);
    doc.text(`${student.overallScore}`, 60, startY + lineSpacing * 3);
    doc.text(student.currentModule, 60, startY + lineSpacing * 4);
    
    // Completed Modules
    doc.setFont('helvetica', 'bold');
    doc.text(`Completed Modules:`, 20, startY + lineSpacing * 6);
    doc.setFont('helvetica', 'normal');
    
    const moduleY = startY + lineSpacing * 7;
    if (student.completedModules.length > 0) {
      student.completedModules.forEach((m, index) => {
        doc.text(`• ${m}`, 25, moduleY + (index * 7));
      });
    } else {
      doc.text('None', 25, moduleY);
    }
    
    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${new Date().toLocaleDateString()} | Innov8 Learning Platform`, 105, pageHeight - 10, { align: 'center' });
    
    doc.save(`${student.studentName.replace(/\s+/g, '_')}_Progress.pdf`);
  }
};
