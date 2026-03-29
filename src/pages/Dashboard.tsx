import { useState, useEffect } from 'react';
import {
  GraduationCap,
  IndianRupee,
  ClipboardCheck,
  Target,
  TrendingUp
} from 'lucide-react';

import {
  dashboardService,
  type DashboardStats,
  type MonthlyTrend
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

const timer = setTimeout(() => setLoading(false), 5000);

return () => {
unsubStats();

unsubTrends();
clearTimeout(timer);
};

}, []);


const formatRupees = (amount: number) => {
if (amount >= 100000) return `₹ ${(amount / 100000).toFixed(1)}L`;
if (amount >= 1000) return `₹ ${(amount / 1000).toFixed(1)}K`;
return `₹ ${amount}`;
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

{/* Chart 1 */}

<div
className="card"
style={{
padding: 'var(--space-lg)',
height: '400px',
display: 'flex',
flexDirection: 'column'
}}
>

<h3
className="flex items-center gap-2 mb-md"
style={{
borderBottom: '1px solid var(--border-color)',
paddingBottom: 'var(--space-md)'
}}
>

<TrendingUp size={20} color="var(--primary)" />
Growth Trends (Monthly)

</h3>

{loading ? (

<div className="animate-pulse flex-1 bg-surface-hover rounded" />

) : (

<div style={{ flex: 1, minHeight: 0 }}>

<ResponsiveContainer width="100%" height="100%">

<AreaChart data={trends}>

<CartesianGrid strokeDasharray="3 3" />

<XAxis dataKey="month" />

<YAxis />

<Tooltip />

<Legend />

<Area
type="monotone"
dataKey="students"
stroke="var(--primary)"
/>

<Area
type="monotone"
dataKey="exams"
stroke="var(--accent-blue)"
/>

</AreaChart>

</ResponsiveContainer>

</div>

)}

</div>


{/* Revenue Chart */}

<div
className="card"
style={{
padding: 'var(--space-lg)',
height: '400px',
display: 'flex',
flexDirection: 'column'
}}
>

<h3
className="flex items-center gap-2 mb-md"
style={{
borderBottom: '1px solid var(--border-color)',
paddingBottom: 'var(--space-md)'
}}
>

<IndianRupee size={20} color="var(--success)" />
Revenue Trend

</h3>

<div style={{ flex: 1 }}>

<ResponsiveContainer width="100%" height="100%">

<BarChart data={trends}>

<CartesianGrid strokeDasharray="3 3" />

<XAxis dataKey="month" />

<YAxis
tickFormatter={(value) =>
`₹${value >= 1000
? (value / 1000).toFixed(0) + 'k'
: value}`
}
/>

<Tooltip
formatter={(value: number | string | readonly (number | string)[] | undefined) => {
const val = Array.isArray(value) ? value[0] : value;
return `₹ ${Number(val || 0).toLocaleString()}`;
}}
/>
<Bar name="Fees Collected" dataKey="fees" fill="var(--success)" />

</BarChart>

</ResponsiveContainer>

</div>

</div>

</div>

</div>

);

}