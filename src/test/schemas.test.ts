import { describe, it, expect } from 'vitest';
import { 
  userSchema, 
  feeSchema, 
  examSchema, 
  announcementSchema, 
  jobSchema, 
  interviewSchema 
} from '../lib/schemas';

describe('Zod Schemas', () => {
  describe('userSchema', () => {
    it('should validate correct user data', () => {
      const validUser = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '9876543210',
        role: 'student',
        batch: 'Batch A',
        course: 'Course 1'
      };
      expect(userSchema.safeParse(validUser).success).toBe(true);
    });

    it('should fail for invalid email', () => {
      const invalidUser = {
        name: 'John Doe',
        email: 'not-an-email',
        phone: '9876543210',
        role: 'student',
        batch: 'Batch A',
        course: 'Course 1'
      };
      expect(userSchema.safeParse(invalidUser).success).toBe(false);
    });

    it('should fail for invalid Indian phone number', () => {
      const invalidPhone = {
        name: 'John',
        email: 'j@e.co',
        phone: '12345', // Too short
        role: 'admin',
        batch: 'B',
        course: 'C'
      };
      expect(userSchema.safeParse(invalidPhone).success).toBe(false);
    });
  });

  describe('feeSchema', () => {
    it('should validate correct fee data', () => {
      const validFee = {
        userId: 'user123',
        amount: 500,
        dueDate: new Date(),
        status: 'pending'
      };
      expect(feeSchema.safeParse(validFee).success).toBe(true);
    });

    it('should fail for negative amount', () => {
      const invalidFee = {
        userId: 'u1',
        amount: -100,
        dueDate: new Date(),
        status: 'paid'
      };
      expect(feeSchema.safeParse(invalidFee).success).toBe(false);
    });
  });

  describe('examSchema', () => {
    it('should validate correct exam data', () => {
      const validExam = {
        title: 'Math Final',
        description: 'Final exam for algebra',
        duration: 90,
        totalMarks: 100,
        scheduledDate: new Date(),
        category: 'Math',
        difficulty: 'medium',
        questions: [
          {
            questionText: 'What is 2+2?',
            options: ['1', '2', '3', '4'],
            correctAnswerIndex: 3,
            explanation: 'Basic addition'
          }
        ]
      };
      expect(examSchema.safeParse(validExam).success).toBe(true);
    });

    it('should fail if less than 1 question', () => {
      const invalidExam = {
        title: 'Math',
        description: 'Short desc',
        duration: 10,
        totalMarks: 10,
        scheduledDate: new Date(),
        category: 'C',
        difficulty: 'easy',
        questions: []
      };
      expect(examSchema.safeParse(invalidExam).success).toBe(false);
    });
  });

  describe('announcementSchema', () => {
    it('should validate valid announcement', () => {
      const valid = {
        title: 'Holiday Notice',
        content: 'School is closed tomorrow.',
        priority: 'high',
        targetBatches: ['Batch A', 'Batch B']
      };
      expect(announcementSchema.safeParse(valid).success).toBe(true);
    });
  });

  describe('jobSchema', () => {
    it('should validate valid job data', () => {
      const valid = {
        companyName: 'Tech Corp',
        role: 'SDE',
        location: 'Pune',
        salary: '10 LPA',
        jobType: 'Full-time',
        applyLink: 'https://techcorp.com/apply',
        eligibleBatches: ['2024'],
        requirements: 'Must know React and Node.js'
      };
      expect(jobSchema.safeParse(valid).success).toBe(true);
    });
  });

  describe('interviewSchema', () => {
    it('should validate valid interview data', () => {
      const valid = {
        company: 'Google',
        role: 'Intern',
        scheduledDate: new Date(),
        status: 'scheduled',
        eligibleBatches: ['Batch A']
      };
      expect(interviewSchema.safeParse(valid).success).toBe(true);
    });
  });
});
