import { useState, useEffect } from 'react';
import { CheckCircle, BookOpen } from 'lucide-react';
import { UI_STRINGS } from '../constants';
import { progressService } from '../services/progressService';
import type { StudentProgress } from '../types';
import LoadingState from '../components/LoadingState';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';

type ProgressEntry = StudentProgress & { courseName?: string };

export default function ProgressPage() {
    const [progressData, setProgressData] = useState<ProgressEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const data = await progressService.fetchProgress();
                setProgressData(data as ProgressEntry[]);
            } catch (err) {
                console.error("Error fetching progress:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) return <LoadingState message={UI_STRINGS.PROGRESS.LOADING} />;

    // Group progress by User
    const usersProgress = progressData.reduce((acc, curr) => {
        if (!acc[curr.userId]) {
            acc[curr.userId] = {
                userName: curr.userName || UI_STRINGS.PROGRESS.UNKNOWN_STUDENT,
                courses: []
            };
        }
        acc[curr.userId].courses.push(curr);
        return acc;
    }, {} as Record<string, { userName: string, courses: ProgressEntry[] }>);

    const userEntries = Object.values(usersProgress);

    return (
        <div>
            <PageHeader
                title={UI_STRINGS.PROGRESS.TITLE}
                subtitle={UI_STRINGS.PROGRESS.SUBTITLE}
            />

            <div className="grid-single">
                {userEntries.map((user, idx) => (
                    <div key={idx} className="card">
                        <div className="flex justify-between items-start mb-md border-b border-divider pb-3">
                            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{user.userName}</h3>
                            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                                View Full Profile
                            </button>
                        </div>

                        {user.courses.length === 0 ? (
                            <p className="text-sm text-muted">No course progress data available.</p>
                        ) : (
                            <div className="grid-cards-sm mt-md" style={{ gap: 'var(--space-md)' }}>
                                {user.courses.map((courseProgress, cIdx) => (
                                    <div key={cIdx} className="bg-secondary/20 rounded-lg p-4 border border-divider">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="bg-primary/10 p-2 rounded-full text-primary">
                                                <BookOpen size={16} />
                                            </div>
                                            <h4 className="font-medium">{courseProgress.courseName || 'Unnamed Course'}</h4>
                                        </div>
                                        
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2 text-sm text-muted">
                                                <CheckCircle size={14} color="var(--success)" />
                                                <span className="font-semibold text-text">{courseProgress.completedModules?.length || 0}</span> modules completed
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {userEntries.length === 0 && (
                    <EmptyState message={UI_STRINGS.PROGRESS.EMPTY} />
                )}
            </div>
        </div>
    );
}