import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
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
  monthKey?: string;
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
       // totalPlaced is the count of success story records
       totalPlaced = snap.size;
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
    let userAgg: Record<string, number> = {};
    let feeAgg: Record<string, number> = {};
    let examAgg: Record<string, number> = {};

    const notify = () => {
        const allKeys = new Set([
            ...Object.keys(userAgg),
            ...Object.keys(feeAgg),
            ...Object.keys(examAgg)
        ]);

        if (allKeys.size === 0) {
            callback([]);
            return;
        }

        const sortedKeys = Array.from(allKeys).sort();
        const minKey = sortedKeys[0];
        const maxKey = sortedKeys[sortedKeys.length - 1];

        const trends: MonthlyTrend[] = [];
        const [minYear, minMonth] = minKey.split('-').map(Number);
        const [maxYear, maxMonth] = maxKey.split('-').map(Number);

        const start = new Date(minYear, minMonth - 1, 1);
        const end = new Date(maxYear, maxMonth - 1, 1);

        const currentIter = new Date(start.getTime());

        while (currentIter <= end) {
            const mKey = format(currentIter, 'yyyy-MM');
            trends.push({
                month: format(currentIter, 'MMM'),
                monthKey: mKey,
                students: userAgg[mKey] || 0,
                fees: feeAgg[mKey] || 0,
                exams: examAgg[mKey] || 0
            });
            currentIter.setMonth(currentIter.getMonth() + 1);
        }

        callback(trends);
    };

    const unsubsUsers = onSnapshot(query(collection(db, COLLECTIONS.USERS), where('role', '==', 'student')), (snap) => {
        userAgg = {};
        snap.forEach(doc => {
            const date = doc.data().createdAt ? safeDate(doc.data().createdAt) : null;
            if (date) {
                const key = format(startOfMonth(date), 'yyyy-MM');
                userAgg[key] = (userAgg[key] || 0) + 1;
            }
        });
        notify();
    });

    const unsubsFees = onSnapshot(query(collection(db, COLLECTIONS.FEES), where('status', '==', FEE_STATUS.PAID)), (snap) => {
        feeAgg = {};
        snap.forEach(doc => {
            const date = doc.data().dueDate ? safeDate(doc.data().dueDate) : null;
            if (date) {
                const key = format(startOfMonth(date), 'yyyy-MM');
                feeAgg[key] = (feeAgg[key] || 0) + (doc.data().amount || 0);
            }
        });
        notify();
    });

    const unsubsExams = onSnapshot(query(collection(db, COLLECTIONS.EXAMS)), (snap) => {
        examAgg = {};
        snap.forEach(doc => {
            const date = doc.data().createdAt ? safeDate(doc.data().createdAt) : null;
            if (date) {
                const key = format(startOfMonth(date), 'yyyy-MM');
                examAgg[key] = (examAgg[key] || 0) + 1;
            }
        });
        notify();
    });

    return () => {
        unsubsUsers();
        unsubsFees();
        unsubsExams();
    };
  }
};
