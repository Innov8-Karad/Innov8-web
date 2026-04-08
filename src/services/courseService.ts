import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  type DocumentData 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../constants';
import type { Course, CourseModule, CourseResource, AssignmentType, AssignmentSubmission } from '../types';

export const courseService = {
  subscribeToCourses(callback: (courses: Course[]) => void) {
    // Removed orderBy('createdAt') to avoid potential index-missing errors during development
    const q = query(collection(db, COLLECTIONS.COURSES));
    return onSnapshot(q, (snapshot) => {
      const courses = snapshot.docs.map(document => ({ id: document.id, ...document.data() } as Course));
      // Manual sorting if needed
      const sorted = [...courses].sort((a: Course, b: Course) => 
        (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
      );
      callback(sorted);
    }, (error) => {
      console.error("Error subscribing to courses:", error);
      callback([]); // Ensure loader is cleared even on error
    });
  },

  async fetchCourses(): Promise<Course[]> {
    const snap = await getDocs(collection(db, COLLECTIONS.COURSES));
    return snap.docs.map(document => ({ id: document.id, ...document.data() } as Course));
  },

  async createCourse(data: Omit<Course, 'id' | 'createdAt' | 'rating' | 'enrolled'>): Promise<Course> {
    const docData: DocumentData = {
      ...data,
      price: data.isFree ? 0 : Number(data.price),
      rating: 0,
      enrolled: 0,
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.COURSES), docData);
    
    return {
      id: docRef.id,
      ...docData,
      createdAt: new Date()
    } as unknown as Course;
  },

  async updateCourse(courseId: string, data: Partial<Course>): Promise<void> {
    if (!courseId) throw new Error("Invalid courseId passed to updateCourse");
    const docRef = doc(db, COLLECTIONS.COURSES, courseId);
    
    // Clean undefined values
    const cleanedData = Object.fromEntries(
        Object.entries(data).filter((entry) => entry[1] !== undefined)
    );
    
    await updateDoc(docRef, { ...cleanedData, updatedAt: Timestamp.now() });
  },

  async deleteCourse(courseId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.COURSES, courseId);
    await deleteDoc(docRef);
  },

  // ── Curriculum Builder (Modules) ──

  subscribeToModules(courseId: string, callback: (modules: CourseModule[]) => void) {
    const q = query(
      collection(db, COLLECTIONS.COURSES, courseId, 'modules'),
      orderBy('order', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      const modules = snapshot.docs.map(document => ({ id: document.id, ...document.data() } as CourseModule));
      callback(modules);
    }, (error) => {
      console.error("Error subscribing to modules:", error);
      callback([]);
    });
  },

  async addModule(courseId: string, module: Omit<CourseModule, 'id'>): Promise<CourseModule> {
    const docRef = await addDoc(collection(db, COLLECTIONS.COURSES, courseId, 'modules'), {
      ...module,
      resources: module.resources || [],
      createdAt: Timestamp.now()
    });
    return { id: docRef.id, ...module };
  },

  async updateModule(courseId: string, moduleId: string, data: Partial<CourseModule>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.COURSES, courseId, 'modules', moduleId);
    await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
  },

  async deleteModule(courseId: string, moduleId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.COURSES, courseId, 'modules', moduleId);
    await deleteDoc(docRef);
  },

  // ── Module Resources ──

  subscribeToResources(courseId: string, callback: (resources: CourseResource[]) => void) {
    const q = query(collection(db, COLLECTIONS.COURSES, courseId, 'resources'));
    return onSnapshot(q, (snapshot) => {
      const resources = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CourseResource));
      callback(resources);
    }, (error) => {
      console.error("Error subscribing to resources:", error);
      callback([]);
    });
  },

  async addResource(courseId: string, moduleId: string, resource: Omit<CourseResource, 'id'>): Promise<void> {
    // Clean undefined values — Firestore rejects them
    const cleanedResource = Object.fromEntries(
      Object.entries(resource).filter((entry) => entry[1] !== undefined && entry[1] !== '')
    );
    await addDoc(collection(db, COLLECTIONS.COURSES, courseId, 'resources'), {
      ...cleanedResource,
      moduleId,
      createdAt: Timestamp.now()
    });
  },

  async updateResource(courseId: string, resourceId: string, data: Partial<CourseResource>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.COURSES, courseId, 'resources', resourceId);
    await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
  },

  async deleteResource(courseId: string, resourceId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.COURSES, courseId, 'resources', resourceId);
    await deleteDoc(docRef);
  },

  // ── Assignments ──

  subscribeToAssignments(courseId: string, callback: (assignments: AssignmentType[]) => void) {
    const q = query(collection(db, COLLECTIONS.COURSES, courseId, 'assignments'));
    return onSnapshot(q, (snapshot) => {
      const assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssignmentType));
      callback(assignments);
    }, (error) => {
      console.error("Error subscribing to assignments:", error);
      callback([]);
    });
  },

  async addAssignment(courseId: string, assignment: Omit<AssignmentType, 'id'>): Promise<void> {
    await addDoc(collection(db, COLLECTIONS.COURSES, courseId, 'assignments'), {
      ...assignment,
      createdAt: Timestamp.now()
    });
  },

  async updateAssignment(courseId: string, assignmentId: string, data: Partial<AssignmentType>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.COURSES, courseId, 'assignments', assignmentId);
    await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
  },

  async deleteAssignment(courseId: string, assignmentId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.COURSES, courseId, 'assignments', assignmentId);
    await deleteDoc(docRef);
  },

  // ── Assignment Submissions ──

  subscribeToSubmissions(courseId: string, assignmentId: string, callback: (submissions: AssignmentSubmission[]) => void) {
    const q = query(
      collection(db, COLLECTIONS.COURSES, courseId, 'assignments', assignmentId, 'submissions'),
      orderBy('submittedAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AssignmentSubmission));
      callback(submissions);
    }, (error) => {
      console.error("Error subscribing to submissions:", error);
      callback([]);
    });
  },

  async updateSubmissionGrade(courseId: string, assignmentId: string, submissionId: string, data: Partial<AssignmentSubmission>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.COURSES, courseId, 'assignments', assignmentId, 'submissions', submissionId);
    await updateDoc(docRef, { 
      ...data, 
      status: 'graded', 
      gradedAt: Timestamp.now() 
    });
  }
};
