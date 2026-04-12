// =============================================================================
// @innov8/types — Unified Type Definitions (Shared between Web & Mobile)
// =============================================================================
// This file is the SINGLE SOURCE OF TRUTH for all Firestore-backed interfaces.
// Both Innov8-web and Innov8-mobile must keep this file identical.
// Platform-specific display types belong in types/mobile.ts or types/admin.ts.
// =============================================================================
//
// ─── CHANGELOG ───────────────────────────────────────────────────────────────
// 2026-04-11 | feature/Shared-Type-System-Sync/101
//   • Synchronized types/index.ts across Innov8-web and Innov8-mobile
//   • FeeStatus: added 'partial' to mobile (was web-only)
//   • Fee: merged web fields (studentName, email, course, createdAt,
//     totalPaid, studentId) and mobile fields (Card/Online methods) into one
//     unified interface; all platform-specific fields made optional;
//     added receiptCloudinaryPublicId for Cloudinary cleanup
//   • InstallmentPayment: added to mobile (was web-only)
//   • Course: added createdAt/updatedAt Firestore timestamp fields to mobile
//     added thumbnailCloudinaryPublicId for Cloudinary cleanup
//   • CourseResource: added to mobile (was web-only); fileFormat widened to
//     include mobile's PPT/XLS plus arbitrary strings
//   • Resource: added as type alias of CourseResource for mobile compat
//   • CourseModule: added to mobile (was web-only)
//   • AssignmentSubmission: merged — cloudinaryPublicId made optional,
//     storagePath kept for Firebase Storage legacy paths
//   • SuccessStory: added collegeName (web-only) and studentPhotoPublicId
//   • AppNotification: added to web (was mobile-only)
//   • StudentProgress: merged all fields from both platforms; web-only
//     fields (studentId, studentName, email, batch, attendancePercentage)
//     and mobile-only fields (completedModuleIds, overallProgress) all made
//     optional so both platforms compile without providing the other's fields
//   • Added cloudinaryPublicId fields to types with file/media URLs:
//     Fee (receiptCloudinaryPublicId), Course (thumbnailCloudinaryPublicId),
//     SuccessStory (studentPhotoPublicId)
// ─────────────────────────────────────────────────────────────────────────────

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
    profilePhotoPublicId?: string;
    skills: string[];
    resume?: string;
    role?: 'student' | 'admin';
    status?: 'active' | 'inactive';
    isBlocked?: boolean;
    createdAt: Date;
    updatedAt?: Date;
}

// ─── Fees ────────────────────────────────────────────────────────────────────

export type FeeStatus = 'paid' | 'pending' | 'overdue' | 'partial';

export interface Fee {
    id: string;
    userId: string;
    studentName?: string;
    email?: string;
    course?: string;
    amount: number;
    dueDate: Date;
    paidDate?: Date;
    status: FeeStatus;
    description?: string;
    totalPaid?: number;
    method?: 'Cash' | 'Card' | 'Online' | 'Bank' | 'Manual';
    receiptUrl?: string;
    receiptCloudinaryPublicId?: string;
    studentId?: string;
    createdAt?: Date;
}

export interface InstallmentPayment {
    id: string;
    amount: number;
    paidDate: Date;
    method: 'Cash' | 'Bank' | 'Manual';
    notes?: string;
    recordedBy?: string;
    createdAt: Date;
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
    thumbnailCloudinaryPublicId?: string;
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
    size?: string;
    fileFormat?: 'PDF' | 'DOC' | 'DOCX' | 'PPT' | 'XLS' | string;
    // ── Video-specific metadata ──
    platform?: 'youtube' | 'vimeo' | 'cloudinary' | 'direct';
    duration?: string;          // e.g. "12:34"
    thumbnailUrl?: string;      // auto-generated or user-provided
    // ── PDF/Document-specific metadata ──
    cloudinaryPublicId?: string;
}

/** @alias CourseResource — kept for mobile backward compatibility */
export type Resource = CourseResource;

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
    fileUrl: string;            // Cloudinary or Firebase Storage URL
    storagePath?: string;       // For Firebase Storage deletion (legacy)
    cloudinaryPublicId?: string; // For Cloudinary deletion
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

export interface AppNotification {
    id: string;
    title: string;
    body: string;
    type: 'exam' | 'fee' | 'announcement' | 'general';
    referenceId?: string;     // ID of exam, fee, or announcement
    isRead: boolean;
    createdAt: number;        // Unix timestamp (ms) for easy sorting
}

// ─── Placements ──────────────────────────────────────────────────────────────

export interface SuccessStory {
    id: string;
    studentName: string;
    studentPhoto?: string;
    studentPhotoPublicId?: string;
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
    id?: string;
    userId: string;
    courseId?: string;
    userName?: string;
    // ── Web admin fields ──
    studentId?: string;
    studentName?: string;
    email?: string;
    batch?: string;
    attendancePercentage?: number;
    // ── Shared fields ──
    overallProgress?: number;
    attendance?: number;
    overallScore?: number;
    currentModule?: string;
    completedModules?: string[];
    completedModuleIds?: string[];
    lastAccessed?: Date;
    updatedAt?: { seconds: number; nanoseconds: number } | Date;
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
