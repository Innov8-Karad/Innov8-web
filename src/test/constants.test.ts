import { describe, it, expect } from 'vitest';
import {
  COLLECTIONS,
  FEE_STATUS,
  ADMIN_USER_ID,
  PRIORITY_LEVELS,
  PRIORITY_COLORS,
  DEFAULT_VALUES,
  DASHBOARD_METRICS,
  UI_STRINGS
} from '../constants';

describe('COLLECTIONS', () => {
  it('should have all required Firestore collection names', () => {
    expect(COLLECTIONS.USERS).toBe('users');
    expect(COLLECTIONS.FEES).toBe('fees');
    expect(COLLECTIONS.COURSES).toBe('courses');
    expect(COLLECTIONS.EXAMS).toBe('exams');
    expect(COLLECTIONS.ANNOUNCEMENTS).toBe('announcements');
    expect(COLLECTIONS.PLACEMENTS).toBe('placements');
    expect(COLLECTIONS.PLACEMENT_STATS).toBe('placementStats');
    expect(COLLECTIONS.OPPORTUNITIES).toBe('opportunities');
    expect(COLLECTIONS.PROGRESS).toBe('user_progress');
    expect(COLLECTIONS.ATTENDANCE).toBe('attendance');
  });

  it('should not have any undefined collection names', () => {
    Object.values(COLLECTIONS).forEach(val => {
      expect(val).toBeDefined();
      expect(typeof val).toBe('string');
      expect(val.length).toBeGreaterThan(0);
    });
  });
});

describe('FEE_STATUS', () => {
  it('should have all three fee status values', () => {
    expect(FEE_STATUS.PAID).toBe('paid');
    expect(FEE_STATUS.PENDING).toBe('pending');
    expect(FEE_STATUS.OVERDUE).toBe('overdue');
  });

  it('should only have exactly 3 status values', () => {
    expect(Object.keys(FEE_STATUS)).toHaveLength(3);
  });
});

describe('ADMIN_USER_ID', () => {
  it('should be the string admin', () => {
    expect(ADMIN_USER_ID).toBe('admin');
    expect(typeof ADMIN_USER_ID).toBe('string');
  });
});

describe('PRIORITY_LEVELS', () => {
  it('should have high, medium, and low', () => {
    expect(PRIORITY_LEVELS.HIGH).toBe('high');
    expect(PRIORITY_LEVELS.MEDIUM).toBe('medium');
    expect(PRIORITY_LEVELS.LOW).toBe('low');
  });
});

