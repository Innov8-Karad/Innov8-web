import { useState, useEffect, useMemo } from 'react';
import { 
  Award,
  TrendingUp,
  CheckCircle, 
  XCircle, 
  Clock,
  BookOpen
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import SearchInput from '../components/SearchInput';
import EmptyState from '../components/EmptyState';
import { examResultService, type EnrichedExamResult } from '../services/examResultService';
import { examService } from '../services/examService';
import type { Exam } from '../types';
import { UI_STRINGS } from '../constants';
import Avatar from '../components/Avatar';

const COLORS = ['#10B981', '#EF4444']; // Green for Pass, Red for Fail

export default function ExamResultsPage() {
  const [results, setResults] = useState<EnrichedExamResult[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [selectedExamId, setSelectedExamId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [passThreshold, setPassThreshold] = useState<number>(35);
  const [activeTab, setActiveTab] = useState<'by-exam' | 'by-student'>('by-exam');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [allResults, allExams] = await Promise.all([
        examResultService.fetchAllResults(),
        examService.fetchExams()
      ]);
      setResults(allResults);
      setExams(allExams);
    } catch (err) {
      console.error("Error fetching exam results:", err);
      setError(UI_STRINGS.COMMON.ERROR_PRIMARY);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    examResultService.exportResultsCSV(filteredResults, 'innov8_exam_results.csv');
  };

  // Memoized filtered data
  const filteredResults = useMemo(() => {
    let filtered = results;
    
    // Exam dropdown filter
    if (selectedExamId !== 'all') {
      filtered = filtered.filter(r => r.examId === selectedExamId);
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.studentName.toLowerCase().includes(term) ||
        r.studentEmail.toLowerCase().includes(term) ||
        r.examTitle.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [results, selectedExamId, searchTerm]);

  // Derived stats
  const stats = useMemo(() => {
    if (filteredResults.length === 0) {
      return { total: 0, avgScore: 0, passRate: 0, topScore: 0 };
    }
    const total = filteredResults.length;
    const avgScore = filteredResults.reduce((acc, r) => acc + r.percentage, 0) / total;
    const passed = filteredResults.filter(r => r.percentage >= passThreshold).length;
    const topScore = Math.max(...filteredResults.map(r => r.percentage));
    
    return {
      total,
      avgScore: avgScore.toFixed(1),
      passRate: ((passed / total) * 100).toFixed(1),
      topScore: topScore.toFixed(1)
    };
  }, [filteredResults, passThreshold]);

  const scoreDistribution = useMemo(() => {
    return examResultService.getScoreDistribution(filteredResults);
  }, [filteredResults]);

  const passFailData = useMemo(() => {
    const data = examResultService.getPassFailBreakdown(filteredResults, passThreshold);
    return [
      { name: UI_STRINGS.EXAM_RESULTS.PASSED, value: data.passed },
      { name: UI_STRINGS.EXAM_RESULTS.FAILED, value: data.failed }
    ];
  }, [filteredResults, passThreshold]);

  if (loading && results.length === 0) {
    return <LoadingState message={UI_STRINGS.EXAM_RESULTS.LOADING} />;
  }

  return (
    <div className="animate-in">
      <ErrorAlert message={error} />
      
      <PageHeader 
        title={UI_STRINGS.EXAM_RESULTS.TITLE} 
        subtitle={UI_STRINGS.EXAM_RESULTS.SUBTITLE}
        actionLabel={UI_STRINGS.EXAM_RESULTS.EXPORT_CSV}
        onAction={handleExportCSV}
      />

      {/* Stat Cards */}
      <div className="grid-cards mb-xl">
        <StatCard
          title={UI_STRINGS.EXAM_RESULTS.STAT_TOTAL_ATTEMPTS}
          value={stats.total.toString()}
          icon={BookOpen}
          color="primary"
          bordered
        />
        <StatCard
          title={UI_STRINGS.EXAM_RESULTS.STAT_AVG_SCORE}
          value={`${stats.avgScore}%`}
          icon={TrendingUp}
          color="accent"
        />
        <StatCard
          title={UI_STRINGS.EXAM_RESULTS.STAT_PASS_RATE}
          value={`${stats.passRate}%`}
          icon={Number(stats.passRate) > 50 ? CheckCircle : XCircle}
          color={Number(stats.passRate) > 50 ? "success" : "error"}
        />
        <StatCard
          title={UI_STRINGS.EXAM_RESULTS.STAT_TOP_SCORE}
          value={`${stats.topScore}%`}
          icon={Award}
          color="warning"
        />
      </div>

      {/* Filters & Tabs */}
      <div className="card mb-xl p-md">
        <div className="flex flex-col md:flex-row gap-lg justify-between items-start md:items-center">
          
          <div className="flex flex-1 items-center gap-md w-full">
            <div style={{ flex: '1 1 auto', maxWidth: '300px' }}>
              <select 
                className="select-field" 
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
              >
                <option value="all">All Exams</option>
                {exams.map(exam => (
                  <option key={exam.id} value={exam.id}>{exam.title}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: '2 1 auto' }}>
              <SearchInput 
                placeholder={UI_STRINGS.EXAM_RESULTS.SEARCH_PLACEHOLDER} 
                value={searchTerm} 
                onChange={setSearchTerm} 
              />
            </div>
          </div>

          <div className="flex flex-col gap-xs min-w-[200px]">
            <label className="text-sm text-muted font-medium flex justify-between">
              <span>{UI_STRINGS.EXAM_RESULTS.PASS_THRESHOLD}</span>
              <span className="text-primary">{passThreshold}%</span>
            </label>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={passThreshold} 
              onChange={(e) => setPassThreshold(Number(e.target.value))}
              className="w-full"
            />
          </div>

        </div>

        {/* Tabs */}
        <div className="tabs mt-lg" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <button 
            className={`tab ${activeTab === 'by-exam' ? 'active' : ''}`}
            onClick={() => setActiveTab('by-exam')}
          >
            {UI_STRINGS.EXAM_RESULTS.TAB_BY_EXAM}
          </button>
          <button 
            className={`tab ${activeTab === 'by-student' ? 'active' : ''}`}
            onClick={() => setActiveTab('by-student')}
          >
            {UI_STRINGS.EXAM_RESULTS.TAB_BY_STUDENT}
          </button>
        </div>
      </div>

      {/* Analytics Charts */}
      {filteredResults.length > 0 && (
        <div className="grid-2col mb-xl gap-xl">
          <div className="card p-lg">
            <h3 className="section-title mb-md">{UI_STRINGS.EXAM_RESULTS.CHART_SCORE_DISTRIBUTION}</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={scoreDistribution} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="range" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--primary)' }}
                  />
                  <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-lg">
            <h3 className="section-title mb-md">{UI_STRINGS.EXAM_RESULTS.CHART_PASS_FAIL}</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={passFailData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {passFailData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                    itemStyle={{ color: 'var(--text-main)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="card list-container">
        {filteredResults.length > 0 ? (
          <div className="table-responsive">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>{UI_STRINGS.EXAM_RESULTS.TH_STUDENT}</th>
                  <th>{UI_STRINGS.EXAM_RESULTS.TH_EXAM}</th>
                  <th>{UI_STRINGS.EXAM_RESULTS.TH_SCORE}</th>
                  <th>{UI_STRINGS.EXAM_RESULTS.TH_PERCENTAGE}</th>
                  <th>{UI_STRINGS.EXAM_RESULTS.TH_TIME_TAKEN}</th>
                  <th>{UI_STRINGS.EXAM_RESULTS.TH_STATUS}</th>
                  <th>{UI_STRINGS.EXAM_RESULTS.TH_DATE}</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map(result => (
                  <tr key={result.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar fallback={result.studentName.charAt(0)} />
                        <div>
                          <div className="font-medium">{result.studentName}</div>
                          <div className="text-xs text-muted">{result.studentEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="font-medium">{result.examTitle}</div>
                    </td>
                    <td>{result.score} / {result.totalMarks}</td>
                    <td>
                      <span className="font-bold" style={{ color: result.percentage >= passThreshold ? 'var(--success)' : 'var(--error)' }}>
                        {result.percentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-muted">
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        {Math.floor(result.timeTaken / 60)}m {result.timeTaken % 60}s
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${result.percentage >= passThreshold ? 'success' : 'error'}`}>
                        {result.percentage >= passThreshold ? UI_STRINGS.EXAM_RESULTS.PASSED : UI_STRINGS.EXAM_RESULTS.FAILED}
                      </span>
                    </td>
                    <td className="text-muted text-sm">{result.submittedAt.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message={activeTab === 'by-exam' ? UI_STRINGS.EXAM_RESULTS.EMPTY_EXAM : UI_STRINGS.EXAM_RESULTS.EMPTY_STUDENT} />
        )}
      </div>

    </div>
  );
}
