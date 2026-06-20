import { useState, useEffect, useCallback, useMemo } from 'react';
import './Attendance.css';
import { ClipboardCheck, CalendarDays, BarChart3, CheckCircle2, XCircle, Users } from 'lucide-react';
import { attendanceService, type AttendanceStudentRow } from '../services/attendanceService';
import { batchService } from '../services/batchService';
import { userService } from '../services/userService';
import type { Batch } from '../types';
import { UI_STRINGS } from '../constants';
import { useToast } from '../hooks/useToast';
import LoadingState from '../components/LoadingState';
import SearchInput from '../components/SearchInput';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthlyStudentSummary {
    studentId: string;
    studentName: string;
    studentEmail: string;
    present: number;
    absent: number;
    total: number;
    percentage: number;
}

function pctClass(pct: number): string {
    if (pct >= 75) return 'green';
    if (pct >= 50) return 'amber';
    return 'red';
}

function todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function currentMonthStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AttendancePage() {
    const { showToast } = useToast();

    // ── View Mode ──────────────────────────────────────────────────────────────
    const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');

    // ── Shared state ───────────────────────────────────────────────────────────
    const [batches, setBatches] = useState<Batch[]>([]);
    const [selectedBatchId, setSelectedBatchId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // ── Daily View state ───────────────────────────────────────────────────────
    const [selectedDate, setSelectedDate] = useState(todayStr());
    const [studentRows, setStudentRows] = useState<AttendanceStudentRow[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [saving, setSaving] = useState(false);

    // ── Monthly View state ─────────────────────────────────────────────────────
    const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());
    const [monthlyData, setMonthlyData] = useState<MonthlyStudentSummary[]>([]);
    const [loadingMonthly, setLoadingMonthly] = useState(false);

    // ── Load batches once ──────────────────────────────────────────────────────
    useEffect(() => {
        batchService.fetchBatches().then(setBatches).catch(console.error);
    }, []);

    // ── Daily: load students + existing attendance when batch/date changes ─────
    useEffect(() => {
        if (!selectedBatchId || viewMode !== 'daily') return;

        let unsub: (() => void) | null = null;

        async function loadDailyData() {
            setLoadingStudents(true);
            try {
                const students = await userService.fetchUsersByBatch(selectedBatchId);

                const dateObj = new Date(selectedDate + 'T00:00:00');

                // Subscribe to existing records for this batch+date
                unsub = attendanceService.subscribeToAttendance(
                    selectedBatchId,
                    dateObj,
                    (records) => {
                        const recordMap: Record<string, 'present' | 'absent'> = {};
                        records.forEach((r) => { recordMap[r.studentId] = r.status; });

                        setStudentRows(
                            students.map((s) => ({
                                studentId: s.id,
                                studentName: s.name,
                                studentEmail: s.email,
                                status: recordMap[s.id] ?? 'present', // default to present
                            }))
                        );
                        setLoadingStudents(false);
                    }
                );
            } catch (err) {
                console.error('Failed to load students/attendance:', err);
                setLoadingStudents(false);
            }
        }

        loadDailyData();

        return () => { unsub?.(); };
    }, [selectedBatchId, selectedDate, viewMode]);

    // ── Monthly: load data when batch/month changes ────────────────────────────
    useEffect(() => {
        if (!selectedBatchId || viewMode !== 'monthly') return;

        async function loadMonthlyData() {
            setLoadingMonthly(true);
            try {
                const [year, month] = selectedMonth.split('-').map(Number);
                const records = await attendanceService.fetchMonthlyAttendance(selectedBatchId, year, month - 1);

                // Group by student
                const studentMap: Record<string, MonthlyStudentSummary> = {};
                records.forEach((r) => {
                    if (!studentMap[r.studentId]) {
                        studentMap[r.studentId] = {
                            studentId: r.studentId,
                            studentName: r.studentName,
                            studentEmail: r.studentEmail,
                            present: 0,
                            absent: 0,
                            total: 0,
                            percentage: 0,
                        };
                    }
                    studentMap[r.studentId].total++;
                    if (r.status === 'present') studentMap[r.studentId].present++;
                    else studentMap[r.studentId].absent++;
                });

                const summaries = Object.values(studentMap).map((s) => ({
                    ...s,
                    percentage: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
                }));

                summaries.sort((a, b) => a.studentName.localeCompare(b.studentName));
                setMonthlyData(summaries);
            } catch (err) {
                console.error('Failed to load monthly attendance:', err);
                showToast(UI_STRINGS.ATTENDANCE.ERROR_LOAD, 'error');
            } finally {
                setLoadingMonthly(false);
            }
        }

        loadMonthlyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedBatchId, selectedMonth, viewMode]);


    // ── Daily: Set single row status ──────────────────────────────────────────
    const setRowStatus = useCallback((studentId: string, status: 'present' | 'absent') => {
        setStudentRows((prev) =>
            prev.map((r) =>
                r.studentId === studentId
                    ? { ...r, status }
                    : r
            )
        );
    }, []);

    // ── Daily: Save attendance ─────────────────────────────────────────────────
    const handleSave = useCallback(async () => {
        if (!selectedBatchId) return;
        const batch = batches.find((b) => b.id === selectedBatchId);
        if (!batch) return;

        setSaving(true);
        try {
            await attendanceService.markAttendance(
                studentRows,
                selectedBatchId,
                batch.name,
                new Date(selectedDate + 'T00:00:00')
            );
            showToast(UI_STRINGS.ATTENDANCE.SAVE_SUCCESS, 'success');
        } catch (err) {
            console.error('Save failed:', err);
            showToast(UI_STRINGS.ATTENDANCE.ERROR_SAVE, 'error');
        } finally {
            setSaving(false);
        }
    }, [selectedBatchId, batches, studentRows, selectedDate, showToast]);

    // ── Filtered rows (daily) ──────────────────────────────────────────────────
    const filteredRows = useMemo(
        () =>
            studentRows.filter(
                (r) =>
                    r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    r.studentEmail.toLowerCase().includes(searchTerm.toLowerCase())
            ),
        [studentRows, searchTerm]
    );

    // ── Filtered monthly summaries ─────────────────────────────────────────────
    const filteredMonthly = useMemo(
        () =>
            monthlyData.filter(
                (s) =>
                    s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    s.studentEmail.toLowerCase().includes(searchTerm.toLowerCase())
            ),
        [monthlyData, searchTerm]
    );

    // ── Daily Stat Cards ───────────────────────────────────────────────────────
    const dailyStats = useMemo(() => {
        const present = studentRows.filter((r) => r.status === 'present').length;
        const absent = studentRows.filter((r) => r.status === 'absent').length;
        const total = studentRows.length;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;
        return { present, absent, total, rate };
    }, [studentRows]);

    // ── Monthly Stat Cards ─────────────────────────────────────────────────────
    const monthlyStats = useMemo(() => {
        const classDays = monthlyData.length > 0 ? monthlyData[0].total : 0;
        const avgRate =
            monthlyData.length > 0
                ? Math.round(monthlyData.reduce((s, m) => s + m.percentage, 0) / monthlyData.length)
                : 0;
        const lowCount = monthlyData.filter((m) => m.percentage < 75).length;
        return { classDays, avgRate, lowCount };
    }, [monthlyData]);

    // ─── Render ────────────────────────────────────────────────────────────────
    const selectedBatch = batches.find((b) => b.id === selectedBatchId);

    return (
        <div className="page-container">
            <PageHeader
                title={UI_STRINGS.ATTENDANCE.TITLE}
                subtitle={UI_STRINGS.ATTENDANCE.SUBTITLE}
            >
                {/* ── View Toggle ── */}
                <div className="att-toggle" style={{ margin: 0 }}>
                    <button
                        id="att-view-daily"
                        className={`att-toggle-btn ${viewMode === 'daily' ? 'active' : ''}`}
                        onClick={() => { setViewMode('daily'); setSearchTerm(''); }}
                    >
                        <CalendarDays size={15} />
                        {UI_STRINGS.ATTENDANCE.VIEW_DAILY}
                    </button>
                    <button
                        id="att-view-monthly"
                        className={`att-toggle-btn ${viewMode === 'monthly' ? 'active' : ''}`}
                        onClick={() => { setViewMode('monthly'); setSearchTerm(''); }}
                    >
                        <BarChart3 size={15} />
                        {UI_STRINGS.ATTENDANCE.VIEW_MONTHLY}
                    </button>
                </div>
            </PageHeader>

            {/* ── Stat Cards ── */}
            {viewMode === 'daily' && selectedBatchId && studentRows.length > 0 && (
                <div className="grid-cards-wide" style={{ marginBottom: 24 }}>
                    <StatCard
                        title={UI_STRINGS.ATTENDANCE.STAT_PRESENT}
                        value={dailyStats.present.toString()}
                        icon={CheckCircle2}
                        color="success"
                        bordered
                    />
                    <StatCard
                        title={UI_STRINGS.ATTENDANCE.STAT_ABSENT}
                        value={dailyStats.absent.toString()}
                        icon={XCircle}
                        color="error"
                        bordered
                    />
                    <StatCard
                        title={UI_STRINGS.ATTENDANCE.STAT_RATE}
                        value={`${dailyStats.rate}%`}
                        icon={Users}
                        color="accent-blue"
                        bordered
                    />
                </div>
            )}

            {viewMode === 'monthly' && selectedBatchId && monthlyData.length > 0 && (
                <div className="grid-cards-wide" style={{ marginBottom: 24 }}>
                    <StatCard
                        title={UI_STRINGS.ATTENDANCE.STAT_TOTAL_DAYS}
                        value={monthlyStats.classDays.toString()}
                        icon={CalendarDays}
                        color="accent-blue"
                        bordered
                    />
                    <StatCard
                        title={UI_STRINGS.ATTENDANCE.STAT_AVG_RATE}
                        value={`${monthlyStats.avgRate}%`}
                        icon={CheckCircle2}
                        color="success"
                        bordered
                    />
                    <StatCard
                        title={UI_STRINGS.ATTENDANCE.STAT_LOW_ATTENDANCE}
                        value={monthlyStats.lowCount.toString()}
                        icon={XCircle}
                        color="error"
                        bordered
                    />
                </div>
            )}

            {/* ── Table Card ── */}
            <div className="card table-card" style={{ overflow: 'hidden', padding: 0 }}>
                {/* ── unified Toolbar ── */}
                <div className="att-card-toolbar">
                    <div className="att-toolbar-left">
                        <select
                            id="att-batch-select"
                            value={selectedBatchId}
                            onChange={(e) => setSelectedBatchId(e.target.value)}
                        >
                            <option value="">{UI_STRINGS.ATTENDANCE.SELECT_BATCH_PLACEHOLDER}</option>
                            {batches.map((b) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>

                        {selectedBatchId && (
                            viewMode === 'daily' ? (
                                <input
                                    id="att-date-picker"
                                    type="date"
                                    value={selectedDate}
                                    max={todayStr()}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                />
                            ) : (
                                <input
                                    id="att-month-picker"
                                    type="month"
                                    value={selectedMonth}
                                    max={currentMonthStr()}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                />
                            )
                        )}
                    </div>

                    {selectedBatchId && (
                        <div className="att-toolbar-middle">
                            <SearchInput
                                placeholder={UI_STRINGS.ATTENDANCE.SEARCH}
                                value={searchTerm}
                                onChange={setSearchTerm}
                            />
                        </div>
                    )}

                    <div className="att-toolbar-right">
                        {viewMode === 'daily' && selectedBatchId && studentRows.length > 0 && (
                            <button
                                id="att-save-btn"
                                className="att-btn-save"
                                onClick={handleSave}
                                disabled={saving}
                                style={{ margin: 0 }}
                            >
                                {saving ? UI_STRINGS.ATTENDANCE.SAVING : UI_STRINGS.ATTENDANCE.SAVE_ATTENDANCE}
                            </button>
                        )}
                    </div>
                </div>

                {/* ─ No Batch Selected ─ */}
                {!selectedBatchId && (
                    <div className="att-empty-state">
                        <ClipboardCheck size={48} />
                        <p>{UI_STRINGS.ATTENDANCE.EMPTY_NO_BATCH}</p>
                    </div>
                )}

                {/* ─ Daily View Table ─ */}
                {viewMode === 'daily' && selectedBatchId && (
                    <>
                        {loadingStudents ? (
                            <LoadingState message={UI_STRINGS.ATTENDANCE.LOADING} />
                        ) : studentRows.length === 0 ? (
                            <div className="att-empty-state">
                                <Users size={48} />
                                <p>{UI_STRINGS.ATTENDANCE.EMPTY_NO_STUDENTS}</p>
                            </div>
                        ) : (
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 48 }}>{UI_STRINGS.ATTENDANCE.TH_NO}</th>
                                        <th>{UI_STRINGS.ATTENDANCE.TH_NAME}</th>
                                        <th>{UI_STRINGS.ATTENDANCE.TH_EMAIL}</th>
                                        <th style={{ width: 220, textAlign: 'center' }}>Mark Attendance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRows.map((row, idx) => (
                                        <tr key={row.studentId}>
                                            <td className="text-muted text-sm">{idx + 1}</td>
                                            <td>
                                                <span className="font-medium">{row.studentName}</span>
                                            </td>
                                            <td className="text-muted text-sm">{row.studentEmail}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div className="att-btn-group" style={{ display: 'inline-flex' }}>
                                                    <button
                                                        type="button"
                                                        className={`att-btn-option present ${row.status === 'present' ? 'active' : ''}`}
                                                        onClick={() => setRowStatus(row.studentId, 'present')}
                                                    >
                                                        Present
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`att-btn-option absent ${row.status === 'absent' ? 'active' : ''}`}
                                                        onClick={() => setRowStatus(row.studentId, 'absent')}
                                                    >
                                                        Absent
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        {selectedBatch && (
                            <div style={{ padding: '12px 20px', fontSize: 12, color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
                                Showing {filteredRows.length} of {studentRows.length} students in <strong>{selectedBatch.name}</strong>
                            </div>
                        )}
                    </>
                )}

                {/* ─ Monthly Report Table ─ */}
                {viewMode === 'monthly' && selectedBatchId && (
                    <>
                        {loadingMonthly ? (
                            <LoadingState message={UI_STRINGS.ATTENDANCE.LOADING} />
                        ) : monthlyData.length === 0 ? (
                            <div className="att-empty-state">
                                <BarChart3 size={48} />
                                <p>{UI_STRINGS.ATTENDANCE.EMPTY_NO_RECORDS}</p>
                            </div>
                        ) : (
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 48 }}>{UI_STRINGS.ATTENDANCE.TH_NO}</th>
                                        <th>{UI_STRINGS.ATTENDANCE.TH_NAME}</th>
                                        <th>{UI_STRINGS.ATTENDANCE.TH_EMAIL}</th>
                                        <th style={{ textAlign: 'center' }}>{UI_STRINGS.ATTENDANCE.TH_PRESENT}</th>
                                        <th style={{ textAlign: 'center' }}>{UI_STRINGS.ATTENDANCE.TH_ABSENT}</th>
                                        <th style={{ textAlign: 'center' }}>{UI_STRINGS.ATTENDANCE.TH_TOTAL}</th>
                                        <th style={{ textAlign: 'center' }}>{UI_STRINGS.ATTENDANCE.TH_PERCENTAGE}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMonthly.map((s, idx) => (
                                        <tr key={s.studentId}>
                                            <td className="text-muted text-sm">{idx + 1}</td>
                                            <td><span className="font-medium">{s.studentName}</span></td>
                                            <td className="text-muted text-sm">{s.studentEmail}</td>
                                            <td style={{ textAlign: 'center', color: '#10B981', fontWeight: 700 }}>{s.present}</td>
                                            <td style={{ textAlign: 'center', color: '#EF4444', fontWeight: 700 }}>{s.absent}</td>
                                            <td style={{ textAlign: 'center' }}>{s.total}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className={`att-pct-pill ${pctClass(s.percentage)}`}>
                                                    {s.percentage}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        {monthlyData.length > 0 && (
                            <div style={{ padding: '12px 20px', fontSize: 12, color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
                                {filteredMonthly.length} students · Read-only monthly summary
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
