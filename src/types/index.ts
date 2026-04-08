// =============================================================================
// @innov8/types — Unified Type Definitions (Shared between Web & Mobile)
// =============================================================================
// This file is the SINGLE SOURCE OF TRUTH for all Firestore-backed interfaces.
// Both Innov8-web and Innov8-mobile must keep this file identical.
// Platform-specific display types belong in types/mobile.ts or types/admin.ts.
// =============================================================================

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
    createdAt?: { seconds: number; nanoseconds: number };
    updatedAt?: { seconds: number; nanoseconds: number };
}

export interface CourseResource {
    id: string;
    moduleId?: string;
    title?: string;
    url: string;
    type: 'video' | 'pdf' | 'link';
    // ── Video-specific metadata (populated when type === 'video') ──
    platform?: 'youtube' | 'vimeo' | 'cloudinary' | 'direct';
    duration?: string;          // e.g. "12:34"
    thumbnailUrl?: string;      // auto-generated or user-provided
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

export interface AssignmentSubmission {
    id: string;
    assignmentId: string;
    courseId: string;
    userId: string;
    userName: string;
    userEmail: string;
    fileUrl: string;            // Cloudinary URL
    cloudinaryPublicId: string; // For deletion
    fileName: string;
    fileType: 'image' | 'pdf';
    submittedAt: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    grade?: number;             // Admin assigns
    feedback?: string;          // Admin comment
    gradedAt?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    gradedBy?: string;
    status: 'submitted' | 'graded' | 'returned';
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
    collegeName?: string;
    year: number;
    createdAt?: { seconds: number; nanoseconds: number };
    updatedAt?: { seconds: number; nanoseconds: number };
}

export interface PlacementStats {
    id: string;
    year: number;
    companiesCount: number;
    studentsPlaced: number;
    averagePackage: number;
    highestPackage: number;
    updatedAt?: { seconds: number; nanoseconds: number };
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

// ─── Jobs ────────────────────────────────────────────────────────────────────

export type JobType = 'Full-time' | 'Internship';

export type ApplicationStatus = 'Applied' | 'Under Review' | 'Interviewed' | 'Selected' | 'Rejected';

export interface Job {
    id: string;
    companyName: string;
    role: string;
    location: string;
    salary: string;
    requirements: string[];
    jobType: JobType;
    description?: string;
    eligibleBatches?: string[];
    applyLink?: string;
    postedDate: Date;
    deadline?: Date;
    isActive: boolean;
    createdAt?: { seconds: number; nanoseconds: number };
    updatedAt?: { seconds: number; nanoseconds: number };
}

export interface JobApplication {
    id: string;
    jobId: string;
    userId: string;
    userName: string;
    userEmail: string;
    userBatch: string;
    status: ApplicationStatus;
    appliedAt: Date;
    updatedAt?: Date;
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
    updatedAt?: { seconds: number; nanoseconds: number } | Date;
    userId?: string; // Maintain backward compatibility if needed
    courseId?: string;
    userName?: string;
    attendance?: number;
    profilePhoto?: string;
}

// ─── Attendance ──────────────────────────────────────────────────────────────

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
    id: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    courseId: string;
    courseName: string;
    batchId: string;
    date: Date;
    status: AttendanceStatus;
    markedBy: string;
    markedAt: Date;
    notes?: string;
}
