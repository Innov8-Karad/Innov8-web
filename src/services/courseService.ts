import { 
  collection, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  arrayUnion,
  Timestamp,
  type DocumentData 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../constants';
import type { Course, CourseModule, CourseResource } from '../types';

export const courseService = {
  subscribeToCourses(callback: (courses: Course[]) => void) {
    const q = query(collection(db, COLLECTIONS.COURSES), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const courses = snapshot.docs.map(document => ({ id: document.id, ...document.data() } as Course));
      callback(courses);
    }, (error) => {
      console.error("Error subscribing to courses:", error);
      callback([]);
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
        Object.entries(data).filter(([_, v]) => v !== undefined)
    );
    
    await updateDoc(docRef, { ...cleanedData, updatedAt: Timestamp.now() });
  },

  async deleteCourse(courseId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.COURSES, courseId);
    // Ideally, modules subcollection should be deleted via Cloud Function
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
      callback([]); // Trigger callback to remove loading state
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

  async addResource(courseId: string, moduleId: string, resource: Omit<CourseResource, 'id'>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.COURSES, courseId, 'modules', moduleId);
    const newResource: CourseResource = { ...resource, id: crypto.randomUUID() };
    await updateDoc(docRef, {
      resources: arrayUnion(newResource)
    });
  },

  async updateResource(courseId: string, moduleId: string, resourceId: string, data: Partial<CourseResource>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.COURSES, courseId, 'modules', moduleId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    
    const module = snap.data() as CourseModule;
    const resources = module.resources || [];
    const updatedResources = resources.map(res => res.id === resourceId ? { ...res, ...data } : res);
    
    await updateDoc(docRef, { resources: updatedResources });
  },

  async deleteResource(courseId: string, moduleId: string, resourceId: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.COURSES, courseId, 'modules', moduleId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    
    const module = snap.data() as CourseModule;
    const resources = module.resources || [];
    const updatedResources = resources.filter(res => res.id !== resourceId);
    
    await updateDoc(docRef, { resources: updatedResources });
  }
};

