import { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { UI_STRINGS } from '../constants';
import { progressService } from '../services/progressService';
import type { StudentProgress } from '../types';
import LoadingState from '../components/LoadingState';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';

export default function ProgressPage() {
    const [progressData, setProgressData] = useState<StudentProgress[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const data = await progressService.fetchProgress();
                setProgressData(data);
            } catch (err) {
                console.error("Error fetching progress:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) return <LoadingState message={UI_STRINGS.PROGRESS.LOADING} />;

    return (
        <div>
            <PageHeader
                title={UI_STRINGS.PROGRESS.TITLE}
                subtitle={UI_STRINGS.PROGRESS.SUBTITLE}
            />

            <div className="grid-single">
                {progressData.map(p => (
                    <div key={p.userId} className="card">
                        <div className="flex justify-between items-start mb-md">
                            <h3 style={{ margin: 0 }}>{p.userName}</h3>
                        </div>

                        <div className="grid-cards-sm" style={{ gap: 'var(--space-lg)' }}>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <CheckCircle size={16} color="var(--success)" />
                                    {p.completedModules?.length || 0} {UI_STRINGS.PROGRESS.MODULES_COMPLETED}
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                                    {UI_STRINGS.PROGRESS.VIEW_REPORT}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {progressData.length === 0 && (
                    <EmptyState message={UI_STRINGS.PROGRESS.EMPTY} />
                )}
            </div>
        </div>
    );
}