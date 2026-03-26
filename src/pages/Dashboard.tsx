import { useState, useEffect } from 'react';
import { GraduationCap, IndianRupee, ClipboardCheck, Target, TrendingUp } from 'lucide-react';
import { feeService } from '../services/feeService';
import { examService } from '../services/examService';
import { placementService } from '../services/placementService';
import { DEFAULT_VALUES, DASHBOARD_METRICS, FEE_STATUS } from '../constants';
import { useUser } from '../hooks/useUser';
import StatCard from '../components/StatCard';

export default function Dashboard() {
    const { students: studentList, loading: studentsLoading } = useUser();
    const [stats, setStats] = useState({
        students: '0',
        fees: '₹ 0',
        exams: '0',
        placements: '0'
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                setLoading(true);
                const [fees, exams, placementsStats] = await Promise.all([
                    feeService.fetchFees(),
                    examService.fetchExams(),
                    placementService.fetchPlacementStats()
                ]);

                const totalFeesAmount = fees.filter(f => f.status === FEE_STATUS.PAID).reduce((acc, f) => acc + (f.amount || 0), 0);

                setStats(prev => ({
                    ...prev,
                    fees: `₹ ${(totalFeesAmount / 100000).toFixed(1)}L`,
                    exams: exams.length.toString(),
                    placements: placementsStats?.totalPlaced?.toString() || '0'
                }));
            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    // Sync student count whenever studentList updates
    useEffect(() => {
        setStats(prev => ({
            ...prev,
            students: studentList.length.toString()
        }));
    }, [studentList]);

    return (
        <div>
            <div className="mb-lg">
                <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>
                    {DEFAULT_VALUES.ANALYTICS_OVERVIEW.split(' ')[0]} <span style={{ color: 'var(--primary)' }}>{DEFAULT_VALUES.ANALYTICS_OVERVIEW.split(' ')[1]}</span>
                </h1>
                <p className="text-muted">{DEFAULT_VALUES.ADMIN_WELCOME}. {DEFAULT_VALUES.DASHBOARD_SUBTEXT}</p>
            </div>

            <div className="grid-cards-wide mb-xl">
                <StatCard title={DASHBOARD_METRICS.TOTAL_STUDENTS} value={stats.students} icon={GraduationCap} color="primary" trend={DASHBOARD_METRICS.TREND_MONTHLY} loading={loading || studentsLoading} />
                <StatCard title={DASHBOARD_METRICS.FEES_COLLECTED} value={stats.fees} icon={IndianRupee} color="success" trend={DASHBOARD_METRICS.TREND_GROWTH} loading={loading} />
                <StatCard title={DASHBOARD_METRICS.EXAMS_CONDUCTED} value={stats.exams} icon={ClipboardCheck} color="accent-blue" trend={DASHBOARD_METRICS.TREND_EXAMS} loading={loading} />
                <StatCard title={DASHBOARD_METRICS.SUCCESS_PLACEMENTS} value={stats.placements} icon={Target} color="teal-accent" trend={DASHBOARD_METRICS.TREND_PLACEMENTS} loading={loading} />
            </div>

            <div className="grid-single">
                <div className="card" style={{ padding: 'var(--space-lg)' }}>
                    <h3 className="flex items-center gap-2">
                        <TrendingUp size={20} color="var(--primary)" />
                        {DEFAULT_VALUES.GROWTH_INSIGHTS}
                    </h3>
                    {loading ? (
                        <div className="animate-pulse mt-md">
                            <div style={{ height: '1rem', backgroundColor: 'var(--bg-card-accent)', borderRadius: '4px', width: '100%', marginBottom: '8px' }} />
                            <div style={{ height: '1rem', backgroundColor: 'var(--bg-card-accent)', borderRadius: '4px', width: '70%' }} />
                        </div>
                    ) : (
                        <p className="text-muted mt-md" style={{ fontSize: '1rem', lineHeight: 1.6 }}>
                            {DEFAULT_VALUES.ENGAGEMENT_TEXT.replace('12.5% students', `${stats.students} students`)}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
