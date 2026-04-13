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
loading={loading}
/>

<StatCard
title={DASHBOARD_METRICS.FEES_COLLECTED}
value={formatRupees(stats.totalFeesCollected)}
icon={IndianRupee}
color="success"
loading={loading}
/>

<StatCard
title={DASHBOARD_METRICS.EXAMS_CONDUCTED}
value={stats.totalExams.toString()}
icon={ClipboardCheck}
color="accent-blue"
loading={loading}
/>

<StatCard
title={DASHBOARD_METRICS.SUCCESS_PLACEMENTS}
value={`${stats.placementSuccessRate}%`}
icon={Target}
color="teal-accent"
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

<div className="card" style={{ padding: 'var(--space-lg)', height: '400px', display: 'flex', flexDirection: 'column' }}>

<h3 className="flex items-center gap-2 mb-md">
<TrendingUp size={20} color="var(--primary)" />
Growth Trends
</h3>

<div style={{ flex: 1, minHeight: 0 }}>
<ResponsiveContainer width="100%" height="100%" minHeight={300} debounce={100}>
<AreaChart data={trends}>
<CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
<XAxis dataKey="month" stroke="var(--chart-axis)" fontSize={12} tickLine={false} axisLine={false} />
<YAxis stroke="var(--chart-axis)" fontSize={12} tickLine={false} axisLine={false} />
<Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }} />
<Legend />
<Area type="monotone" dataKey="students" stroke="var(--primary)" fill="rgba(var(--primary-rgb), 0.1)" />
<Area type="monotone" dataKey="exams" stroke="var(--accent-blue)" fill="rgba(var(--accent-blue-rgb), 0.1)" />
</AreaChart>
</ResponsiveContainer>
</div>

</div>


{/* Revenue Chart */}

<div className="card" style={{ padding: 'var(--space-lg)', height: '400px', display: 'flex', flexDirection: 'column' }}>

<h3 className="flex items-center gap-2 mb-md">
<IndianRupee size={20} color="var(--success)" />
Revenue Trend
</h3>

<div style={{ flex: 1, minHeight: 0 }}>
<ResponsiveContainer width="100%" height="100%" minHeight={300} debounce={100}>
<BarChart data={trends}>
<CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
<XAxis dataKey="month" stroke="var(--chart-axis)" fontSize={12} tickLine={false} axisLine={false} />
<YAxis stroke="var(--chart-axis)" fontSize={12} tickLine={false} axisLine={false} />
<Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }} />
<Bar dataKey="fees" fill="var(--success)" radius={[4, 4, 0, 0]} barSize={40} />
</BarChart>
</ResponsiveContainer>
</div>

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
{activity.timestamp instanceof Date 
  ? activity.timestamp.toLocaleDateString() 
  : activity.timestamp && 'seconds' in (activity.timestamp as { seconds: number })
  ? new Date((activity.timestamp as { seconds: number }).seconds * 1000).toLocaleDateString()
  : '—'}
</div>

</div>

))}

</div>

</div>

);

}