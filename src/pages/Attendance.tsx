import { useState, useEffect, useMemo } from 'react';
import './Attendance.css';
import { useAuth } from '../contexts/AuthContext';
import { UI_STRINGS } from '../constants';
import type { User, AttendanceRecord, AttendanceStatus, Batch } from '../types';
import { userService } from '../services/userService';
import { attendanceService } from '../services/attendanceService';
import { batchService } from '../services/batchService';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import {
    Calendar, ClipboardCheck, BarChart2, CheckCircle2, XCircle, Clock,
    Users, Search, Save, TrendingUp,
    ChevronLeft, ChevronRight, Percent, UserCheck
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import CustomSelect from '../components/CustomSelect';

/* ─────────────────────────────────────────────
   Attendance Page – Premium SaaS Dashboard
   ───────────────────────────────────────────── */
export default function AttendancePage() {
    const { currentUser } = useAuth()!;
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'mark' | 'calendar' | 'reports'>('mark');
    const [users, setUsers] = useState<User[]>([]);

    // Selectors
    const [selectedBatchId, setSelectedBatchId] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [batches, setBatches] = useState<Batch[]>([]);

    // Data
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>({});
    const [monthlyRecords, setMonthlyRecords] = useState<AttendanceRecord[]>([]);
    const [dailyStats, setDailyStats] = useState<Record<number, { present: number; absent: number; late: number; excused: number }>>({});

    /* ── Data Loading ─────────────────────────── */
    useEffect(() => { loadInitialData(); }, []);

    // Subscribe to batches in real-time
    useEffect(() => {
        const unsubscribe = batchService.subscribeToBatches((data) => {
            setBatches(data);
            if (data.length > 0 && !selectedBatchId) {
                setSelectedBatchId(data[0].id);
            }
        });
        return () => unsubscribe();
    }, [selectedBatchId]);

    const loadInitialData = async () => {
        try {
            setLoading(true);
            const fetchedUsers = await userService.fetchUsers();
            setUsers(fetchedUsers);
        } catch (err) {
            console.error(err);
            setError(UI_STRINGS.ATTENDANCE.ERROR_LOAD);
        } finally {
            setLoading(false);
        }
    };

    const activeBatches = useMemo(() => batches.filter(b => b.active !== false), [batches]);

    const batchOptions = useMemo(() => {
        const options = activeBatches.map(b => ({
            value: b.id,
            label: b.name
        }));
        
        // Find any unique batches among students that are not in activeBatches, and add them
        users.forEach(u => {
            if (u.batchId && u.batch) {
                const alreadyAdded = options.some(opt => opt.value === u.batchId);
                if (!alreadyAdded) {
                    options.push({
                        value: u.batchId,
                        label: `${u.batch} (Inactive)`
                    });
                }
            }
        });
        
        return options;
    }, [activeBatches, users]);

    useEffect(() => {
        if (!selectedBatchId && batchOptions.length > 0) {
            setSelectedBatchId(batchOptions[0].value);
        }
    }, [batchOptions, selectedBatchId]);

    useEffect(() => {
        if (selectedBatchId && selectedDate) {
            if (activeTab === 'mark') loadDailyAttendance();
            else if (activeTab === 'calendar') loadCalendarStats();
            else if (activeTab === 'reports') loadBatchAttendance();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedBatchId, selectedDate, activeTab]);

    const loadDailyAttendance = async () => {
        setLoading(true); setError(null); setSuccessMessage(null);
        try {
            const records = await attendanceService.fetchByBatchAndDate(selectedBatchId, new Date(selectedDate));
            const map: Record<string, AttendanceRecord> = {};
            records.forEach(r => { map[r.studentId] = r; });
            setAttendanceMap(map);
        } catch (err) { console.error(err); setError(UI_STRINGS.ATTENDANCE.ERROR_LOAD); }
        finally { setLoading(false); }
    };

    const loadCalendarStats = async () => {
        setLoading(true);
        try {
            const date = new Date(selectedDate);
            const stats = await attendanceService.fetchBatchDailyStats(selectedBatchId, date.getMonth(), date.getFullYear());
            setDailyStats(stats);
        } catch (err) { console.error(err); setError(UI_STRINGS.ATTENDANCE.ERROR_LOAD); }
        finally { setLoading(false); }
    };

    const loadBatchAttendance = async () => {
        setLoading(true);
        try {
            const records = await attendanceService.fetchByBatch(selectedBatchId);
            setMonthlyRecords(records);
        } catch (err) { console.error(err); setError(UI_STRINGS.ATTENDANCE.ERROR_LOAD); }
        finally { setLoading(false); }
    };

    /* ── Marking Logic ────────────────────────── */
    const handleMarkAll = (status: AttendanceStatus) => {
        const newMap = { ...attendanceMap };
        studentsInBatch.forEach(student => {
            if (!newMap[student.id]) {
                newMap[student.id] = {
                    id: '', studentId: student.id, studentName: student.name,
                    studentEmail: student.email.toLowerCase(),
                    courseId: '', courseName: '', batchId: selectedBatchId,
                    date: new Date(selectedDate), status, markedBy: currentUser!.uid, markedAt: new Date()
                };
            } else {
                newMap[student.id] = { ...newMap[student.id], status, markedBy: currentUser!.uid, studentEmail: student.email.toLowerCase() };
            }
        });
        setAttendanceMap(newMap);
    };

    const handleStudentMark = (student: User, status: AttendanceStatus) => {
        const newMap = { ...attendanceMap };
        if (newMap[student.id]) {
            newMap[student.id] = { ...newMap[student.id], status, markedBy: currentUser!.uid, studentEmail: student.email.toLowerCase() };
        } else {
            newMap[student.id] = {
                id: '', studentId: student.id, studentName: student.name,
                studentEmail: student.email.toLowerCase(),
                courseId: '', courseName: '', batchId: selectedBatchId,
                date: new Date(selectedDate), status, markedBy: currentUser!.uid, markedAt: new Date()
            };
        }
        setAttendanceMap(newMap);
    };

    const handleSubmitAttendance = async () => {
        const recordsToSave = Object.values(attendanceMap).filter(r => r.status);
        if (recordsToSave.length === 0) return;
        setSubmitting(true); setError(null); setSuccessMessage(null);
        try {
            await attendanceService.bulkSaveAttendance(recordsToSave, currentUser!.uid);
            showToast("Attendance submitted successfully", "success");
            await loadDailyAttendance();
        } catch (err) { console.error(err); setError(UI_STRINGS.ATTENDANCE.ERROR_SAVE); }
        finally { setSubmitting(false); }
    };

    /* ── Derived ──────────────────────────────── */
    const studentsInBatch = users.filter(u => u.batchId === selectedBatchId && !u.isBlocked);
    const totalChecked = Object.keys(attendanceMap).length;
    const presentCount = Object.values(attendanceMap).filter(r => r.status === 'present').length;
    const absentCount = Object.values(attendanceMap).filter(r => r.status === 'absent').length;
    const lateCount = Object.values(attendanceMap).filter(r => r.status === 'late').length;
    const attendancePercent = studentsInBatch.length > 0 ? Math.round((presentCount / studentsInBatch.length) * 100) : 0;
    const allMarked = totalChecked === studentsInBatch.length && studentsInBatch.length > 0;

    /* ── Skeleton Row ─────────────────────────── */
    const SkeletonRow = () => (
        <div className="att-row" style={{ opacity: 0.5 }}>
            <div className="att-row__index"><div className="skeleton-box" style={{ width: 20, height: 20 }} /></div>
            <div className="att-row__info"><div className="skeleton-box" style={{ width: 140, height: 16 }} /></div>
            <div className="att-row__email"><div className="skeleton-box" style={{ width: 160, height: 12 }} /></div>
            <div className="att-row__phone"><div className="skeleton-box" style={{ width: 100, height: 12 }} /></div>
            <div className="att-row__batch"><div className="skeleton-box" style={{ width: 80, height: 16 }} /></div>
            <div className="att-row__actions"><div className="skeleton-box" style={{ width: 240, height: 36 }} /></div>
        </div>
    );

    /* ── Status Pill ──────────────────────────── */
    const StatusPill = ({ student, status, label, icon: Icon, color }: { student: User; status: AttendanceStatus; label: string; icon: React.ElementType; color: string }) => {
        const isActive = attendanceMap[student.id]?.status === status;
        return (
            <button
                onClick={() => handleStudentMark(student, status)}
                className={`att-pill ${isActive ? `att-pill--${color}` : ''}`}
                title={label}
            >
                <Icon size={14} /> <span>{label}</span>
            </button>
        );
    };

    /* ══════════════════════════════════════════
       MARK TAB
       ══════════════════════════════════════════ */
    const renderMarkTab = () => (
        <div className="att-mark">
            {/* ── Summary Cards ── */}
            <div className="att-stats">
                {[
                    { label: 'Total Students', value: studentsInBatch.length, icon: Users, color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
                    { label: 'Present', value: presentCount, icon: CheckCircle2, color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
                    { label: 'Absent', value: absentCount, icon: XCircle, color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
                    { label: 'Late', value: lateCount, icon: Clock, color: 'primary', bg: 'rgba(var(--primary-rgb), 0.08)' },
                    { label: 'Attendance %', value: `${attendancePercent}%`, icon: Percent, color: '#06b6d4', bg: 'rgba(6,182,212,0.08)' }
                ].map((s, i) => (
                    <div key={i} className="att-stat-card" style={{ '--stat-color': s.color, '--stat-bg': s.bg } as React.CSSProperties}>
                        <div className="att-stat-card__icon"><s.icon size={22} /></div>
                        <div className="att-stat-card__body">
                            <span className="att-stat-card__value">{s.value}</span>
                            <span className="att-stat-card__label">{s.label}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Board Header ── */}
            <div className="att-board">
                <div className="att-board__header">
                    <div className="att-board__title-group">
                        <ClipboardCheck size={20} className="att-board__icon" />
                        <div>
                            <h2 className="att-board__title">Attendance Board</h2>
                            <p className="att-board__subtitle">
                                {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                {' · '}<span style={{ color: 'var(--primary)' }}>{selectedBatchId}</span>
                            </p>
                        </div>
                    </div>
                    <div className="att-board__actions">
                        <button onClick={() => handleMarkAll('present')} className="att-bulk-btn att-bulk-btn--green">
                            <CheckCircle2 size={16} /> Mark All Present
                        </button>
                        <button onClick={() => handleMarkAll('absent')} className="att-bulk-btn att-bulk-btn--red">
                            <XCircle size={16} /> Mark All Absent
                        </button>
                    </div>
                </div>

                {/* ── Table Header ── */}
                <div className="att-table-head">
                    <div className="att-table-head__col att-table-head__col--idx">#</div>
                    <div className="att-table-head__col att-table-head__col--name">Student Name</div>
                    <div className="att-table-head__col att-table-head__col--email">Email / ID</div>
                    <div className="att-table-head__col att-table-head__col--phone">Mobile</div>
                    <div className="att-table-head__col att-table-head__col--batch">Batch</div>
                    <div className="att-table-head__col att-table-head__col--status">Status</div>
                </div>

                {/* ── Rows ── */}
                <div className="att-table-body">
                    {loading && studentsInBatch.length === 0 ? (
                        Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                    ) : studentsInBatch.length === 0 ? (
                        <div className="att-empty">
                            <Users size={56} />
                            <h3>No Students Found</h3>
                            <p>Select a different batch to view students.</p>
                        </div>
                    ) : (
                        studentsInBatch.map((student, idx) => {
                            const rec = attendanceMap[student.id];
                            const statusColor = rec?.status === 'present' ? '#22c55e' : rec?.status === 'absent' ? '#ef4444' : rec?.status === 'late' ? 'var(--primary)' : 'transparent';
                            return (
                                <div key={student.id} className="att-row" style={{ animationDelay: `${idx * 30}ms` }}>
                                    <div className="att-row__index">
                                        <span className="att-row__num" style={{ borderColor: statusColor !== 'transparent' ? statusColor : undefined }}>{idx + 1}</span>
                                    </div>
                                    <div className="att-row__info">
                                        <span className="att-row__name">{student.name}</span>
                                    </div>
                                    <div className="att-row__email">{student.email}</div>
                                    <div className="att-row__phone" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{student.phone || 'N/A'}</div>
                                    <div className="att-row__batch">
                                        <span style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-blue)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                                            {student.batch}
                                        </span>
                                    </div>
                                    <div className="att-row__actions">
                                        <div className="att-pill-group">
                                            <StatusPill student={student} status="present" label="Present" icon={CheckCircle2} color="green" />
                                            <StatusPill student={student} status="absent" label="Absent" icon={XCircle} color="red" />
                                            <StatusPill student={student} status="late" label="Late" icon={Clock} color="primary" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── Sticky Bottom Bar ── */}
            {studentsInBatch.length > 0 && (
                <div className="att-bottom-bar">
                    <div className="att-bottom-bar__left">
                        <span className="att-bottom-bar__progress">
                            <UserCheck size={16} style={{ color: 'var(--primary)' }} />
                            <strong style={{ color: allMarked ? '#22c55e' : 'var(--primary)' }}>{totalChecked}</strong> of {studentsInBatch.length} marked
                        </span>
                    </div>
                    <button
                        onClick={handleSubmitAttendance}
                        disabled={submitting || totalChecked === 0}
                        className="att-submit-btn"
                    >
                        {submitting ? (
                            <><div className="att-spinner" /> Saving...</>
                        ) : (
                            <><Save size={18} /> Save Attendance</>
                        )}
                    </button>
                </div>
            )}
        </div>
    );

    /* ══════════════════════════════════════════
       CALENDAR TAB
       ══════════════════════════════════════════ */
    const renderCalendarTab = () => {
        const current = new Date(selectedDate);
        const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
        const startDay = new Date(current.getFullYear(), current.getMonth(), 1).getDay();

        return (
            <div className="att-calendar">
                <div className="att-calendar__header">
                    <div className="att-calendar__title-row">
                        <Calendar size={22} style={{ color: 'var(--primary)' }} />
                        <h2 className="att-board__title">{current.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                        <span className="att-badge">{selectedBatchId}</span>
                    </div>
                    <div className="att-calendar__nav">
                        <button className="att-nav-btn" onClick={() => {
                            const d = new Date(current); d.setMonth(d.getMonth() - 1);
                            setSelectedDate(d.toISOString().split('T')[0]);
                        }}><ChevronLeft size={18} /></button>
                        <button className="att-nav-btn" onClick={() => {
                            const d = new Date(current); d.setMonth(d.getMonth() + 1);
                            setSelectedDate(d.toISOString().split('T')[0]);
                        }}><ChevronRight size={18} /></button>
                    </div>
                </div>

                <div className="att-cal-grid">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="att-cal-day-label">{d}</div>
                    ))}
                    {Array.from({ length: startDay }).map((_, i) => <div key={`p-${i}`} />)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const stats = dailyStats[day];
                        const hasData = !!stats;
                        let level = '';
                        if (hasData) {
                            const total = stats.present + stats.absent + stats.late;
                            const perc = total > 0 ? (stats.present / total) * 100 : 0;
                            level = perc >= 90 ? 'high' : perc >= 75 ? 'mid' : 'low';
                        }
                        return (
                            <div
                                key={day}
                                className={`att-cal-cell ${hasData ? `att-cal-cell--${level}` : ''}`}
                                onClick={() => {
                                    const d = new Date(current); d.setDate(day);
                                    setSelectedDate(d.toISOString().split('T')[0]);
                                    setActiveTab('mark');
                                }}
                            >
                                <span className="att-cal-cell__day">{day}</span>
                                {hasData && (
                                    <div className="att-cal-cell__tooltip">
                                        <span style={{ color: '#22c55e' }}>P:{stats.present}</span>
                                        <span style={{ color: '#ef4444' }}>A:{stats.absent}</span>
                                        {stats.late > 0 && <span style={{ color: '#eab308' }}>L:{stats.late}</span>}
                                    </div>
                                )}
                                {hasData && (
                                    <div className="att-cal-cell__bars">
                                        <div className="att-cal-bar att-cal-bar--green" />
                                        {stats.absent > 0 && <div className="att-cal-bar att-cal-bar--red" />}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="att-calendar__legend">
                    <span><i className="att-legend-dot att-legend-dot--green" /> 90%+ Present</span>
                    <span><i className="att-legend-dot att-legend-dot--yellow" /> 75–90%</span>
                    <span><i className="att-legend-dot att-legend-dot--red" /> Below 75%</span>
                </div>
            </div>
        );
    };

    /* ══════════════════════════════════════════
       REPORTS TAB
       ══════════════════════════════════════════ */
    const renderReportsTab = () => {
        interface StudentReportData {
            id: string;
            name: string;
            batch: string;
            present: number;
            absent: number;
            late: number;
            excused: number;
            percentage: number;
        }

        const studentStats: StudentReportData[] = studentsInBatch.map(student => {
            const recs = monthlyRecords.filter(r => r.studentId === student.id);
            const present = recs.filter(r => r.status === 'present').length;
            const late = recs.filter(r => r.status === 'late').length;
            const absent = recs.filter(r => r.status === 'absent').length;
            const excused = recs.filter(r => r.status === 'excused').length;
            const totalCounted = present + late + absent;
            const percentage = totalCounted > 0 ? Math.round(((present + late) / totalCounted) * 100) : 0;
            return { id: student.id, name: student.name, batch: student.batch, present, absent, late, excused, percentage };
        });

        const columns: Column<StudentReportData>[] = [
            { key: 'name', header: 'Student', sortable: true },
            { key: 'present', header: 'Present', sortable: true, align: 'center' },
            { key: 'absent', header: 'Absent', sortable: true, align: 'center' },
            { key: 'late', header: 'Late', sortable: true, align: 'center' },
            {
                key: 'percentage', header: 'Attendance %', sortable: true, align: 'right',
                render: (val) => (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
                        <div className="att-progress-track">
                            <div className="att-progress-fill" style={{
                                width: `${val.percentage}%`,
                                background: Number(val.percentage) >= 85 ? '#22c55e' : Number(val.percentage) >= 75 ? '#eab308' : '#ef4444'
                            }} />
                        </div>
                        <span style={{ fontWeight: 700, minWidth: 40, color: Number(val.percentage) >= 85 ? '#22c55e' : Number(val.percentage) >= 75 ? '#eab308' : '#ef4444' }}>{val.percentage}%</span>
                    </div>
                )
            }
        ];

        const avg = studentStats.length > 0 ? Math.round(studentStats.reduce((a, s) => a + s.percentage, 0) / studentStats.length) : 0;

        return (
            <div className="att-reports">
                <div className="att-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                    <div className="att-stat-card" style={{ '--stat-color': avg >= 85 ? '#22c55e' : avg >= 75 ? '#eab308' : '#ef4444', '--stat-bg': avg >= 85 ? 'rgba(34,197,94,0.08)' : avg >= 75 ? 'rgba(234,179,8,0.08)' : 'rgba(239,68,68,0.08)' } as React.CSSProperties}>
                        <div className="att-stat-card__icon"><TrendingUp size={22} /></div>
                        <div className="att-stat-card__body">
                            <span className="att-stat-card__value">{avg}%</span>
                            <span className="att-stat-card__label">Average Attendance</span>
                        </div>
                    </div>
                    <div className="att-stat-card" style={{ '--stat-color': '#6366f1', '--stat-bg': 'rgba(99,102,241,0.08)' } as React.CSSProperties}>
                        <div className="att-stat-card__icon"><Users size={22} /></div>
                        <div className="att-stat-card__body">
                            <span className="att-stat-card__value">{studentStats.length}</span>
                            <span className="att-stat-card__label">Total Students</span>
                        </div>
                    </div>
                </div>

                <div className="att-board">
                    <div className="att-board__header">
                        <div className="att-board__title-group">
                            <BarChart2 size={20} className="att-board__icon" />
                            <div>
                                <h2 className="att-board__title">Student Reports</h2>
                                <p className="att-board__subtitle">Individual attendance breakdown for {selectedBatchId}</p>
                            </div>
                        </div>
                    </div>
                    <div style={{ padding: 4 }}>
                        <DataTable
                            data={studentStats}
                            columns={columns}
                            keyExtractor={(item) => item.id}
                            searchPlaceholder="Search students..."
                            searchable
                            emptyMessage={UI_STRINGS.ATTENDANCE.EMPTY}
                            pageSize={10}
                        />
                    </div>
                </div>
            </div>
        );
    };

    /* ══════════════════════════════════════════
       RENDER
       ══════════════════════════════════════════ */
    if (!currentUser) return null;
    if (loading && !users.length) return <LoadingState message={UI_STRINGS.ATTENDANCE.LOADING} />;

    return (
        <div className="att-page fade-in">
            {/* ── Page Title ── */}
            <div className="att-page-header">
                <div>
                    <h1 className="att-page-header__title">Attendance Management</h1>
                    <p className="att-page-header__sub">Track, manage, and analyze student attendance across all courses.</p>
                </div>
            </div>

            {error && <ErrorAlert message={error} />}
            {successMessage && (
                <div className="att-toast-success"><CheckCircle2 size={18} /> {successMessage}</div>
            )}

            {/* ── Sticky Control Bar ── */}
            <div className="att-control-bar">
                <div className="att-control-bar__filters">
                    <div className="att-select-group">
                        <label>Batch</label>
                        <CustomSelect
                            options={batchOptions}
                            value={selectedBatchId}
                            onChange={(val) => setSelectedBatchId(val)}
                            searchable={true}
                        />
                    </div>
                    <div className="att-select-group">
                        <label>Date</label>
                        <input
                            type="date" className="att-date-input"
                            value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                        />
                    </div>
                    <button onClick={() => loadDailyAttendance()} className="att-search-btn" title="Load">
                        <Search size={18} />
                    </button>
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="att-tabs">
                {([
                    { id: 'mark', label: 'Mark Attendance', icon: ClipboardCheck },
                    { id: 'calendar', label: 'Calendar View', icon: Calendar },
                    { id: 'reports', label: 'Reports', icon: BarChart2 }
                ] as const).map(tab => (
                    <button
                        key={tab.id}
                        className={`att-tab ${activeTab === tab.id ? 'att-tab--active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <tab.icon size={16} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Content ── */}
            <div className="att-content">
                {activeTab === 'mark' && renderMarkTab()}
                {activeTab === 'calendar' && renderCalendarTab()}
                {activeTab === 'reports' && renderReportsTab()}
            </div>
        </div>
    );
}
