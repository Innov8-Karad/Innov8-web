import { useState, useEffect } from 'react';
import {
  GraduationCap,
  IndianRupee,
  ClipboardCheck,
  Target,
  TrendingUp,
  Activity
} from 'lucide-react';

import {
  dashboardService,
  type DashboardStats,
  type MonthlyTrend,
  type ActivityItem
} from '../services/dashboardService';

import { DEFAULT_VALUES, DASHBOARD_METRICS } from '../constants';
import StatCard from '../components/StatCard';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';

export default function Dashboard() {

const [stats, setStats] = useState<DashboardStats>({
totalStudents: 0,
totalFeesCollected: 0,
totalExams: 0,
placementSuccessRate: 0
});

const [trends, setTrends] = useState<MonthlyTrend[]>([]);
const [activities, setActivities] = useState<ActivityItem[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {

const unsubStats = dashboardService.subscribeToStats((newStats) => {
setStats(newStats);
setLoading(false);
});

const unsubTrends =
dashboardService.subscribeToMonthlyTrends((newTrends) => {
setTrends(newTrends);
});

const unsubActivities =
dashboardService.subscribeToRecentActivity((data) => {
setActivities(data);
});

const timer = setTimeout(() => setLoading(false), 5000);

return () => {
unsubStats();
unsubTrends();
unsubActivities();
clearTimeout(timer);
};

}, []);


const formatRupees = (amount: number) => {
if (amount >= 100000) return `₹ ${(amount / 100000).toFixed(1)}L`;
if (amount >= 1000) return `₹ ${(amount / 1000).toFixed(1)}K`;
return `₹ ${amount}`;
};

const getActivityIcon = (type: string) => {
switch (type) {
case 'registration':
return <GraduationCap size={16} color="var(--primary)" />;

case 'fee':
return <IndianRupee size={16} color="var(--success)" />;

case 'exam':
return <ClipboardCheck size={16} color="var(--accent-blue)" />;

default:
return <Activity size={16} color="var(--text-muted)" />;
}
};


return (

<div style={{ paddingBottom: '2rem' }}>

<div className="mb-lg">
<h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>
{DEFAULT_VALUES.ANALYTICS_OVERVIEW.split(' ')[0]}
<span style={{ color: 'var(--primary)' }}>
{DEFAULT_VALUES.ANALYTICS_OVERVIEW.split(' ')[1]}
</span>
</h1>

<p className="text-muted">
{DEFAULT_VALUES.ADMIN_WELCOME}. {DEFAULT_VALUES.DASHBOARD_SUBTEXT}
</p>

</div>


{/* Metrics Section */}

<div className="grid-cards-wide mb-xl">

<StatCard
title={DASHBOARD_METRICS.TOTAL_STUDENTS}
value={stats.totalStudents.toString()}
icon={GraduationCap}
color="primary"
trend={DASHBOARD_METRICS.TREND_MONTHLY}
loading={loading}
/>

<StatCard
title={DASHBOARD_METRICS.FEES_COLLECTED}
value={formatRupees(stats.totalFeesCollected)}
icon={IndianRupee}
color="success"
trend={DASHBOARD_METRICS.TREND_GROWTH}
loading={loading}
/>

<StatCard
title={DASHBOARD_METRICS.EXAMS_CONDUCTED}
value={stats.totalExams.toString()}
icon={ClipboardCheck}
color="accent-blue"
trend={DASHBOARD_METRICS.TREND_EXAMS}
loading={loading}
/>

<StatCard
title={DASHBOARD_METRICS.SUCCESS_PLACEMENTS}
value={`${stats.placementSuccessRate}%`}
icon={Target}
color="teal-accent"
trend={DASHBOARD_METRICS.TREND_PLACEMENTS}
loading={loading}
/>

</div>


{/* Charts Section */}

<div
className="grid-overview mb-xl"
style={{
display: 'grid',
gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
gap: 'var(--space-lg)'
}}
>

{/* Growth Chart */}

<div className="card" style={{ padding: 'var(--space-lg)', height: '400px', minWidth: 0 }}>

<h3 className="flex items-center gap-2 mb-md">
<TrendingUp size={20} color="var(--primary)" />
Growth Trends
</h3>

<ResponsiveContainer width="100%" height="90%" minWidth={0}>
<AreaChart data={trends}>
<CartesianGrid strokeDasharray="3 3" />
<XAxis dataKey="month" />
<YAxis />
<Tooltip />
<Legend />
<Area type="monotone" dataKey="students" stroke="var(--primary)" />
<Area type="monotone" dataKey="exams" stroke="var(--accent-blue)" />
</AreaChart>
</ResponsiveContainer>

</div>


{/* Revenue Chart */}

<div className="card" style={{ padding: 'var(--space-lg)', height: '400px', minWidth: 0 }}>

<h3 className="flex items-center gap-2 mb-md">
<IndianRupee size={20} color="var(--success)" />
Revenue Trend
</h3>

<ResponsiveContainer width="100%" height="90%" minWidth={0}>
<BarChart data={trends}>
<CartesianGrid strokeDasharray="3 3" />
<XAxis dataKey="month" />
<YAxis />
<Tooltip />
<Bar dataKey="fees" fill="var(--success)" />
</BarChart>
</ResponsiveContainer>

</div>

</div>


{/* ✅ Recent Activity */}

<div className="card" style={{ padding: 'var(--space-lg)' }}>

<h3 className="flex items-center gap-2 mb-md">
<Activity size={20} color="var(--primary)" />
Recent Activity
</h3>

{activities.map((activity) => (

<div
key={activity.id}
style={{
display: 'flex',
alignItems: 'center',
gap: '12px',
padding: '12px',
borderBottom: '1px solid var(--border-color)'
}}
>

<div>
{getActivityIcon(activity.type)}
</div>

<div style={{ flex: 1 }}>
<div style={{ fontWeight: 600 }}>
{activity.title}
</div>

<div style={{ fontSize: '12px', color: 'gray' }}>
{activity.subtitle}
</div>
</div>

<div>
{activity.timestamp?.toLocaleDateString()}
</div>

</div>

))}

</div>

</div>

);

}