// =============================================================================
// @innov8/types — Unified Type Definitions (Shared between Web & Mobile)
// =============================================================================
// This file is the SINGLE SOURCE OF TRUTH for all Firestore-backed interfaces.
// Both Innov8-web and Innov8-mobile must keep this file identical.
// Platform-specific display types belong in types/mobile.ts or types/admin.ts.
// =============================================================================

// ─── Shared ──────────────────────────────────────────────────────────────────
export interface FirestoreTimestamp {
    seconds: number;
    nanoseconds: number;
    toDate?: () => Date;
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
    id: string;
    email: string;
    name: string;
    phone: string;
    batch: string;
    course: string;
    enrollmentDate: Date;
    profilePhoto?: string;
    skills: string[];
    resume?: string;
    role?: 'student' | 'admin';
    status?: 'active' | 'inactive';
    isBlocked?: boolean;
    createdAt: Date;
    updatedAt?: Date;
}

// ─── Fees ────────────────────────────────────────────────────────────────────

export type FeeStatus = 'paid' | 'pending' | 'overdue';

export interface Fee {
    id: string;
    userId: string;
    studentName: string;
    email: string;
    course: string;
    description: string;
    amount: number;
    dueDate: Date;
    paidDate?: Date;
    status: FeeStatus;
    createdAt: Date;
    method?: 'Cash' | 'Card' | 'Online';
    receiptUrl?: string;
    studentId?: string; // legacy alias
}

// ─── Exams ───────────────────────────────────────────────────────────────────

export interface Question {
    id?: string;
    questionText: string;
    options: string[];
    correctAnswerIndex: number;
    explanation?: string;
}

export interface Exam {
    id: string;
    title: string;
    description: string;
    duration: number;
    totalMarks: number;
    scheduledDate: Date;
    category: string;
    difficulty: 'easy' | 'medium' | 'hard';
    questions: Question[];
}

export interface ExamResult {
    id: string;
    examId: string;
    userId: string;
    score: number;
    totalMarks: number;
    percentage: number;
    submittedAt: Date;
    answers: Record<string, unknown>[];
    timeTaken: number;
}

// ─── Courses ─────────────────────────────────────────────────────────────────

export interface Course {
    id: string;
    title: string;
    description: string;
    price: number;
    isFree: boolean;
    duration: string;
    instructor: string;
    thumbnail?: string;
    rating?: number;
    enrolled?: number;
    category?: string;
    professor?: string;
    badge?: string;
    icon?: string;
    iconColor?: string;
    iconBg?: string;
    createdAt?: FirestoreTimestamp;
    updatedAt?: FirestoreTimestamp;
}

export interface CourseResource {
    id: string;
    moduleId?: string;
    title?: string;
    url: string;
    type: 'video' | 'pdf' | 'link';
}

export interface CourseModule {
    id: string;
    title: string;
    description: string;
    order: number;
    resources: CourseResource[];
}

export interface ModuleType {
    id: string;
    title: string;
    progress: number;
    completed: boolean;
}

export interface NoteType {
    id: string;
    title: string;
    size: string;
    type: 'PDF' | 'DOC' | 'MD';
}

export interface AssignmentType {
    id: string;
    title: string;
    dueDate: string;
    status: 'Pending' | 'Submitted' | 'Graded';
    score?: string;
}

// ─── Announcements ───────────────────────────────────────────────────────────

export interface Announcement {
    id: string;
    title: string;
    content: string;
    targetAudience?: 'all' | 'batch' | 'students';
    targetBatches: string[];
    targetStudentIds?: string[];
    createdAt: Date;
    priority: 'low' | 'medium' | 'high';
    author: string;
}

// ─── Placements ──────────────────────────────────────────────────────────────

export interface SuccessStory {
    id: string;
    studentName: string;
    studentPhoto?: string;
    company: string;
    package: string | number;
    role: string;
    batch?: string;
    testimonial?: string;
    year: number;
    createdAt?: FirestoreTimestamp;
    updatedAt?: FirestoreTimestamp;
}

export interface PlacementStats {
    id: string;
    year: number;
    companiesCount: number;
    studentsPlaced: number;
    averagePackage: number;
    highestPackage: number;
    updatedAt?: FirestoreTimestamp;
}

export interface Placement {
    id: string;
    year: number;
    studentsPlaced: number;
    totalStudents: number;
    topCompanies: string[];
    averagePackage: number;
    highestPackage: number;
    companiesCount?: number;
    totalPlaced?: number;
    successStories: SuccessStory[];
}

export interface Job {
    id: string;
    companyName: string;
    companyLogo?: string;
    role: string;
    location: string;
    salary: string; 
    requirements: string[]; 
    jobType: 'Full-time' | 'Internship';
    eligibleBatches: string[];
    description: string;
    postedAt: FirestoreTimestamp; // Firestore Timestamp
    category?: string;
    link?: string;
}

export interface JobApplication {
    id?: string;
    userId: string;
    jobId: string;
    appliedAt: FirestoreTimestamp; // Firestore Timestamp
    status: 'pending' | 'under_review' | 'interviewed' | 'selected' | 'rejected';
    studentName?: string;
    studentEmail?: string;
    studentPhoto?: string;
    companyName?: string;
    role?: string;
}

export interface PlacementOpportunity {
    id: string;
    company: string;
    role: string;
    location: string;
    salary: string;
    package?: string;
    status: 'APPLIED' | 'NOT APPLIED';
    hrInterest: boolean;
    date?: Date | string;
    postedDate?: Date | string;
    eligibleBatches?: string[];
    description?: string;
}

// ─── Progress ────────────────────────────────────────────────────────────────

export interface StudentProgress {
    id: string;
    studentId: string;
    studentName: string;
    email?: string;
    batch: string;
    attendancePercentage: number;
    overallScore: number;
    currentModule: string;
    completedModules: string[];
    updatedAt?: FirestoreTimestamp | Date;
    userId?: string; // Maintain backward compatibility if needed
    courseId?: string;
    userName?: string;
    attendance?: number;
    profilePhoto?: string;
}
