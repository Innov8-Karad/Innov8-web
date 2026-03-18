export const COLLECTIONS = {
  ANNOUNCEMENTS: 'announcements',
  USERS: 'users',
  FEES: 'fees',
  COURSES: 'courses',
  ATTENDANCE: 'attendance',
  EXAMS: 'exams',
  PLACEMENTS: 'placements',
  SUCCESS_STORIES: 'successStories',
} as const;

export const PRIORITY_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export const PRIORITY_COLORS = {
  [PRIORITY_LEVELS.HIGH]: 'var(--error)',
  [PRIORITY_LEVELS.MEDIUM]: 'var(--primary)',
  [PRIORITY_LEVELS.LOW]: 'var(--success)',
  DEFAULT: 'var(--text-secondary)',
} as const;

export const DEFAULT_VALUES = {
  AUTHOR_ADMIN: 'Admin',
  TARGET_BATCH_ALL: 'All',
  ADMIN_WELCOME: 'Welcome back, Admin',
  ANALYTICS_OVERVIEW: 'Analytics Overview',
  DASHBOARD_SUBTEXT: 'Monitor platform performance at a glance.',
  ENGAGEMENT_TEXT: 'Engagement is up 12.5% compared to last month.',
  GROWTH_INSIGHTS: 'Growth Insights',
} as const;

export const DASHBOARD_METRICS = {
  TOTAL_STUDENTS: 'Total Students',
  FEES_COLLECTED: 'Fees Collected',
  EXAMS_CONDUCTED: 'Exams Conducted',
  SUCCESS_PLACEMENTS: 'Success Placements',
  TREND_MONTHLY: '+12% this month',
  TREND_GROWTH: '+5.4% growth',
  TREND_EXAMS: 'Next: Monday',
  TREND_PLACEMENTS: '85% Success Rate',
} as const;

export const UI_STRINGS = {
  // Common strings
  COMMON: {
    LOADING: 'Loading...',
    ERROR_PRIMARY: 'Something went wrong. Please try again.',
    CANCEL: 'Cancel',
    SAVE: 'Save',
    DELETE: 'Delete',
    EDIT: 'Edit',
    PUBLISH: 'Publish',
    SEARCH_PLACEHOLDER: 'Search...',
    NO_DATA: 'No results found.',
  },
  // Announcements page
  ANNOUNCEMENTS: {
    TITLE: 'Announcements',
    SUBTITLE: 'Send updates and notifications to students',
    NEW_BTN: 'New Announcement',
    MODAL_TITLE: 'New Announcement',
    LOADING: 'Loading announcements...',
    ERROR_LOAD: 'Failed to load announcements. Please try again later.',
    ERROR_CREATE: 'Failed to create announcement. Please try again.',
    EMPTY: 'No announcements found.',
  },
  // Courses page
  COURSES: {
    TITLE: 'Course Management',
    SUBTITLE: 'Manage courses, curriculum, and instructors',
    NEW_BTN: 'Add Course',
    MODAL_TITLE: 'Add New Course',
    LOADING: 'Loading courses...',
    ERROR_LOAD: 'Failed to load courses. Please try again later.',
    ERROR_CREATE: 'Failed to add course. Please try again.',
  },
  // Users/Students page
  USERS: {
    TITLE: 'Students',
    SUBTITLE: 'Manage student profiles and enrollments',
    NEW_BTN: 'Add Student',
    MODAL_TITLE: 'Add New Student',
    LOADING: 'Loading students...',
    ERROR_LOAD: 'Failed to load students. Please try again later.',
    ERROR_CREATE: 'Failed to add student. Please try again.',
    EMPTY: 'No students found.',
    SEARCH: 'Search by name or email...',
    SELECT_COURSE: 'Select Course',
    SELECT_COURSE_PLACEHOLDER: '-- Choose a course --',
  },
  // Exams page
  EXAMS: {
    TITLE: 'Examinations',
    SUBTITLE: 'Create and manage student assessments',
    NEW_BTN: 'Create New Exam',
    MODAL_TITLE: 'Create New Assessment',
    LOADING: 'Loading exams...',
    ERROR_LOAD: 'Failed to load exams. Please try again later.',
    ERROR_CREATE: 'Failed to create exam. Please try again.',
    EMPTY: 'No exams found matching your search.',
  },
  FEES: {
    TITLE: 'Student Fee Status',
    SUBTITLE: 'Monitor payment status across all enrolled students',
    LOADING: 'Loading fee records...',
    NEW_BTN: 'New Fee Record',
    SEARCH: 'Search by student or course...',
    EMPTY: 'No student summaries found.',
    MODAL_TITLE: 'Create Fee Record',
    ERROR_LOAD: 'Failed to load fee information. Please try again later.',
    ERROR_UPDATE: 'Failed to update payment status.',
    ERROR_CREATE: 'Failed to create fee record.',
  },
  PLACEMENTS: {
    TITLE: 'Placements',
    SUBTITLE: 'Track student placement records and success stories',
    LOADING: 'Loading placements...',
    NEW_BTN: 'Add Success Story',
    ERROR_LOAD: 'Failed to load placement records. Please try again later.',
    ERROR_SAVE: 'Failed to save success story.',
    MODAL_TITLE: 'Add Success Story',
  },
  NAV: {
    DASHBOARD: 'Dashboard',
    STUDENTS: 'Students',
    FEES: 'Fees',
    EXAMS: 'Exams',
    PLACEMENTS: 'Placements',
    COURSES: 'Courses',
    PROGRESS: 'Progress',
    ANNOUNCEMENTS: 'Announcements',
    LOGOUT: 'Logout',
    ADMIN: 'Admin',
  },
  PROGRESS: {
    TITLE: 'Student Progress',
    SUBTITLE: 'Monitor academic performance and attendance across all batches',
    LOADING: 'Loading progress data...',
    EMPTY: 'No progress records found. Update student performance to see data here.',
    VIEW_REPORT: 'View Full Report',
    MODULES_COMPLETED: 'Modules Completed',
  },
  LOGIN: {
    TITLE: 'Admin Portal',
    SUBTITLE: 'Sign in to manage your institution',
    EMAIL_LABEL: 'Email Address',
    PASSWORD_LABEL: 'Password',
    BTN: 'Sign In',
    ERROR: 'Invalid email or password.',
    LOADING: 'Signing in...',
    FEATURES: {
      COURSES_TITLE: 'Verified Courses',
      COURSES_DESC: 'Expert-led curriculum for modern skills.',
      TRACKING_TITLE: 'Smart Tracking',
      TRACKING_DESC: 'Real-time progress and performance analytics.',
      MENTORSHIP_TITLE: 'Expert Mentorship',
      MENTORSHIP_DESC: 'Direct guidance from industry veterans.',
    },
    FOOTER_SUPPORT: 'Need technical support?',
    FOOTER_CONTACT: 'Contact Systems',
  },
  THEME: {
    SWITCH_DARK: 'Switch to Dark Mode',
    SWITCH_LIGHT: 'Switch to Light Mode',
  }
} as const;

