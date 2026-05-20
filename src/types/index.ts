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
    batchId?: string;
    course: string;
    courseId?: string;
    enrollmentDate: Date;
    profilePhoto?: string;
    profilePhotoPublicId?: string;
    skills: string[];
    resume?: string;
    role?: 'student' | 'admin';
    status?: 'active' | 'inactive';
    isBlocked?: boolean;
    blockedAt?: Date;
    blockedReason?: string;
    isEligibleForExam?: boolean;
    tokenVersion?: number;
    fcmTokens?: string[];            // FCM device tokens for push notifications
    deviceCount?: number;            // Number of registered devices
    activeDeviceDocId?: string;       // ID of the currently active device document
    createdAt: Date;
    updatedAt?: Date;
}

// ─── Devices (Login Approval System) ─────────────────────────────────────────

export type DeviceStatus = 'pending' | 'approved' | 'rejected' | 'revoked';

export interface DeviceDocument {
    userId: string;
    deviceId: string;
    deviceMeta: {
        deviceName: string;
        osName: string;
        osVersion: string;
        modelName: string;
        appVersion: string;
    };
    status: DeviceStatus;
    isFirstDevice: boolean;
    createdAt: Date;
    updatedAt: Date;
    reviewedBy: string | null;
    userEmail: string;
    userName: string;
}

// ─── Fees ────────────────────────────────────────────────────────────────────

export type FeeStatus = 'paid' | 'pending' | 'overdue' | 'partial';

export interface Fee {
    id: string;
    userId: string;
    studentName?: string;            // Denormalized for admin display
    email?: string;                  // Denormalized for admin display
    course?: string;                 // Denormalized for admin display
    amount: number;
    dueDate: Date;
    paidDate?: Date;
    status: FeeStatus;
    description?: string;
    totalPaid?: number;              // Partial payment tracking
    method?: 'Cash' | 'Card' | 'Online' | 'Bank' | 'Manual';
    receiptUrl?: string;
    studentId?: string;              // Legacy alias for userId
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
    purchasedBy?: string[];           // Array of user IDs who purchased this course
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

/** Record of a single course purchase */
export interface CoursePurchase {
    id: string;
    userId: string;
    courseId: string;
    purchasedAt: Date | { seconds: number; nanoseconds: number };
    amount: number;
    paymentMethod?: string;
    transactionId?: string;
}

export interface Batch {
    id: string;
    name: string;
    batchCode: string;               // Admin-defined code shared offline with students
    courseId?: string;
    courseName?: string;
    startDate?: Date | string;
    endDate?: Date | string;
    active: boolean;
    studentCount: number;
    description?: string;
    createdAt: Date | { seconds: number; nanoseconds: number };
    updatedAt?: Date | { seconds: number; nanoseconds: number };
}

export interface EnrollmentRequest {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    batchId: string;
    batchName: string;
    batchCode?: string;              // Batch code used to join
    courseId?: string;
    courseName?: string;
    status: 'pending' | 'approved' | 'rejected';
    requestedAt: Date | { seconds: number; nanoseconds: number };
    resolvedAt?: Date | { seconds: number; nanoseconds: number };
    resolvedBy?: string;
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
    // ── PDF/Document-specific metadata (populated when type === 'pdf') ──
    cloudinaryPublicId?: string;
    size?: string;              // e.g. "2.3 MB"
    fileFormat?: string;        // e.g. "PDF", "DOC", "DOCX"
    isDemo?: boolean;           // Whether inactive students can view this
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
    moduleId?: string;
    title: string;
    dueDate: string;
    status: 'Pending' | 'Submitted' | 'Graded';
    score?: string;
    questionFileUrl?: string;
    questionFileName?: string;
    questionFileType?: 'pdf' | 'image' | 'doc' | 'other';
}

/** Mobile uses this as 'Resource', keeping alias for backward compatibility */
export interface Resource {
    id: string;
    moduleId?: string;
    title: string;
    type: 'video' | 'pdf' | 'link';
    url: string;
    size?: string;
    fileFormat?: 'PDF' | 'DOC' | 'DOCX' | 'PPT' | 'XLS';
    // ── Video-specific metadata ──
    platform?: 'youtube' | 'vimeo' | 'cloudinary' | 'direct';
    duration?: string;
    thumbnailUrl?: string;
    isDemo?: boolean;           // Whether inactive students can view this
}

export interface AssignmentSubmission {
    id: string;
    assignmentId: string;
    courseId: string;
    userId: string;
    userName: string;
    userEmail: string;
    fileUrl: string;                // Cloudinary URL
    storagePath?: string;           // For Firebase Storage deletion (legacy)
    cloudinaryPublicId?: string;    // For Cloudinary deletion
    fileName: string;
    fileType: 'image' | 'pdf';
    submittedAt: Date | { seconds: number; nanoseconds: number };
    grade?: number;                 // Admin assigns
    feedback?: string;              // Admin comment
    gradedAt?: Date | { seconds: number; nanoseconds: number };
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
    showAsPopup?: boolean;           // When true, appears as slide-up popup on mobile home
    mockScheduleId?: string;         // Link to mock schedule registration
}

export interface AppNotification {
    id: string;
    title: string;
    body: string;
    type: 'exam' | 'fee' | 'announcement' | 'general' | 'assignment';
    referenceId?: string;     // ID of exam, fee, or announcement
    isRead: boolean;
    createdAt: number;        // Unix timestamp (ms) for easy sorting
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
    collegeName?: string;
    stream?: string;
    field?: string;
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
    userId?: string;
    studentId?: string;              // Web alias
    courseId?: string;
    studentName?: string;
    userName?: string;               // Mobile alias
    email?: string;
    batch?: string;
    profilePhoto?: string;
    overallProgress?: number;
    attendance?: number;
    attendancePercentage?: number;   // Web alias
    overallScore?: number;
    currentModule?: string;
    completedModules?: string[];     // Legacy
    completedModuleIds?: string[];   // Reactive implementation (mobile)
    lastAccessed?: Date;
    updatedAt?: { seconds: number; nanoseconds: number } | Date;
}

// ─── Attendance ──────────────────────────────────────────────────────────────

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
    id: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    courseId?: string;
    courseName?: string;
    batchId: string;
    date: Date;
    status: AttendanceStatus;
    markedBy: string;
    markedAt: Date;
    notes?: string;
}

// ─── Interviews ──────────────────────────────────────────────────────────────

export interface Interview {
    id: string;
    company: string;
    role: string;
    scheduledDate: Date;
    status: 'scheduled' | 'completed' | 'cancelled';
    eligibleBatches: string[];
    location?: string;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

// ─── Mock Scheduling ─────────────────────────────────────────────────────────

export interface MockSchedule {
    id: string;
    title: string;
    description: string;
    scheduledDate: Date;
    studentLimit: number;
    registeredCount: number;
    status: 'open' | 'closed' | 'completed';
    targetAudience: 'all' | 'batch';
    targetBatches: string[];
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface MockRegistration {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    userBatch: string;
    registeredAt: Date;
}

