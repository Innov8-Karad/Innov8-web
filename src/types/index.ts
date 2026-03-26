export interface User {
    id: string;
    email: string;
    name: string;
    phone: string;
    batch: string;
    course: string;
    enrollmentDate: Date; // Firestore Timestamp converted to Date
    profilePhoto?: string;
    skills: string[];
    resume?: string;
    role?: 'student' | 'admin';
    status?: 'active' | 'inactive';
    isBlocked?: boolean;
    createdAt: Date;
    updatedAt?: Date;
}

export type FeeStatus = 'paid' | 'pending' | 'overdue';

export interface Fee {
    id: string;
    userId: string;
    amount: number;
    dueDate: Date;
    paidDate?: Date;
    status: FeeStatus;
    description: string;
    receiptUrl?: string;
}

export interface Question {
    id: string;
    text: string;
    options: string[];
    correctAnswer: number; // index
    explanation?: string;
}

export interface Exam {
    id: string;
    title: string;
    description: string;
    duration: number; // minutes
    questions: Question[];
    totalMarks: number;
    scheduledDate: Date;
    category: string;
    difficulty: 'easy' | 'medium' | 'hard';
}

export interface Announcement {
    id: string;
    title: string;
    content: string;
    createdAt: Date;
    priority: 'high' | 'medium' | 'low';
    targetBatches: string[];
    author: string;
}

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
    // Mobile-compatible optional fields
    category?: string;
    professor?: string;
    badge?: string;
    icon?: string;
    iconColor?: string;
    iconBg?: string;
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

export interface SuccessStory {
    id: string;
    studentName: string;
    studentPhoto?: string;
    company: string;
    package: string | number;
    batch?: string;
    testimonial?: string;
    role?: string;
}

export interface StudentProgress {
    userId: string;
    userName?: string;
    attendance: number;
    overallScore: number;
    currentModule: string;
    completedModules: string[];
}

