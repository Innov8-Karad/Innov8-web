import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS, FEE_STATUS } from '../constants';
import { startOfMonth, format } from 'date-fns';

export interface DashboardStats {
  totalStudents: number;
  totalFeesCollected: number;
  totalExams: number;
  placementSuccessRate: number;
}

export interface ActivityItem {
  id: string;
  type: 'registration' | 'fee' | 'exam';
  title: string;
  subtitle: string;
  timestamp: Date;
  amount?: number;
}

export interface MonthlyTrend {
  month: string;
  students: number;
  fees: number;
  exams: number;
}

const safeDate = (d: unknown): Date => {
  if (!d) return new Date();
  if (d instanceof Date) return d;
  
  if (typeof d === 'object' && d !== null) {
    if ('toDate' in d && typeof (d as { toDate?: unknown }).toDate === 'function') {
      return (d as { toDate: () => Date }).toDate();
    }
    if ('seconds' in d && typeof (d as { seconds?: unknown }).seconds === 'number') {
      return new Date((d as { seconds: number }).seconds * 1000);
    }
  }

  const parsed = new Date(d as string | number);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const dashboardService = {
  subscribeToStats(callback: (stats: DashboardStats) => void) {
    const currentStats: DashboardStats = {
      totalStudents: 0,
      totalFeesCollected: 0,
      totalExams: 0,
      placementSuccessRate: 0,
    };

    let totalPlaced = 0;

    const notify = () => {
      // Calculate success rate based on total students to avoid Infinity/NaN
      const rate = currentStats.totalStudents > 0 
        ? (totalPlaced / currentStats.totalStudents) * 100 
        : 0;
      callback({ ...currentStats, placementSuccessRate: Number(rate.toFixed(1)) });
    };

    // 1. Students Count
    const unsubsStudents = onSnapshot(query(collection(db, COLLECTIONS.USERS), where('role', '==', 'student')), (snap) => {
      currentStats.totalStudents = snap.size;
      notify();
    });

    // 2. Fees Collected
    const unsubsFees = onSnapshot(query(collection(db, COLLECTIONS.FEES), where('status', '==', FEE_STATUS.PAID)), (snap) => {
      let total = 0;
      snap.forEach(doc => { total += (doc.data().amount || 0); });
      currentStats.totalFeesCollected = total;
      notify();
    });

    // 3. Exams Conducted
    const unsubsExams = onSnapshot(collection(db, COLLECTIONS.EXAMS), (snap) => {
      currentStats.totalExams = snap.size;
      notify();
    });

    // 4. Placements (Success Rate)
    const unsubsPlacements = onSnapshot(collection(db, COLLECTIONS.PLACEMENTS), (snap) => {
       if (!snap.empty) {
         totalPlaced = snap.docs[0].data().totalPlaced || 0;
       }
       notify();
    });

    return () => {
      unsubsStudents();
      unsubsFees();
      unsubsExams();
      unsubsPlacements();
    };
  },

  subscribeToRecentActivity(callback: (activities: ActivityItem[]) => void) {
    let activities: ActivityItem[] = [];

    const notify = () => {
      // Sort combined activities by timestamp desc
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      callback(activities.slice(0, 10)); // Top 10 latest
    };

    // Latest Registrations
    const unsubsUsers = onSnapshot(query(collection(db, COLLECTIONS.USERS), where('role', '==', 'student'), orderBy('createdAt', 'desc'), limit(5)), (snap) => {
      const users = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: `user_${doc.id}`,
          type: 'registration' as const,
          title: `New Student: ${data.name || 'Unknown'}`,
          subtitle: `Enrolled in ${data.course || 'course'}`,
          timestamp: safeDate(data.createdAt || data.updatedAt)
        };
      });
      activities = [...activities.filter(a => a.type !== 'registration'), ...users];
      notify();
    });

    // Latest Fees
    const unsubsFees = onSnapshot(query(collection(db, COLLECTIONS.FEES), where('status', '==', FEE_STATUS.PAID), orderBy('dueDate', 'desc'), limit(5)), (snap) => {
        const fees = snap.docs.map(doc => {
          const data = doc.data();
          return {
            id: `fee_${doc.id}`,
            type: 'fee' as const,
            title: 'Fee Payment Received',
            subtitle: `Student ID: ${data.studentId?.substring(0,6) || 'N/A'}`,
            amount: data.amount,
            timestamp: safeDate(data.updatedAt || data.dueDate || data.createdAt)
          };
        });
        activities = [...activities.filter(a => a.type !== 'fee'), ...fees];
        notify();
    });

    // Latest Exams
    const unsubsExams = onSnapshot(query(collection(db, COLLECTIONS.EXAMS), orderBy('createdAt', 'desc'), limit(5)), (snap) => {
        const exams = snap.docs.map(doc => {
          const data = doc.data();
          return {
            id: `exam_${doc.id}`,
            type: 'exam' as const,
            title: `New Exam Scheduled`,
            subtitle: data.title || 'Assessment',
            timestamp: safeDate(data.createdAt)
          };
        });
        activities = [...activities.filter(a => a.type !== 'exam'), ...exams];
        notify();
    });

    return () => {
       unsubsUsers();
       unsubsFees();
       unsubsExams();
    };
  },

  subscribeToMonthlyTrends(callback: (trends: MonthlyTrend[]) => void) {
    // Generate last 6 months structure
    const getInitialMonths = () => {
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            months.push({
                month: format(d, 'MMM'),
                monthKey: format(startOfMonth(d), 'yyyy-MM'),
                students: 0,
                fees: 0,
                exams: 0
            });
        }
        return months;
    };

    let trends = getInitialMonths();

    const notify = () => {
        callback([...trends]);
    };

    // Calculate six months ago timestamp for filtering (approximate)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    const sixMonthsAgoTs = Timestamp.fromDate(sixMonthsAgo);


    const unsubsUsers = onSnapshot(query(collection(db, COLLECTIONS.USERS), where('role', '==', 'student'), where('createdAt', '>=', sixMonthsAgoTs)), (snap) => {
        const newTrends = getInitialMonths(); // Reset
        
        snap.forEach(doc => {
            const date = doc.data().createdAt ? safeDate(doc.data().createdAt) : null;
            if(date) {
               const key = format(startOfMonth(date), 'yyyy-MM');
               const monthIndex = newTrends.findIndex(t => t.monthKey === key);
               if(monthIndex > -1) newTrends[monthIndex].students += 1;
            }
        });
        
        // Merge state carefully or just update the current base (simplest is to just rebuild from raw snap data for all 3 streams, but to keep them independent we merge onto a shared base)
        trends = trends.map((t, i) => ({ ...t, students: newTrends[i].students }));
        notify();
    });

    const unsubsFees = onSnapshot(query(collection(db, COLLECTIONS.FEES), where('status', '==', FEE_STATUS.PAID), where('dueDate', '>=', sixMonthsAgoTs)), (snap) => {
        const newTrends = getInitialMonths();
        snap.forEach(doc => {
            const date = doc.data().dueDate ? safeDate(doc.data().dueDate) : null;
            if(date) {
               const key = format(startOfMonth(date), 'yyyy-MM');
               const monthIndex = newTrends.findIndex(t => t.monthKey === key);
               if(monthIndex > -1) newTrends[monthIndex].fees += (doc.data().amount || 0);
            }
        });
        trends = trends.map((t, i) => ({ ...t, fees: newTrends[i].fees }));
        notify();
    });

    const unsubsExams = onSnapshot(query(collection(db, COLLECTIONS.EXAMS), where('createdAt', '>=', sixMonthsAgoTs)), (snap) => {
        const newTrends = getInitialMonths();
        snap.forEach(doc => {
            const date = doc.data().createdAt ? safeDate(doc.data().createdAt) : null;
            if(date) {
               const key = format(startOfMonth(date), 'yyyy-MM');
               const monthIndex = newTrends.findIndex(t => t.monthKey === key);
               if(monthIndex > -1) newTrends[monthIndex].exams += 1;
            }
        });
        trends = trends.map((t, i) => ({ ...t, exams: newTrends[i].exams }));
        notify();
    });

    return () => {
        unsubsUsers();
        unsubsFees();
        unsubsExams();
    };
  }
};
