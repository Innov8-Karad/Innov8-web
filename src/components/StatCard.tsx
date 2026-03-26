import { TrendingUp } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ElementType;
    color: string;
    trend?: string;
    loading?: boolean;
    bordered?: boolean;
}

export default function StatCard({ title, value, icon: Icon, color, trend, loading, bordered }: StatCardProps) {
    const colorVar = `var(--${color})`;
    const rgbVar = `var(--${color}-rgb)`;

    return (
        <div
            className={`card stat-card-hover ${bordered ? 'stat-card-bordered' : ''}`}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'default',
                ...(bordered ? { borderLeftColor: colorVar, boxShadow: `0 4px 12px rgba(${rgbVar}, 0.1)` } : {})
            }}
        >
            <div>
                <p className="stat-label">{title}</p>
                {loading ? (
                    <div className="animate-pulse" style={{ height: '32px', width: '100px', backgroundColor: 'var(--bg-card-accent)', borderRadius: '4px', marginBottom: '4px' }} />
                ) : (
                    <h3 className="stat-value" style={bordered ? { color: colorVar } : undefined}>{value}</h3>
                )}
                {trend && (
                    <div className="stat-trend">
                        <TrendingUp size={12} /> {trend}
                    </div>
                )}
            </div>
            <div
                className="stat-icon"
                style={{
                    backgroundColor: `rgba(${rgbVar}, 0.1)`,
                    color: colorVar,
                    border: `1px solid rgba(${rgbVar}, 0.2)`
                }}
            >
                <Icon size={24} />
            </div>
        </div>
    );
}
