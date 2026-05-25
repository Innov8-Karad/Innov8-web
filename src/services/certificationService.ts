import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  doc,
  updateDoc,
  deleteDoc,
  addDoc, 
  setDoc,
  Timestamp,
  serverTimestamp,
  type DocumentData 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../constants';
import type { CertificationExam, CertificationResult, Certificate } from '../types';

export const certificationService = {
  async fetchCertExams(): Promise<CertificationExam[]> {
    const q = query(
      collection(db, COLLECTIONS.CERTIFICATION_EXAMS), 
      orderBy("scheduledDate", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => {
      const data = doc.data() as DocumentData;
      return {
        id: doc.id,
        ...data,
        scheduledDate: data.scheduledDate?.toDate(),
        endDate: data.endDate?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      } as unknown as CertificationExam;
    });
  },

  async createCertExam(data: Omit<CertificationExam, 'id' | 'createdAt'>): Promise<CertificationExam> {
    const docData: DocumentData = {
      ...data,
      duration: Number(data.duration),
      totalMarks: Number(data.totalMarks),
      passingPercentage: Number(data.passingPercentage),
      minVideoCompletionPercentage: Number(data.minVideoCompletionPercentage),
      maxAttempts: Number(data.maxAttempts),
      scheduledDate: Timestamp.fromDate(new Date(data.scheduledDate as unknown as string)),
      endDate: data.endDate ? Timestamp.fromDate(new Date(data.endDate as unknown as string)) : null,
      createdAt: serverTimestamp(),
      isActive: data.isActive ?? true
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.CERTIFICATION_EXAMS), docData);
    
    return {
      id: docRef.id,
      ...data,
      duration: Number(data.duration),
      totalMarks: Number(data.totalMarks),
      passingPercentage: Number(data.passingPercentage),
      minVideoCompletionPercentage: Number(data.minVideoCompletionPercentage),
      maxAttempts: Number(data.maxAttempts),
      scheduledDate: new Date(data.scheduledDate as unknown as string),
      endDate: data.endDate ? new Date(data.endDate as unknown as string) : undefined,
      createdAt: new Date()
    } as unknown as CertificationExam;
  },

  async updateCertExam(id: string, data: Partial<CertificationExam>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.CERTIFICATION_EXAMS, id);
    const updateData: Record<string, unknown> = { ...data };
    
    if (data.scheduledDate) {
      updateData.scheduledDate = Timestamp.fromDate(new Date(data.scheduledDate as unknown as string));
    }
    if (data.endDate) {
      updateData.endDate = Timestamp.fromDate(new Date(data.endDate as unknown as string));
    }
    
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
  },

  async deleteCertExam(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.CERTIFICATION_EXAMS, id);
    await deleteDoc(docRef);
  },

  async fetchAllCertResults(): Promise<CertificationResult[]> {
    const q = query(
      collection(db, COLLECTIONS.CERTIFICATION_RESULTS),
      orderBy("submittedAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        submittedAt: data.submittedAt?.toDate()
      } as unknown as CertificationResult;
    });
  },

  async fetchCertificates(): Promise<Certificate[]> {
    const q = query(
      collection(db, COLLECTIONS.CERTIFICATES),
      orderBy("issuedAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        issuedAt: data.issuedAt?.toDate()
      } as unknown as Certificate;
    });
  },

  async issueCertificate(data: Omit<Certificate, 'id' | 'issuedAt' | 'certificateNumber'>): Promise<Certificate> {
    // Generate certificate number: INNOV8-CR-YYYY-XXXXX
    const year = new Date().getFullYear();
    const countQuery = query(collection(db, COLLECTIONS.CERTIFICATES));
    const countSnap = await getDocs(countQuery);
    const nextNumber = String(countSnap.size + 1).padStart(5, '0');
    const certificateNumber = `INNOV8-CR-${year}-${nextNumber}`;

    const certId = `${data.userId}_${data.courseId}`;
    const certRef = doc(db, COLLECTIONS.CERTIFICATES, certId);
    
    // Map cross-platform fields to ensure consistency between Web & Mobile
    const userNameVal = data.userName || data.studentFullName || 'Student';
    const courseTitleVal = data.courseTitle || data.courseName || 'Course';
    const examIdVal = data.examId || data.certExamId || 'manual';
    const scoreVal = data.score ?? data.examScore ?? 100;
    
    const nameParts = userNameVal.trim().split(/\s+/);
    const firstName = data.firstName || nameParts[0] || '';
    let middleName = data.middleName || '';
    let surname = data.surname || '';
    
    if (nameParts.length > 2) {
      middleName = nameParts[1];
      surname = nameParts.slice(2).join(' ');
    } else if (nameParts.length === 2) {
      surname = nameParts[1];
    }

    const docData = {
      ...data,
      // Unified mobile fields
      studentFullName: userNameVal,
      courseName: courseTitleVal,
      certExamId: examIdVal,
      examScore: scoreVal,
      examPercentage: scoreVal,
      firstName,
      middleName,
      surname,
      // Legacy/Web fallback fields
      userName: userNameVal,
      courseTitle: courseTitleVal,
      examId: examIdVal,
      score: scoreVal,
      certificateNumber,
      issuedAt: serverTimestamp()
    };

    await setDoc(certRef, docData);

    return {
      id: certId,
      ...docData,
      issuedAt: new Date()
    } as unknown as Certificate;
  }
};
