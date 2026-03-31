import { describe, it, expect } from 'vitest';
import type { User, Fee, Exam, Announcement, Course, Placement, SuccessStory, StudentProgress } from '../types';

describe('User type', () => {
  it('should accept a valid user object', () => {
    const user: User = {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      batch: '2024-A',
      course: 'React Development',
      phone: '1234567890',
      skills: ['React', 'TypeScript'],
      enrollmentDate: new Date(),
      createdAt: new Date()
    };
    expect(user.id).toBe('1');
    expect(user.name).toBe('John Doe');
    expect(user.skills).toHaveLength(2);
  });
});

describe('Fee type', () => {
  it('should accept a valid fee object', () => {
    const fee: Fee = {
      id: 'fee-1',
      userId: 'user-1',
      studentName: 'John Doe',
      email: 'john@example.com',
      course: 'React Development',
      amount: 50000,
      dueDate: new Date(),
      description: 'Tuition Fee',
      status: 'pending',
      createdAt: new Date(),
    };
    expect(fee.amount).toBe(50000);
    expect(fee.status).toBe('pending');
  });

  it('should accept all valid status values', () => {
    const statuses: Fee['status'][] = ['paid', 'pending', 'overdue'];
    statuses.forEach(status => {
      expect(['paid', 'pending', 'overdue']).toContain(status);
    });
  });
});

describe('Exam type', () => {
  it('should accept a valid exam object', () => {
    const exam: Exam = {
      id: 'exam-1',
      title: 'React Midterm',
      description: 'React assessment',
      category: 'Web Dev',
      difficulty: 'medium',
      duration: 60,
      totalMarks: 100,
      scheduledDate: new Date(),
      questions: []
    };
    expect(exam.title).toBe('React Midterm');
    expect(exam.difficulty).toBe('medium');
    expect(exam.duration).toBe(60);
  });
});

describe('Course type', () => {
  it('should accept a valid course object', () => {
    const course: Course = {
      id: 'course-1',
      title: 'Full Stack Dev',
      description: 'Learn MERN stack',
      instructor: 'Prof. Smith',
      duration: '12 Weeks',
      price: 15000,
      isFree: false,
      rating: 4.5,
      enrolled: 50,
      thumbnail: 'https://example.com/thumb.jpg'
    };
    expect(course.isFree).toBe(false);
    expect(course.price).toBe(15000);
    expect(course.rating).toBe(4.5);
  });

  it('should allow free courses with price 0', () => {
    const freeCourse: Course = {
      id: 'free-1',
      title: 'Free Course',
      description: 'A free course',
      instructor: 'Admin',
      duration: '4 Weeks',
      price: 0,
      isFree: true,
      rating: 0,
      enrolled: 0
    };
    expect(freeCourse.isFree).toBe(true);
    expect(freeCourse.price).toBe(0);
  });
});

describe('Announcement type', () => {
  it('should accept a valid announcement object', () => {
    const ann: Announcement = {
      id: 'ann-1',
      title: 'Holiday Notice',
      content: 'Campus closed on Monday',
      priority: 'high',
      author: 'Admin',
      targetBatches: ['All'],
      createdAt: new Date()
    };
    expect(ann.priority).toBe('high');
    expect(ann.targetBatches).toContain('All');
  });

  it('should accept announcement with student targeting', () => {
    const ann: Announcement = {
        id: 'ann-2',
        title: 'Fee Reminder',
        content: 'Your fee is overdue',
        priority: 'high',
        author: 'Admin',
        targetAudience: 'students',
        targetBatches: [],
        targetStudentIds: ['uid-123', 'uid-456'],
        createdAt: new Date()
    };
    expect(ann.targetAudience).toBe('students');
    expect(ann.targetStudentIds).toHaveLength(2);
  });
});

describe('Placement type', () => {
  it('should accept a valid placement stats object', () => {
    const placement: Placement = {
      id: 'place-1',
      year: 2024,
      studentsPlaced: 120,
      totalStudents: 150,
      totalPlaced: 150,
      highestPackage: 25,
      averagePackage: 12,
      companiesCount: 30,
      topCompanies: ['Google', 'Amazon'],
      successStories: []
    };
    expect(placement.totalPlaced).toBe(150);
    expect(placement.highestPackage).toBe(25);
  });
});

describe('SuccessStory type', () => {
  it('should accept a valid success story', () => {
    const story: SuccessStory = {
      id: 'story-1',
      studentName: 'Jane Doe',
      company: 'Google',
      package: '12 LPA',
      role: 'Software Engineer',
      batch: '2024',
      year: 2024
    };
    expect(story.studentName).toBe('Jane Doe');
    expect(story.company).toBe('Google');
  });
});

describe('StudentProgress type', () => {
  it('should accept a valid student progress object', () => {
    const progress: StudentProgress = {
      userId: 'user-1',
      userName: 'John',
      attendance: 85,
      overallScore: 78,
      currentModule: 'React Hooks',
      completedModules: ['HTML', 'CSS', 'JavaScript']
    };
    expect(progress.attendance).toBe(85);
    expect(progress.completedModules).toHaveLength(3);
  });
});
