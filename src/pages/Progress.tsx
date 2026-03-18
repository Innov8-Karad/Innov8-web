import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CheckCircle } from 'lucide-react';
import { UI_STRINGS } from '../constants';

interface StudentProgress {
    userId: string;
    userName?: string;
    attendance: number;
    overallScore: number;
    currentModule: string;
    completedModules: string[];
}

export default function ProgressPage() {
    const [progressData, setProgressData] = useState<StudentProgress[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                const [progressSnap, usersSnap] = await Promise.all([
                    getDocs(collection(db, "progress")),
                    getDocs(collection(db, "users"))
                ]);

                const usersMap = new Map();
                usersSnap.docs.forEach(doc => usersMap.set(doc.id, doc.data().name));

                const data = progressSnap.docs.map(doc => ({
                    userId: doc.id,
                    userName: usersMap.get(doc.id) || "Unknown Student",
                    ...doc.data()
                } as StudentProgress));

                setProgressData(data);
            } catch (err) {
                console.error("Error fetching progress:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-full">
            <div className="animate-pulse text-secondary">{UI_STRINGS.PROGRESS.LOADING}</div>
        </div>
    );

    return (
        <div>
            <div style={{ marginBottom: 'var(--space-lg)' }}>
                <h1>{UI_STRINGS.PROGRESS.TITLE}</h1>
                <p>{UI_STRINGS.PROGRESS.SUBTITLE}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-md)' }}>
                {progressData.map(p => (
                    <div key={p.userId} className="card">
                        <div className="flex justify-between items-start" style={{ marginBottom: 'var(--space-md)' }}>
                            <div>
                                <h3 style={{ margin: 0 }}>{p.userName}</h3>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-lg)' }}>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2" style={{ fontSize: '0.85rem' }}>
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
                    <div className="card text-center" style={{ padding: 'var(--space-xl)' }}>
                        <p>{UI_STRINGS.PROGRESS.EMPTY}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
 