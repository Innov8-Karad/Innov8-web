import { 
  collection, 
  getDocs, 
  query, 
  where,
  type DocumentData,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../constants';
import type { ExamResult, User } from '../types';

export interface EnrichedExamResult extends ExamResult {
  examTitle: string;
  studentName: string;
  studentEmail: string;
  studentBatch: string;
}

export const examResultService = {
  // Fetch all results, enriched with Exam and User details
  async fetchAllResults(): Promise<EnrichedExamResult[]> {
    // 1. Fetch exam results
    const resultsSnap = await getDocs(collection(db, COLLECTIONS.EXAM_RESULTS));
    
    // 2. Fetch all exams for titles
    const examsSnap = await getDocs(collection(db, COLLECTIONS.EXAMS));
    const examMap = new Map<string, string>();
    examsSnap.docs.forEach(doc => {
      examMap.set(doc.id, doc.data().title || 'Unknown Exam');
    });

    // 3. Fetch all students for names and batches
    const usersSnap = await getDocs(query(collection(db, COLLECTIONS.USERS), where('role', '==', 'student')));
    const userMap = new Map<string, User>();
    usersSnap.docs.forEach(doc => {
      userMap.set(doc.id, { id: doc.id, ...doc.data() } as User);
    });

    return resultsSnap.docs.map(doc => {
      const data = doc.data() as DocumentData;
      const user = userMap.get(data.userId);
      return {
        id: doc.id,
        examId: data.examId,
        userId: data.userId,
        score: Number(data.score || 0),
        totalMarks: Number(data.totalMarks || 0),
        percentage: Number(data.percentage || 0),
        submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt.toDate() : new Date(data.submittedAt),
        answers: data.answers || [],
        timeTaken: Number(data.timeTaken || 0),
        examTitle: examMap.get(data.examId) || 'Unknown Exam',
        studentName: user?.name || 'Unknown Student',
        studentEmail: user?.email || 'N/A',
        studentBatch: user?.batch || 'Unassigned',
      } as EnrichedExamResult;
    }).sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  },

  async getResultsByExam(examId: string): Promise<EnrichedExamResult[]> {
    const all = await this.fetchAllResults();
    return all.filter(r => r.examId === examId);
  },

  async getResultsByStudent(userId: string): Promise<EnrichedExamResult[]> {
    const all = await this.fetchAllResults();
    return all.filter(r => r.userId === userId);
  },

  getScoreDistribution(results: EnrichedExamResult[]) {
    const defaultBins = [
      { range: '0-20%', count: 0 },
      { range: '21-40%', count: 0 },
      { range: '41-60%', count: 0 },
      { range: '61-80%', count: 0 },
      { range: '81-100%', count: 0 }
    ];

    if (!results || results.length === 0) return defaultBins;

    const bins = [...defaultBins];

    results.forEach(r => {
      const p = r.percentage;
      if (p <= 20) bins[0].count++;
      else if (p <= 40) bins[1].count++;
      else if (p <= 60) bins[2].count++;
      else if (p <= 80) bins[3].count++;
      else bins[4].count++;
    });

    return bins;
  },

  getPassFailBreakdown(results: EnrichedExamResult[], passThreshold: number = 35) {
    if (!results || results.length === 0) return { passed: 0, failed: 0, total: 0 };

    let passed = 0;
    let failed = 0;

    results.forEach(r => {
      if (r.percentage >= passThreshold) passed++;
      else failed++;
    });

    return { passed, failed, total: results.length };
  },

  exportResultsCSV(results: EnrichedExamResult[], filename: string = 'exam_results.csv') {
    if (!results || results.length === 0) return;

    const headers = ['Student Name', 'Email', 'Batch', 'Exam Title', 'Score', 'Total Marks', 'Percentage', 'Status', 'Time Taken (s)', 'Submitted At'];
    
    // We arbitrarily choose 35 as the export threshold if not provided, but ideally the UI filters before calling export, or passes the threshold.
    // For simplicity, we just export the raw data and let the user see percentage.
    
    const rows = results.map(r => [
      `"${r.studentName}"`,
      `"${r.studentEmail}"`,
      `"${r.studentBatch}"`,
      `"${r.examTitle}"`,
      r.score,
      r.totalMarks,
      `${r.percentage.toFixed(2)}%`,
      r.percentage >= 35 ? 'Passed' : 'Failed', // Default 35% for CSV status format
      r.timeTaken,
      `"${r.submittedAt.toLocaleString()}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
