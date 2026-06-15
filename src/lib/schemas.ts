import { z } from 'zod';

// ─── Shared Validators ───────────────────────────────────────────────────────
const phoneRegex = /^(?:\+?91|0)?[6789]\d{9}$/;

// ─── User Forms ──────────────────────────────────────────────────────────────
export const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(phoneRegex, 'Invalid Indian phone number'),
  role: z.enum(['student', 'admin']),
  batch: z.string().min(1, 'Batch is required'),
  course: z.string().min(1, 'Course is required'),
  status: z.enum(['active', 'inactive']).optional(),
});

export type UserFormData = z.infer<typeof userSchema>;

// ─── Fee Forms ───────────────────────────────────────────────────────────────
export const feeSchema = z.object({
  userId: z.string().min(1, 'User/Student selection is required'),
  amount: z.number({ error: "Amount must be a number" }).positive('Amount must be greater than 0'),
  dueDate: z.date({ error: 'Due date is required' }),
  status: z.enum(['paid', 'pending', 'overdue', 'partial']),
  description: z.string().optional(),
});

export type FeeFormData = z.infer<typeof feeSchema>;

// ─── Exam Forms ──────────────────────────────────────────────────────────────
export const questionSchema = z.object({
  questionText: z.string().min(10, 'Question must be at least 10 characters'),
  options: z.array(z.string().min(1, 'Option cannot be empty')).length(4, 'Exactly 4 options are required'),
  correctAnswerIndex: z.number().min(0).max(3),
  explanation: z.string().optional(),
});

export const examSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  duration: z.number().positive('Duration must be greater than 0 (minutes)'),
  totalMarks: z.number().positive('Total marks must be greater than 0'),
  scheduledDate: z.date(),
  category: z.string().min(1, 'Category is required'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  questions: z.array(questionSchema).min(1, 'At least 1 question is required'),
});

export type ExamFormData = z.infer<typeof examSchema>;

// ─── Announcement Forms ──────────────────────────────────────────────────────
export const announcementSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title is too long'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  priority: z.enum(['low', 'medium', 'high']),
  targetBatches: z.array(z.string()).min(1, 'Select at least one target batch'),
});

export type AnnouncementFormData = z.infer<typeof announcementSchema>;

// ─── Job Forms ───────────────────────────────────────────────────────────────
export const jobSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  role: z.string().min(2, 'Role is required'),
  location: z.string().min(2, 'Location is required'),
  salary: z.string().min(1, 'Salary/Stipend details are required'),
  jobType: z.enum(['Full-time', 'Internship']),
  applyLink: z.string().url('Must be a valid URL'),
  deadline: z.date().optional(),
  eligibleStudentIds: z.array(z.string()).min(1, 'Select at least one student'),
  requirements: z.array(z.string()).optional(),
});

export type JobFormData = z.infer<typeof jobSchema>;

// ─── Interview Forms ─────────────────────────────────────────────────────────
export const interviewSchema = z.object({
    company: z.string().min(2, 'Company name is required'),
    role: z.string().min(2, 'Role is required'),
    scheduledDate: z.date({ error: 'Date and time are required' }),
    status: z.enum(['scheduled', 'completed', 'cancelled']),
    eligibleBatches: z.array(z.string()).min(1, 'Select at least one eligible batch'),
    location: z.string().optional(),
    notes: z.string().optional(),
});

export type InterviewFormData = z.infer<typeof interviewSchema>;