describe('PRIORITY_COLORS', () => {
  it('should map each priority level to a Hex color string', () => {
    expect(PRIORITY_COLORS[PRIORITY_LEVELS.HIGH]).toMatch(/^#/);
    expect(PRIORITY_COLORS[PRIORITY_LEVELS.MEDIUM]).toMatch(/^#/);
    expect(PRIORITY_COLORS[PRIORITY_LEVELS.LOW]).toMatch(/^#/);
    expect(PRIORITY_COLORS.DEFAULT).toMatch(/^#/);
  });
});

describe('DEFAULT_VALUES', () => {
  it('should have all dashboard default text values', () => {
    expect(DEFAULT_VALUES.AUTHOR_ADMIN).toBeDefined();
    expect(DEFAULT_VALUES.ANALYTICS_OVERVIEW).toBeDefined();
    expect(DEFAULT_VALUES.ADMIN_WELCOME).toBeDefined();
    expect(DEFAULT_VALUES.DASHBOARD_SUBTEXT).toBeDefined();
    expect(DEFAULT_VALUES.GROWTH_INSIGHTS).toBeDefined();
  });
});

describe('DASHBOARD_METRICS', () => {
  it('should have all metric labels', () => {
    expect(DASHBOARD_METRICS.TOTAL_STUDENTS).toBeDefined();
    expect(DASHBOARD_METRICS.FEES_COLLECTED).toBeDefined();
    expect(DASHBOARD_METRICS.EXAMS_CONDUCTED).toBeDefined();
    expect(DASHBOARD_METRICS.SUCCESS_PLACEMENTS).toBeDefined();
  });

  it('should have all trend values', () => {
    expect(DASHBOARD_METRICS.TREND_MONTHLY).toBeDefined();
    expect(DASHBOARD_METRICS.TREND_GROWTH).toBeDefined();
    expect(DASHBOARD_METRICS.TREND_EXAMS).toBeDefined();
    expect(DASHBOARD_METRICS.TREND_PLACEMENTS).toBeDefined();
  });
});

describe('UI_STRINGS', () => {
  it('should have COMMON section with standard labels', () => {
    expect(UI_STRINGS.COMMON.LOADING).toBeDefined();
    expect(UI_STRINGS.COMMON.CANCEL).toBeDefined();
    expect(UI_STRINGS.COMMON.SAVE).toBeDefined();
    expect(UI_STRINGS.COMMON.DELETE).toBeDefined();
    expect(UI_STRINGS.COMMON.EDIT).toBeDefined();
    expect(UI_STRINGS.COMMON.PUBLISH).toBeDefined();
  });

  it('should have all page sections', () => {
    const requiredSections = [
      'COMMON', 'ANNOUNCEMENTS', 'COURSES', 'USERS', 'EXAMS',
      'FEES', 'ATTENDANCE', 'PLACEMENTS', 'NAV', 'PROGRESS', 'LOGIN', 'THEME'
    ];
    requiredSections.forEach(section => {
      expect(UI_STRINGS).toHaveProperty(section);
    });
  });

  it('should have USERS section with all labels', () => {
    expect(UI_STRINGS.USERS.TITLE).toBe('Students');
    expect(UI_STRINGS.USERS.NEW_BTN).toBe('Add Student');
    expect(UI_STRINGS.USERS.TH_NAME).toBe('Name');
    expect(UI_STRINGS.USERS.TH_BATCH).toBe('Batch');
    expect(UI_STRINGS.USERS.TH_COURSE).toBe('Course');
    expect(UI_STRINGS.USERS.TH_JOINED).toBe('Joined');
    expect(UI_STRINGS.USERS.TH_ACTIONS).toBe('Actions');
    expect(UI_STRINGS.USERS.VIEW_DETAILS).toBeDefined();
    expect(UI_STRINGS.USERS.CLOSE_DETAILS).toBeDefined();
  });

  it('should have FEES section with all labels', () => {
    expect(UI_STRINGS.FEES.TITLE).toBeDefined();
    expect(UI_STRINGS.FEES.TH_STUDENT).toBe('Student');
    expect(UI_STRINGS.FEES.TH_COURSE).toBe('Course');
    expect(UI_STRINGS.FEES.TH_TOTAL_FEE).toBe('Total Fee');
    expect(UI_STRINGS.FEES.STAT_COLLECTED).toBeDefined();
    expect(UI_STRINGS.FEES.STAT_PENDING).toBeDefined();
    expect(UI_STRINGS.FEES.STAT_OVERDUE).toBeDefined();
    expect(UI_STRINGS.FEES.MARK_PAID).toBeDefined();
    expect(UI_STRINGS.FEES.TRANSACTION_HISTORY).toBeDefined();
  });

  it('should have EXAMS section with difficulty labels', () => {
    expect(UI_STRINGS.EXAMS.DIFFICULTY_EASY).toBeDefined();
    expect(UI_STRINGS.EXAMS.DIFFICULTY_MEDIUM).toBeDefined();
    expect(UI_STRINGS.EXAMS.DIFFICULTY_HARD).toBeDefined();
    expect(UI_STRINGS.EXAMS.QUESTIONS_SUFFIX).toBeDefined();
    expect(UI_STRINGS.EXAMS.MARKS_SUFFIX).toBeDefined();
    expect(UI_STRINGS.EXAMS.MINS_SUFFIX).toBeDefined();
  });

  it('should have NAV section with all navigation labels', () => {
    expect(UI_STRINGS.NAV.DASHBOARD).toBe('Dashboard');
    expect(UI_STRINGS.NAV.STUDENTS).toBe('Students');
    expect(UI_STRINGS.NAV.FEES).toBe('Fees');
    expect(UI_STRINGS.NAV.ATTENDANCE).toBe('Attendance');
    expect(UI_STRINGS.NAV.EXAMS).toBe('Exams');
    expect(UI_STRINGS.NAV.PLACEMENTS).toBe('Success Stories');
    expect(UI_STRINGS.NAV.COURSES).toBe('Courses');
    expect(UI_STRINGS.NAV.PROGRESS).toBe('Progress');
    expect(UI_STRINGS.NAV.ANNOUNCEMENTS).toBe('Announcements');
    expect(UI_STRINGS.NAV.LOGOUT).toBe('Logout');
  });

  it('should have LOGIN section with auth labels', () => {
    expect(UI_STRINGS.LOGIN.TITLE).toBeDefined();
    expect(UI_STRINGS.LOGIN.SUBTITLE).toBeDefined();
    expect(UI_STRINGS.LOGIN.EMAIL_LABEL).toBeDefined();
    expect(UI_STRINGS.LOGIN.PASSWORD_LABEL).toBeDefined();
    expect(UI_STRINGS.LOGIN.BTN).toBeDefined();
    expect(UI_STRINGS.LOGIN.FEATURES.COURSES_TITLE).toBeDefined();
    expect(UI_STRINGS.LOGIN.FEATURES.TRACKING_TITLE).toBeDefined();
    expect(UI_STRINGS.LOGIN.FEATURES.MENTORSHIP_TITLE).toBeDefined();
  });

  it('should have PLACEMENTS section with stat labels', () => {
    expect(UI_STRINGS.PLACEMENTS.STAT_PARTNER_COMPANIES).toBeDefined();
    expect(UI_STRINGS.PLACEMENTS.STAT_PLACED_STUDENTS).toBeDefined();
    expect(UI_STRINGS.PLACEMENTS.STAT_HIGHEST_PACKAGE).toBeDefined();
    expect(UI_STRINGS.PLACEMENTS.LPA_SUFFIX).toBe('LPA');
  });

  it('should not have any undefined string values (no missing translations)', () => {
    function checkNoUndefined(obj: Record<string, unknown>, path: string) {
      Object.entries(obj).forEach(([key, val]) => {
        const fullPath = `${path}.${key}`;
        if (typeof val === 'object' && val !== null) {
          checkNoUndefined(val as Record<string, unknown>, fullPath);
        } else {
          expect(val, `${fullPath} should not be undefined`).toBeDefined();
          expect(typeof val, `${fullPath} should be a string`).toBe('string');
          expect((val as string).length, `${fullPath} should not be empty`).toBeGreaterThan(0);
        }
      });
    }
    checkNoUndefined(UI_STRINGS as Record<string, unknown>, 'UI_STRINGS');
  });
});
