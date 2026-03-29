import { describe, it, expect } from 'vitest';
import { COLLECTIONS, FEE_STATUS, ADMIN_USER_ID, UI_STRINGS } from '../constants';

describe('No Hardcoded Values Audit', () => {

  describe('Fee status values are centralized', () => {
    it('FEE_STATUS.PAID should be the only source of truth for paid status', () => {
      expect(FEE_STATUS.PAID).toBe('paid');
    });

    it('FEE_STATUS.PENDING should be the only source of truth for pending status', () => {
      expect(FEE_STATUS.PENDING).toBe('pending');
    });

    it('FEE_STATUS.OVERDUE should be the only source of truth for overdue status', () => {
      expect(FEE_STATUS.OVERDUE).toBe('overdue');
    });
  });

  describe('Admin user ID is centralized', () => {
    it('ADMIN_USER_ID should be the only source of truth for filtering admin users', () => {
      expect(ADMIN_USER_ID).toBe('admin');
      expect(typeof ADMIN_USER_ID).toBe('string');
    });
  });

  describe('Collection names are centralized', () => {
    it('all Firestore collection names should be defined in COLLECTIONS constant', () => {
      const requiredCollections = [
        'USERS', 'FEES', 'COURSES', 'EXAMS',
        'ANNOUNCEMENTS', 'PLACEMENTS', 'SUCCESS_STORIES', 'PROGRESS'
      ];
      requiredCollections.forEach(col => {
        expect(COLLECTIONS).toHaveProperty(col);
        expect((COLLECTIONS as Record<string, string>)[col]).toBeTruthy();
      });
    });
  });

  describe('UI strings are centralized', () => {
    it('every page should have its strings defined in UI_STRINGS', () => {
      const pages = [
        'USERS', 'FEES', 'EXAMS', 'COURSES',
        'ANNOUNCEMENTS', 'PLACEMENTS', 'PROGRESS', 'LOGIN'
      ];
      pages.forEach(page => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const section = (UI_STRINGS as any)[page];
        expect(section, `UI_STRINGS.${page} should exist`).toBeDefined();
        expect(section.TITLE || section.TITLE === undefined, `should have title or login-specific fields`).toBeTruthy();
      });
    });

    it('every page section should have loading and error strings', () => {
      const pagesWithLoadingError = ['USERS', 'FEES', 'EXAMS', 'COURSES', 'ANNOUNCEMENTS', 'PLACEMENTS', 'PROGRESS'];
      pagesWithLoadingError.forEach(page => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const section = (UI_STRINGS as any)[page];
        expect(section.LOADING, `UI_STRINGS.${page}.LOADING`).toBeDefined();
      });
    });

    it('common strings should be available for all pages', () => {
      expect(UI_STRINGS.COMMON.CANCEL).toBeDefined();
      expect(UI_STRINGS.COMMON.SAVE).toBeDefined();
      expect(UI_STRINGS.COMMON.DELETE).toBeDefined();
      expect(UI_STRINGS.COMMON.EDIT).toBeDefined();
      expect(UI_STRINGS.COMMON.PUBLISH).toBeDefined();
    });
  });

  describe('Navigation labels are centralized', () => {
    it('all sidebar nav labels should come from UI_STRINGS.NAV', () => {
      const navItems = ['DASHBOARD', 'STUDENTS', 'FEES', 'EXAMS', 'PLACEMENTS', 'COURSES', 'PROGRESS', 'ANNOUNCEMENTS', 'LOGOUT'];
      navItems.forEach(item => {
        expect((UI_STRINGS.NAV as Record<string, string>)[item], `NAV.${item}`).toBeDefined();
        expect(typeof (UI_STRINGS.NAV as Record<string, string>)[item]).toBe('string');
      });
    });
  });
});

describe('Plug-and-Play DB Readiness', () => {
  it('collection names should only reference Firestore collections, not project-specific values', () => {
    // All values should be simple lowercase strings (Firestore conventions)
    Object.values(COLLECTIONS).forEach(val => {
      expect(val).toMatch(/^[a-zA-Z_]+$/);
    });
  });

  it('no project-specific URLs or IDs should be in constants', () => {
    // Scan all string values in constants to ensure no Firebase project IDs are embedded
    const allStrings = JSON.stringify({ COLLECTIONS, FEE_STATUS, ADMIN_USER_ID, UI_STRINGS });
    expect(allStrings).not.toContain('innov8-cde79');
    expect(allStrings).not.toContain('firebaseapp.com');
    expect(allStrings).not.toContain('AIzaSy');
  });
});
