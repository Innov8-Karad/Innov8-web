import { useState, useEffect } from 'react';
import { GraduationCap, IndianRupee, ClipboardCheck, Target, TrendingUp } from 'lucide-react';
import { userService } from '../services/userService';
import { feeService } from '../services/feeService';
import { examService } from '../services/examService';
import { placementService } from '../services/placementService';
import { DEFAULT_VALUES, DASHBOARD_METRICS } from '../constants';

function StatCard({ title, value, icon: Icon, color, trend, loading }: { title: string, value: string, icon: any, color: string, trend?: string, loading?: boolean }) {
    const colorVar = `var(--${color})`;
    const rgbVar = `var(--${color}-rgb)`;
    
    return (
        <div className="card stat-card-hover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'default' }}>
            <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>{title}</p>
                {loading ? (
                    <div className="animate-pulse" style={{ height: '32px', width: '100px', backgroundColor: 'var(--dark-card-accent)', borderRadius: '4px', marginBottom: '4px' }}></div>
                ) : (
                    <h3 style={{ fontSize: '1.75rem', color: 'var(--text-main)', marginBottom: '4px' }}>{value}</h3>
                )}
                {trend && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)', fontSize: '0.75rem' }}>
                        <TrendingUp size={12} /> {trend}
                    </div>
                )}
            </div>
            <div className={`icon-container`} style={{
                width: '52px',
                height: '52px',
                backgroundColor: `rgba(${rgbVar}, 0.1)`,
                color: colorVar,
                border: `1px solid rgba(${rgbVar}, 0.2)`
            }}>
                <Icon size={24} />
            </div>
        </div>
    );
}

export default function Dashboard() {
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
                const [users, fees, exams, placementsStats] = await Promise.all([
                    userService.fetchUsers(),
                    feeService.fetchFees(),
                    examService.fetchExams(),
                    placementService.fetchPlacementStats()
                ]);

                const totalFeesAmount = fees.filter(f => f.status === 'paid').reduce((acc, f) => acc + (f.amount || 0), 0);

                setStats({
                    students: users.filter(u => u.id !== 'admin').length.toString(), 
                    fees: `₹ ${(totalFeesAmount / 100000).toFixed(1)}L`,
                    exams: exams.length.toString(),
                    placements: placementsStats?.totalPlaced?.toString() || '0'
                });
            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    return (
        <div>
            <div style={{ marginBottom: 'var(--space-lg)' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>
                    {DEFAULT_VALUES.ANALYTICS_OVERVIEW.split(' ')[0]} <span style={{ color: 'var(--primary)' }}>{DEFAULT_VALUES.ANALYTICS_OVERVIEW.split(' ')[1]}</span>
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>{DEFAULT_VALUES.ADMIN_WELCOME}. {DEFAULT_VALUES.DASHBOARD_SUBTEXT}</p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 'var(--space-lg)',
                marginBottom: 'var(--space-xl)'
            }}>
                <StatCard title={DASHBOARD_METRICS.TOTAL_STUDENTS} value={stats.students} icon={GraduationCap} color="primary" trend={DASHBOARD_METRICS.TREND_MONTHLY} loading={loading} />
                <StatCard title={DASHBOARD_METRICS.FEES_COLLECTED} value={stats.fees} icon={IndianRupee} color="success" trend={DASHBOARD_METRICS.TREND_GROWTH} loading={loading} />
                <StatCard title={DASHBOARD_METRICS.EXAMS_CONDUCTED} value={stats.exams} icon={ClipboardCheck} color="accent-blue" trend={DASHBOARD_METRICS.TREND_EXAMS} loading={loading} />
                <StatCard title={DASHBOARD_METRICS.SUCCESS_PLACEMENTS} value={stats.placements} icon={Target} color="teal-accent" trend={DASHBOARD_METRICS.TREND_PLACEMENTS} loading={loading} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-lg)' }}>
                <div className="card" style={{ padding: 'var(--space-lg)' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <TrendingUp size={20} color="var(--primary)" /> 
                        {DEFAULT_VALUES.GROWTH_INSIGHTS}
                    </h3>
                    {loading ? (
                        <div className="animate-pulse" style={{ marginTop: 'var(--space-md)' }}>
                            <div style={{ height: '1rem', backgroundColor: 'var(--dark-card-accent)', borderRadius: '4px', width: '100%', marginBottom: '8px' }}></div>
                            <div style={{ height: '1rem', backgroundColor: 'var(--dark-card-accent)', borderRadius: '4px', width: '70%' }}></div>
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-md)', fontSize: '1rem', lineHeight: 1.6 }}>
                            {DEFAULT_VALUES.ENGAGEMENT_TEXT.replace('12.5% students', `${stats.students} students`)}
                            {/* Note: In a real app, 'is growing' and the percentage would also come from calc logic or API */}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
