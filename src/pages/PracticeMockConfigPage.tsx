import React, { useState, useEffect } from 'react';
import {
  Settings,
  BookOpen,
  Upload,
  Trash2,
  Edit2,
  CheckCircle2,
  Sparkles,
  Save,
  HelpCircle,
  Award,
  FileText,
  X,
  Check,
  RotateCcw,
  Loader2,
  Layers,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import Modal from '../components/Modal';
import { FormField, FormRow } from '../components/FormField';
import { useToast } from '../hooks/useToast';
import { batchService } from '../services/batchService';
import type { Batch } from '../types';
import {
  practiceMockAdminService,
  type PracticeMockConfig,
  type PracticeMockQuestionAdmin,
} from '../services/practiceMockAdminService';
import './PracticeMockConfig.css';

export default function PracticeMockConfigPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'settings' | 'questions' | 'import'>('settings');

  // State
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Config State
  const [config, setConfig] = useState<PracticeMockConfig>({
    isEnabled: true,
    title: 'Practice Mock',
    description: 'Test your Linux Administration knowledge with 10 random MCQs daily.',
    displayBadge: 'Daily',
    questionsPerTest: 10,
    dailyAttemptLimit: 1,
    durationMinutes: 15,
    passPercentage: 60,
    allowedBatchIds: ['all'],
  });

  // Questions State
  const [questions, setQuestions] = useState<PracticeMockQuestionAdmin[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  // Subject Filtering State
  const [selectedSubject, setSelectedSubject] = useState('Linux Administration');

  // Question Modal State
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<PracticeMockQuestionAdmin | null>(null);
  const [questionFormData, setQuestionFormData] = useState<PracticeMockQuestionAdmin>({
    id: '',
    questionNumber: 1,
    subject: 'Linux Administration',
    chapter: 'File Management',
    questionText: '',
    options: ['', '', '', ''],
    correctAnswerIndex: 0,
    explanation: '',
  });

  // Delete Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);

  // Import State
  const [seedingLoading, setSeedingLoading] = useState(false);

  // PDF Upload & AI Extraction State
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [pdfSubject, setPdfSubject] = useState('Linux Administration');
  const [customNewSubject, setCustomNewSubject] = useState('');
  const [isEnteringCustomSubject, setIsEnteringCustomSubject] = useState(false);
  const [pdfDefaultChapter, setPdfDefaultChapter] = useState('');
  const [extractingPdf, setExtractingPdf] = useState(false);
  const [stagedQuestions, setStagedQuestions] = useState<PracticeMockQuestionAdmin[]>([]);
  const [committingStaged, setCommittingStaged] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [cfg, qList, batchList] = await Promise.all([
        practiceMockAdminService.fetchConfig(),
        practiceMockAdminService.fetchQuestions(),
        batchService.fetchBatches().catch(() => []),
      ]);
      setConfig(cfg);
      setQuestions(qList);
      setBatches(batchList);
      if (cfg.activeSubject) {
        setSelectedSubject(cfg.activeSubject);
        setPdfSubject(cfg.activeSubject);
      }
    } catch (err: unknown) {
      console.error('Failed to load Practice Mock data:', err);
      setError('Failed to load Practice Mock configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      await practiceMockAdminService.updateConfig(config);
      showToast('Practice Mock configuration saved successfully!', 'success');
    } catch (err: unknown) {
      console.error('Error saving configuration:', err);
      showToast('Failed to save configuration.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Derive unique subjects from loaded questions
  const availableSubjects = Array.from(
    new Set(questions.map((q) => q.subject || 'Linux Administration'))
  ).filter(Boolean);
  if (!availableSubjects.includes('Linux Administration')) {
    availableSubjects.unshift('Linux Administration');
  }

  // Questions belonging strictly to currently selected subject
  const displayedQuestions = questions.filter(
    (q) => (q.subject || 'Linux Administration') === selectedSubject
  );

  const handleOpenAddQuestion = () => {
    setEditingQuestion(null);
    setQuestionFormData({
      id: `pmq_${Date.now()}`,
      questionNumber: displayedQuestions.length + 1,
      subject: selectedSubject || 'Linux Administration',
      chapter: 'File Management',
      questionText: '',
      options: ['', '', '', ''],
      correctAnswerIndex: 0,
      explanation: '',
    });
    setShowQuestionModal(true);
  };

  const handleOpenEditQuestion = (q: PracticeMockQuestionAdmin) => {
    setEditingQuestion(q);
    setQuestionFormData({ ...q });
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionFormData.questionText.trim()) {
      showToast('Question text is required', 'error');
      return;
    }
    if (questionFormData.options.some((opt) => !opt.trim())) {
      showToast('All 4 options must be provided', 'error');
      return;
    }

    try {
      await practiceMockAdminService.saveQuestion(questionFormData);
      showToast(editingQuestion ? 'Question updated' : 'Question added', 'success');
      setShowQuestionModal(false);
      const updatedList = await practiceMockAdminService.fetchQuestions();
      setQuestions(updatedList);
    } catch (err) {
      console.error('Failed to save question:', err);
      showToast('Failed to save question', 'error');
    }
  };

  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return;
    try {
      await practiceMockAdminService.deleteQuestion(questionToDelete);
      showToast('Question deleted', 'success');
      setQuestions(questions.filter((q) => q.id !== questionToDelete));
      setShowDeleteModal(false);
      setQuestionToDelete(null);
    } catch (err) {
      console.error('Failed to delete question:', err);
      showToast('Failed to delete question', 'error');
    }
  };

  const handleSeedLinux100 = async () => {
    try {
      setSeedingLoading(true);
      const res = await practiceMockAdminService.seedLinux100MCQs();
      showToast(`Successfully loaded ${res.total} Linux MCQs into pool!`, 'success');
      const updatedList = await practiceMockAdminService.fetchQuestions();
      setQuestions(updatedList);
      setActiveTab('questions');
    } catch (err: unknown) {
      console.error('Error seeding questions:', err);
      const msg = err instanceof Error ? err.message : String(err);
      showToast('Failed to seed questions: ' + msg, 'error');
    } finally {
      setSeedingLoading(false);
    }
  };

  const handlePdfFileSelect = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Please upload a valid .pdf file', 'error');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      showToast('PDF is larger than 25MB. Please upload a smaller file.', 'error');
      return;
    }
    setSelectedPdfFile(file);
    if (!pdfDefaultChapter) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setPdfDefaultChapter(cleanName.slice(0, 30));
    }
  };

  const handleExtractFromPdf = async () => {
    if (!selectedPdfFile) {
      showToast('Please select a PDF file first', 'error');
      return;
    }
    const finalSubject = isEnteringCustomSubject
      ? (customNewSubject.trim() || 'General')
      : (pdfSubject.trim() || 'Linux Administration');

    try {
      setExtractingPdf(true);
      const extracted = await practiceMockAdminService.extractQuestionsFromPdf(
        selectedPdfFile,
        finalSubject,
        pdfDefaultChapter || undefined
      );
      if (extracted.length === 0) {
        showToast('No questions were detected in this PDF.', 'error');
        return;
      }
      const taggedQuestions = (extracted as PracticeMockQuestionAdmin[]).map((q) => ({
        ...q,
        subject: finalSubject,
      }));
      setStagedQuestions(taggedQuestions);
      showToast(`🎉 Gemini AI successfully extracted ${extracted.length} questions for "${finalSubject}"! Review them below before adding to the pool.`, 'success');
    } catch (err: unknown) {
      console.error('Failed to extract questions from PDF:', err);
      const msg = err instanceof Error ? err.message : 'Please verify the PDF and try again.';
      showToast('Extraction failed: ' + msg, 'error');
    } finally {
      setExtractingPdf(false);
    }
  };

  const handleCommitStagedQuestions = async () => {
    if (stagedQuestions.length === 0) return;
    try {
      setCommittingStaged(true);
      const targetSubject = stagedQuestions[0]?.subject || selectedSubject;
      const count = await practiceMockAdminService.bulkImportQuestions(stagedQuestions);
      showToast(`Successfully added ${count} questions to "${targetSubject}" pool!`, 'success');
      setStagedQuestions([]);
      setSelectedPdfFile(null);
      setPdfDefaultChapter('');
      setCustomNewSubject('');
      setIsEnteringCustomSubject(false);
      const updatedList = await practiceMockAdminService.fetchQuestions();
      setQuestions(updatedList);
      setSelectedSubject(targetSubject);
      setActiveTab('questions');
    } catch (err: unknown) {
      console.error('Failed to commit staged questions:', err);
      const msg = err instanceof Error ? err.message : '';
      showToast('Failed to save questions to pool: ' + msg, 'error');
    } finally {
      setCommittingStaged(false);
    }
  };

  const handleRemoveStagedQuestion = (id: string) => {
    setStagedQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleClearStaged = () => {
    setStagedQuestions([]);
    setSelectedPdfFile(null);
  };

  if (loading) {
    return <LoadingState message="Loading Practice Mock Settings..." />;
  }

  return (
    <div className="animate-in practice-mock-page">
      <ErrorAlert message={error} />

      <PageHeader
        title="Practice Mock Configuration"
        subtitle="Manage the daily 10-question random mock test, PDF question pool, attempt limits, and student exam tab visibility."
        actionLabel={activeTab === 'questions' ? 'Add Question' : undefined}
        onAction={activeTab === 'questions' ? handleOpenAddQuestion : undefined}
      />

      {/* Navigation Tabs */}
      <div className="tab-pill-container mb-lg">
        <button
          className={`tab-pill-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings size={16} />
          <span>Test & Display Settings</span>
        </button>
        <button
          className={`tab-pill-btn ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          <BookOpen size={16} />
          <span>Question Pool ({questions.length})</span>
        </button>
        <button
          className={`tab-pill-btn ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          <Upload size={16} />
          <span>
            PDF & Question Importer
            {stagedQuestions.length > 0 && ` (${stagedQuestions.length} Staged)`}
          </span>
        </button>
      </div>

      {/* TAB 1: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="card settings-card">
          <form onSubmit={handleSaveConfig}>
            <div className="section-title-group">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Settings className="text-primary" size={20} />
                Exam Section & Tab Display Controls
              </h3>
              <p className="text-muted text-sm">
                Control how the Practice Mock feature appears to students in the mobile app.
              </p>
            </div>

            <div className="form-toggle-row mt-md">
              <div className="toggle-label-wrap">
                <span className="font-semibold text-foreground">Enable Practice Mock in Student App</span>
                <span className="text-xs text-muted">
                  When enabled, students can see and take the Practice Mock test in their Exams tab.
                </span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={config.isEnabled}
                  onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })}
                />
                <span className="slider round"></span>
              </label>
            </div>

            <FormRow>
              <FormField label="Section / Tab Display Title" required>
                <input
                  type="text"
                  className="input-field"
                  value={config.title}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  placeholder="e.g. Practice Mock"
                  required
                />
              </FormField>

              <FormField label="Badge Text">
                <input
                  type="text"
                  className="input-field"
                  value={config.displayBadge}
                  onChange={(e) => setConfig({ ...config, displayBadge: e.target.value })}
                  placeholder="e.g. Daily, New"
                />
              </FormField>
            </FormRow>

            <FormField label="Description / Subtitle for Students">
              <textarea
                className="input-field"
                rows={2}
                value={config.description}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                placeholder="Brief instructions shown to students..."
              />
            </FormField>

            <hr className="my-lg border-border" />

            <div className="section-title-group">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Award className="text-primary" size={20} />
                Test Generation & Attempt Limits
              </h3>
              <p className="text-muted text-sm">
                Configure question selection, duration, and daily limits for students.
              </p>
            </div>

            <FormRow>
              <FormField label="Active Practice Mock Subject for Student App" required>
                <select
                  className="input-field font-semibold text-primary"
                  value={config.activeSubject || 'Linux Administration'}
                  onChange={(e) => setConfig({ ...config, activeSubject: e.target.value })}
                  required
                >
                  {availableSubjects.map((sub) => {
                    const subCount = questions.filter((q) => (q.subject || 'Linux Administration') === sub).length;
                    return (
                      <option key={sub} value={sub}>
                        {sub} ({subCount} Questions in Pool)
                      </option>
                    );
                  })}
                </select>
                <span className="text-xs text-muted mt-1 block">
                  Students will receive questions exclusively from this subject pool when taking the Practice Mock.
                </span>
              </FormField>
            </FormRow>

            <FormRow>
              <FormField label="Questions Per Test (Default: 10)" required>
                <input
                  type="number"
                  className="input-field"
                  min={5}
                  max={50}
                  value={config.questionsPerTest}
                  onChange={(e) => setConfig({ ...config, questionsPerTest: parseInt(e.target.value, 10) || 10 })}
                  required
                />
                <span className="text-xs text-muted mt-1 block">
                  Randomly selected from the pool on every test. Uniqueness is guaranteed across attempts.
                </span>
              </FormField>

              <FormField label="Daily Attempt Limit (Default: 1 per day)" required>
                <input
                  type="number"
                  className="input-field"
                  min={1}
                  max={10}
                  value={config.dailyAttemptLimit}
                  onChange={(e) => setConfig({ ...config, dailyAttemptLimit: parseInt(e.target.value, 10) || 1 })}
                  required
                />
                <span className="text-xs text-muted mt-1 block">
                  Strictly enforced on the backend. Attempt counter resets at 12:00 AM IST.
                </span>
              </FormField>
            </FormRow>

            <FormRow>
              <FormField label="Test Duration (Minutes)" required>
                <div className="relative">
                  <input
                    type="number"
                    className="input-field"
                    min={5}
                    max={120}
                    value={config.durationMinutes}
                    onChange={(e) => setConfig({ ...config, durationMinutes: parseInt(e.target.value, 10) || 15 })}
                    required
                  />
                </div>
              </FormField>

              <FormField label="Passing Percentage (%)" required>
                <input
                  type="number"
                  className="input-field"
                  min={10}
                  max={100}
                  value={config.passPercentage}
                  onChange={(e) => setConfig({ ...config, passPercentage: parseInt(e.target.value, 10) || 60 })}
                  required
                />
              </FormField>
            </FormRow>

            <FormField label="Allowed Batches">
              <select
                className="input-field"
                value={config.allowedBatchIds?.[0] || 'all'}
                onChange={(e) => setConfig({ ...config, allowedBatchIds: [e.target.value] })}
              >
                <option value="all">All Batches (Public)</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="mt-xl flex justify-end">
              <button type="submit" className="btn btn-primary flex items-center gap-2" disabled={savingSettings}>
                <Save size={16} />
                <span>{savingSettings ? 'Saving...' : 'Save Configuration'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: QUESTIONS POOL */}
      {activeTab === 'questions' && (
        <div>
          {/* Test / Subject Selector Dropdown Toolbar */}
          <div className="subject-selector-toolbar">
            <div className="subject-select-wrapper">
              <label htmlFor="practice-subject-select" className="subject-select-label">
                <Layers size={18} className="text-primary" />
                <span>Select Test / Subject:</span>
              </label>
              <select
                id="practice-subject-select"
                className="subject-select-input"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                {availableSubjects.map((sub) => {
                  const count = questions.filter(
                    (q) => (q.subject || 'Linux Administration') === sub
                  ).length;
                  return (
                    <option key={sub} value={sub}>
                      {sub} ({count} Questions)
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-primary font-bold">
                {displayedQuestions.length} Questions
              </span>
              <span className="text-xs text-muted">
                Active in <strong>{selectedSubject}</strong> pool
              </span>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid-summary-cards mb-lg">
            <div className="stat-card">
              <span className="stat-label">Subject Pool Size</span>
              <span className="stat-value">{displayedQuestions.length}</span>
              <span className="stat-sub">{selectedSubject}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Questions Per Attempt</span>
              <span className="stat-value">{config.questionsPerTest}</span>
              <span className="stat-sub">Randomly sampled</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Non-Overlapping Tests</span>
              <span className="stat-value">
                {config.questionsPerTest > 0 ? Math.floor(displayedQuestions.length / config.questionsPerTest) : 0}
              </span>
              <span className="stat-sub">Before pool cycles</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Daily Limit</span>
              <span className="stat-value">{config.dailyAttemptLimit} / day</span>
              <span className="stat-sub">Tamper-proof backend check</span>
            </div>
          </div>

          {/* Questions List */}
          {displayedQuestions.length === 0 ? (
            <div className="card text-center py-xl">
              <HelpCircle size={48} className="text-muted mx-auto mb-md opacity-40" />
              <h3 className="font-semibold text-lg">No questions found for {selectedSubject}</h3>
              <p className="text-muted text-sm mt-1 mb-md">
                This subject pool is currently empty. Upload a PDF in the Importer tab to add questions.
              </p>
              <button className="btn btn-primary" onClick={() => setActiveTab('import')}>
                Upload {selectedSubject} PDF
              </button>
            </div>
          ) : (
            <div className="questions-grid">
              {displayedQuestions.map((q, idx) => (
                <div key={q.id} className="card question-item-card">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2">
                      <span className="badge badge-primary text-xs">
                        #{q.questionNumber || idx + 1}
                      </span>
                      <span className="badge badge-secondary text-xs">{q.subject || 'Linux Administration'}</span>
                      <span className="badge badge-secondary text-xs">{q.chapter}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        className="btn-icon text-muted hover:text-primary"
                        title="Edit Question"
                        onClick={() => handleOpenEditQuestion(q)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn-icon text-muted hover:text-danger"
                        title="Delete Question"
                        onClick={() => {
                          setQuestionToDelete(q.id);
                          setShowDeleteModal(true);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <h4 className="question-text-title mt-sm">{q.questionText}</h4>

                  <div className="options-list mt-sm">
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = q.correctAnswerIndex === optIdx;
                      return (
                        <div
                          key={optIdx}
                          className={`option-badge ${isCorrect ? 'correct' : 'regular'}`}
                        >
                          <span className="opt-letter font-bold">
                            {String.fromCharCode(65 + optIdx)})
                          </span>
                          <span className="opt-text flex-1">{opt}</span>
                          {isCorrect && (
                            <CheckCircle2 size={14} className="text-success inline-block ml-1" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div className="explanation-box mt-sm">
                      <span className="font-semibold text-xs text-muted block mb-0.5">Explanation:</span>
                      <p className="text-xs text-muted">{q.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: IMPORTER */}
      {activeTab === 'import' && (
        <div className="grid-importer-container">
          {/* Pre-packaged 100 Linux MCQs Card */}
          <div className="card highlight-seed-card">
            <div className="flex items-start gap-3">
              <div className="seed-icon-badge">
                <Sparkles size={24} className="text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Linux Administration – 100 MCQs with Answers (From PDF)
                </h3>
                <p className="text-sm text-muted mt-1">
                  We have pre-extracted and formatted all 100 MCQs from your attached PDF across all 8 chapters:
                </p>
                <ul className="text-xs text-muted mt-2 space-y-1">
                  <li>• Chapter 1: File Management (Q1 - Q15)</li>
                  <li>• Chapter 2: User Management (Q16 - Q30)</li>
                  <li>• Chapter 3: Network Management (Q31 - Q45)</li>
                  <li>• Chapter 4: System Management (Q46 - Q60)</li>
                  <li>• Chapter 5: Service Management (Q61 - Q70)</li>
                  <li>• Chapter 6: Process Management (Q71 - Q80)</li>
                  <li>• Chapter 7: Software Management (Q81 - Q90)</li>
                  <li>• Chapter 8: Servers (Q91 - Q100)</li>
                </ul>
              </div>
            </div>

            <div className="mt-lg pt-md border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted">
                Status: {questions.length >= 100 ? 'Pool Loaded (100 Questions)' : 'Ready to Load'}
              </span>
              <button
                className="btn btn-primary flex items-center gap-2"
                onClick={handleSeedLinux100}
                disabled={seedingLoading}
              >
                <Sparkles size={16} />
                <span>{seedingLoading ? 'Seeding...' : '1-Click Load All 100 MCQs'}</span>
              </button>
            </div>
          </div>

          {/* AI-Powered PDF Question Extractor & Staging Review */}
          {stagedQuestions.length > 0 ? (
            <div className="card staging-workspace-card">
              <div className="staging-banner mb-lg">
                <div>
                  <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="text-primary" size={20} />
                    <span>{stagedQuestions.length} Questions Extracted by Gemini AI</span>
                  </h3>
                  <p className="text-xs text-muted mt-1">
                    Extracted from <strong className="text-foreground">{selectedPdfFile?.name || 'Uploaded PDF'}</strong>. Review questions, correct answers, and options below before saving to the pool.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    className="btn btn-secondary flex items-center gap-2"
                    onClick={handleClearStaged}
                    disabled={committingStaged}
                  >
                    <RotateCcw size={16} />
                    <span>Discard & Re-upload</span>
                  </button>
                  <button
                    className="btn btn-primary flex items-center gap-2"
                    onClick={handleCommitStagedQuestions}
                    disabled={committingStaged}
                  >
                    {committingStaged ? (
                      <>
                        <Loader2 className="animate-spin-fast" size={16} />
                        <span>Saving to Pool...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Approve & Add All ({stagedQuestions.length}) to Pool</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Staged Question List */}
              <div className="questions-grid">
                {stagedQuestions.map((q, idx) => (
                  <div key={q.id || idx} className="card staging-card-item">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="badge badge-primary font-bold">
                          Q#{q.questionNumber || idx + 1}
                        </span>
                        <span className="badge badge-secondary">{q.chapter || 'General'}</span>
                      </div>
                      <button
                        className="btn-icon text-danger"
                        title="Remove question from import"
                        onClick={() => handleRemoveStagedQuestion(q.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <h4 className="question-text-title mb-md">{q.questionText}</h4>

                    <div className="options-list mb-md">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = q.correctAnswerIndex === optIdx;
                        return (
                          <div
                            key={optIdx}
                            className={`option-badge ${isCorrect ? 'correct' : 'regular'}`}
                          >
                            <span className="opt-letter font-bold">
                              {String.fromCharCode(65 + optIdx)})
                            </span>
                            <span className="opt-text flex-1">{opt}</span>
                            {isCorrect && (
                              <div className="flex items-center gap-1 text-success font-semibold text-xs ml-1">
                                <CheckCircle2 size={14} />
                                <span>Correct</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="explanation-box mt-sm">
                        <span className="font-semibold text-xs text-muted block mb-0.5">Explanation:</span>
                        <p className="text-xs text-muted">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Bottom Commit Action */}
              <div className="mt-xl pt-md border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted">
                  {stagedQuestions.length} questions ready to be added to Firestore Question Pool.
                </span>
                <button
                  className="btn btn-primary flex items-center gap-2"
                  onClick={handleCommitStagedQuestions}
                  disabled={committingStaged}
                >
                  {committingStaged ? (
                    <>
                      <Loader2 className="animate-spin-fast" size={16} />
                      <span>Saving to Pool...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Approve & Add All ({stagedQuestions.length}) to Pool</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="card pdf-upload-card">
              <div className="flex items-start gap-3 mb-md">
                <div className="seed-icon-badge">
                  <Sparkles size={24} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Direct PDF MCQ Extractor (Gemini 2.0 Flash)
                  </h3>
                  <p className="text-sm text-muted mt-1">
                    Upload any PDF test paper or question bank. The AI will automatically read the questions, options A–D, detect answer keys (including answer keys located at the back of the document), and let you review them before saving.
                  </p>
                </div>
              </div>

              {/* Drag & Drop Box */}
              {!selectedPdfFile ? (
                <label
                  className={`pdf-dropzone ${isDraggingOver ? 'dragover' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(true);
                  }}
                  onDragLeave={() => setIsDraggingOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handlePdfFileSelect(e.dataTransfer.files[0]);
                    }
                  }}
                >
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handlePdfFileSelect(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="pdf-dropzone-icon">
                    <FileText size={28} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      Click to browse or drag & drop your PDF here
                    </p>
                    <p className="text-xs text-muted mt-1">
                      Supports exam PDFs up to 25MB (single or multi-page)
                    </p>
                  </div>
                </label>
              ) : (
                <div className="space-y-4">
                  <div className="pdf-file-details">
                    <div className="flex items-center gap-3">
                      <div className="seed-icon-badge" style={{ width: 36, height: 36 }}>
                        <FileText size={18} className="text-primary" />
                      </div>
                      <div>
                        <span className="font-semibold text-sm text-foreground block">
                          {selectedPdfFile.name}
                        </span>
                        <span className="text-xs text-muted">
                          {(selectedPdfFile.size / (1024 * 1024)).toFixed(2)} MB • PDF Document
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn-icon text-muted"
                      onClick={() => setSelectedPdfFile(null)}
                      title="Remove file"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <FormRow>
                    <FormField label="Target Test / Subject" required>
                      <select
                        className="input-field font-semibold text-primary"
                        value={isEnteringCustomSubject ? '__NEW__' : pdfSubject}
                        onChange={(e) => {
                          if (e.target.value === '__NEW__') {
                            setIsEnteringCustomSubject(true);
                          } else {
                            setIsEnteringCustomSubject(false);
                            setPdfSubject(e.target.value);
                          }
                        }}
                      >
                        {availableSubjects.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                        <option value="__NEW__">➕ Add New Test (e.g. SQL, Python)...</option>
                      </select>
                    </FormField>

                    {isEnteringCustomSubject ? (
                      <FormField label="New Subject Name" required>
                        <input
                          type="text"
                          className="input-field"
                          value={customNewSubject}
                          onChange={(e) => setCustomNewSubject(e.target.value)}
                          placeholder="e.g. SQL, Python, DevOps"
                          required
                          autoFocus
                        />
                      </FormField>
                    ) : (
                      <FormField label="Default Chapter / Topic (Optional)">
                        <input
                          type="text"
                          className="input-field"
                          value={pdfDefaultChapter}
                          onChange={(e) => setPdfDefaultChapter(e.target.value)}
                          placeholder="e.g. File Management (or auto-detect from PDF)"
                        />
                      </FormField>
                    )}
                  </FormRow>

                  {isEnteringCustomSubject && (
                    <FormRow>
                      <FormField label="Default Chapter / Topic (Optional)">
                        <input
                          type="text"
                          className="input-field"
                          value={pdfDefaultChapter}
                          onChange={(e) => setPdfDefaultChapter(e.target.value)}
                          placeholder="e.g. Queries, Syntax (or auto-detect from PDF)"
                        />
                      </FormField>
                    </FormRow>
                  )}

                  <div className="flex justify-end gap-3 mt-md">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setSelectedPdfFile(null)}
                      disabled={extractingPdf}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary flex items-center gap-2"
                      onClick={handleExtractFromPdf}
                      disabled={extractingPdf}
                    >
                      {extractingPdf ? (
                        <>
                          <Loader2 className="animate-spin-fast" size={16} />
                          <span>Extracting with Gemini 2.0 Flash...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          <span>Extract Questions with Gemini AI</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* QUESTION MODAL */}
      <Modal
        isOpen={showQuestionModal}
        onClose={() => setShowQuestionModal(false)}
        title={editingQuestion ? 'Edit Question' : 'Add New MCQ to Pool'}
      >
        <form onSubmit={handleSaveQuestion}>
          <FormRow>
            <FormField label="Subject / Test" required>
              <input
                type="text"
                className="input-field"
                value={questionFormData.subject || selectedSubject}
                onChange={(e) => setQuestionFormData({ ...questionFormData, subject: e.target.value })}
                placeholder="e.g. Linux Administration, SQL"
                required
              />
            </FormField>

            <FormField label="Question Number">
              <input
                type="number"
                className="input-field"
                value={questionFormData.questionNumber}
                onChange={(e) =>
                  setQuestionFormData({ ...questionFormData, questionNumber: parseInt(e.target.value, 10) || 1 })
                }
              />
            </FormField>

            <FormField label="Chapter / Category" required>
              <input
                type="text"
                className="input-field"
                value={questionFormData.chapter}
                onChange={(e) => setQuestionFormData({ ...questionFormData, chapter: e.target.value })}
                placeholder="e.g. File Management"
                required
              />
            </FormField>
          </FormRow>

          <FormField label="Question Text" required>
            <textarea
              className="input-field"
              rows={3}
              value={questionFormData.questionText}
              onChange={(e) => setQuestionFormData({ ...questionFormData, questionText: e.target.value })}
              placeholder="Enter question text..."
              required
            />
          </FormField>

          <div className="mt-md mb-sm">
            <span className="font-semibold text-sm block mb-1">
              Options (Select radio button for Correct Answer)
            </span>
            {questionFormData.options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <input
                  type="radio"
                  name="correctOption"
                  checked={questionFormData.correctAnswerIndex === idx}
                  onChange={() => setQuestionFormData({ ...questionFormData, correctAnswerIndex: idx })}
                  title="Mark as correct answer"
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <span className="font-bold text-sm text-muted" style={{ width: 20 }}>
                  {String.fromCharCode(65 + idx)})
                </span>
                <input
                  type="text"
                  className="input-field flex-1"
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...questionFormData.options];
                    newOpts[idx] = e.target.value;
                    setQuestionFormData({ ...questionFormData, options: newOpts });
                  }}
                  placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                  required
                />
              </div>
            ))}
          </div>

          <FormField label="Explanation (Optional)">
            <textarea
              className="input-field"
              rows={2}
              value={questionFormData.explanation || ''}
              onChange={(e) => setQuestionFormData({ ...questionFormData, explanation: e.target.value })}
              placeholder="Explanation displayed to students after submitting test..."
            />
          </FormField>

          <div className="mt-lg flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setShowQuestionModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Question
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Question"
      >
        <p className="text-muted text-sm mb-lg">
          Are you sure you want to delete this question? It will be permanently removed from the Practice Mock pool.
        </p>
        <div className="flex justify-end gap-2">
          <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={handleDeleteQuestion}>
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
