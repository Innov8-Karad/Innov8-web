import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Edit3, 
  Eye, 
  Printer, 
  X,
  FileCheck
} from 'lucide-react';
import './Certifications.css';
import { certificationService } from '../services/certificationService';
import { courseService } from '../services/courseService';
import { userService } from '../services/userService';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import type { CertificationExam, CertificationResult, Certificate, Course, User } from '../types';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/LoadingState';
import ErrorAlert from '../components/ErrorAlert';
import SearchInput from '../components/SearchInput';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { FormField, FormRow, FormActions } from '../components/FormField';
import { useToast } from '../hooks/useToast';
import CustomSelect from '../components/CustomSelect';

type ActiveTab = 'exams' | 'students' | 'issued';

export default function CertificationsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>('exams');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data lists
  const [courses, setCourses] = useState<Course[]>([]);
  const [exams, setExams] = useState<CertificationExam[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [progressList, setProgressList] = useState<any[]>([]);
  const [examResults, setExamResults] = useState<CertificationResult[]>([]);
  const [issuedCertificates, setIssuedCertificates] = useState<Certificate[]>([]);

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showExamModal, setShowExamModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCertPreview, setShowCertPreview] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [examIdToDelete, setExamIdToDelete] = useState<string | null>(null);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);

  // Form State
  const initialExamState = {
    title: '',
    description: '',
    courseId: '',
    courseTitle: '',
    duration: '45',
    totalMarks: '100',
    passingPercentage: '60',
    minVideoCompletionPercentage: '100',
    maxAttempts: '3',
    scheduledDate: '',
    endDate: '',
    isActive: true,
    questions: [] as any[]
  };

  const [examFormData, setExamFormData] = useState(initialExamState);

  // Load dashboard data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [
        fetchedCourses, 
        fetchedExams, 
        fetchedUsers, 
        purchasesSnap, 
        progressSnap, 
        fetchedResults, 
        fetchedCerts
      ] = await Promise.all([
        courseService.fetchCourses(),
        certificationService.fetchCertExams(),
        userService.fetchUsers(),
        getDocs(collection(db, 'course_purchases')),
        getDocs(collection(db, 'user_progress')),
        certificationService.fetchAllCertResults(),
        certificationService.fetchCertificates()
      ]);

      setCourses(fetchedCourses);
      setExams(fetchedExams);
      setUsers(fetchedUsers);
      setPurchases(purchasesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setProgressList(progressSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setExamResults(fetchedResults);
      setIssuedCertificates(fetchedCerts);
    } catch (err) {
      console.error("Error loading certification dashboard:", err);
      setError("Failed to load certifications data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Switch Active Tab
  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setSearchTerm('');
  };

  // Toggle Exam Active Status
  const handleToggleExamStatus = async (examId: string, currentStatus: boolean) => {
    try {
      await certificationService.updateCertExam(examId, { isActive: !currentStatus });
      setExams(exams.map(e => e.id === examId ? { ...e, isActive: !currentStatus } : e));
      showToast(`Exam status updated to ${!currentStatus ? 'Active' : 'Inactive'}`, "success");
    } catch (err) {
      console.error("Error toggling exam status:", err);
      showToast("Failed to update status", "error");
    }
  };

  // Open creation modal
  const handleOpenCreateExam = () => {
    setEditingExamId(null);
    setExamFormData(initialExamState);
    setShowExamModal(true);
  };

  // Open editing modal
  const handleOpenEditExam = (exam: CertificationExam) => {
    setEditingExamId(exam.id);
    setExamFormData({
      title: exam.title,
      description: exam.description || '',
      courseId: exam.courseId,
      courseTitle: exam.courseTitle || '',
      duration: String(exam.duration),
      totalMarks: String(exam.totalMarks),
      passingPercentage: String(exam.passingPercentage),
      minVideoCompletionPercentage: String(exam.minVideoCompletionPercentage || 100),
      maxAttempts: String(exam.maxAttempts || 3),
      scheduledDate: exam.scheduledDate ? new Date(exam.scheduledDate).toISOString().slice(0, 16) : '',
      endDate: exam.endDate ? new Date(exam.endDate).toISOString().slice(0, 16) : '',
      isActive: exam.isActive,
      questions: exam.questions || []
    });
    setShowExamModal(true);
  };

  // Save Exam (Create/Update)
  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!examFormData.courseId) {
      showToast("Please select a target course", "error");
      return;
    }

    if (examFormData.questions.length === 0) {
      showToast("Please add at least one question", "error");
      return;
    }

    // Find course title
    const targetCourse = courses.find(c => c.id === examFormData.courseId);
    const courseTitle = targetCourse ? targetCourse.title : '';

    const payload = {
      ...examFormData,
      courseTitle,
      duration: Number(examFormData.duration),
      totalMarks: Number(examFormData.totalMarks),
      passingPercentage: Number(examFormData.passingPercentage),
      minVideoCompletionPercentage: Number(examFormData.minVideoCompletionPercentage),
      maxAttempts: Number(examFormData.maxAttempts),
      scheduledDate: new Date(examFormData.scheduledDate),
      endDate: examFormData.endDate ? new Date(examFormData.endDate) : undefined,
    };

    try {
      if (editingExamId) {
        await certificationService.updateCertExam(editingExamId, payload as any);
        showToast("Certification exam updated successfully", "success");
      } else {
        await certificationService.createCertExam(payload as any);
        showToast("Certification exam created successfully", "success");
      }
      setShowExamModal(false);
      loadAllData();
    } catch (err) {
      console.error("Error saving exam:", err);
      showToast("Failed to save exam", "error");
    }
  };

  // Delete Exam confirm
  const handleConfirmDeleteExam = (id: string) => {
    setExamIdToDelete(id);
    setShowDeleteModal(true);
  };

  const handleDeleteExam = async () => {
    if (!examIdToDelete) return;
    try {
      await certificationService.deleteCertExam(examIdToDelete);
      showToast("Certification exam deleted", "success");
      setShowDeleteModal(false);
      loadAllData();
    } catch (err) {
      console.error("Error deleting exam:", err);
      showToast("Failed to delete exam", "error");
    }
  };

  // Add Question to Form
  const handleAddQuestion = () => {
    const newQuestion = {
      questionText: '',
      options: ['', '', '', ''],
      correctOptionIndex: 0
    };
    setExamFormData({
      ...examFormData,
      questions: [...examFormData.questions, newQuestion]
    });
  };

  // Remove Question from Form
  const handleRemoveQuestion = (index: number) => {
    const updated = [...examFormData.questions];
    updated.splice(index, 1);
    setExamFormData({
      ...examFormData,
      questions: updated
    });
  };

  // Update Question field
  const handleUpdateQuestionText = (index: number, val: string) => {
    const updated = [...examFormData.questions];
    updated[index].questionText = val;
    setExamFormData({ ...examFormData, questions: updated });
  };

  const handleUpdateQuestionOption = (qIdx: number, oIdx: number, val: string) => {
    const updated = [...examFormData.questions];
    updated[qIdx].options[oIdx] = val;
    setExamFormData({ ...examFormData, questions: updated });
  };

  const handleUpdateQuestionCorrect = (qIdx: number, correctIdx: number) => {
    const updated = [...examFormData.questions];
    updated[qIdx].correctOptionIndex = correctIdx;
    setExamFormData({ ...examFormData, questions: updated });
  };

  // Calculate external eligible student progress pairs
  const getEligiblePairs = () => {
    const list: any[] = [];
    
    users.forEach(user => {
      // 1. MUST NOT BE IN BATCH (Regular batch students are excluded)
      const hasBatch = user.batchId || (user.batch && user.batch !== 'Unassigned');
      if (hasBatch) return;
      if (user.role !== 'student') return;

      // 2. Filter purchases for this student
      const userPurchases = purchases.filter(p => p.userId === user.id);
      
      userPurchases.forEach(purchase => {
        const course = courses.find(c => c.id === purchase.courseId);
        if (!course) return;

        // Fetch user progress document
        const progressDoc = progressList.find(p => p.id === `${user.id}_${course.id}`);
        const videoProgress = progressDoc?.overallProgress ?? 0;

        // Fetch certification exam for this course
        const exam = exams.find(e => e.courseId === course.id);
        
        // Fetch exam results
        const results = examResults.filter(r => r.userId === user.id && r.courseId === course.id);
        const bestResult = results.length > 0 
          ? results.reduce((best, cur) => (cur.score > best.score) ? cur : best, results[0]) 
          : null;
        
        const passedExam = bestResult ? bestResult.passed : false;
        
        // Check if certificate already exists
        const certificate = issuedCertificates.find(c => c.userId === user.id && c.courseId === course.id);

        // Eligibility logic
        // Must complete 100% video progress and pass the exam
        const minProgress = exam ? (exam.minVideoCompletionPercentage ?? 100) : 100;
        const isProgressEligible = videoProgress >= minProgress;
        const isExamEligible = passedExam;
        const isEligibleForCert = isProgressEligible && isExamEligible;

        list.push({
          user,
          course,
          purchase,
          videoProgress,
          exam,
          bestResult,
          attempts: results.length,
          certificate,
          isEligibleForCert
        });
      });
    });

    // Apply search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return list.filter(item => 
        (item.user.name && item.user.name.toLowerCase().includes(q)) ||
        (item.user.email && item.user.email.toLowerCase().includes(q)) ||
        (item.course.title && item.course.title.toLowerCase().includes(q))
      );
    }

    return list;
  };

  // Issue Certificate manually
  const handleIssueCertificate = async (item: any) => {
    try {
      const studentName = item.user.name || `${item.user.firstName || ''} ${item.user.surname || ''}`.trim() || 'Student';
      const bestScore = item.bestResult ? item.bestResult.score : 100;

      await certificationService.issueCertificate({
        userId: item.user.id,
        userName: studentName,
        courseId: item.course.id,
        courseTitle: item.course.title,
        examId: item.exam ? item.exam.id : 'manual',
        score: bestScore
      } as any);

      showToast(`Certificate successfully generated for ${studentName}!`, "success");
      loadAllData();
    } catch (err) {
      console.error("Error issuing certificate:", err);
      showToast("Failed to generate certificate", "error");
    }
  };

  // Open Certificate Preview Modal
  const handleViewCertificate = (cert: Certificate) => {
    setSelectedCert(cert);
    setShowCertPreview(true);
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  const filteredExams = exams.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (e.courseName && e.courseName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (e.courseTitle && e.courseTitle.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredCerts = issuedCertificates.filter(c => 
    (c.studentFullName || c.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.courseName || c.courseTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.certificateNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="cert-container">
      <PageHeader 
        title="Certification Portal" 
        subtitle="Manage certification exams and generate credentials for external course buyers."
      />

      {/* Tabs Menu */}
      <div className="cert-tabs">
        <button 
          className={`cert-tab ${activeTab === 'exams' ? 'active' : ''}`}
          onClick={() => handleTabChange('exams')}
        >
          Certification Exams
        </button>
        <button 
          className={`cert-tab ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => handleTabChange('students')}
        >
          Eligibility & Grading
        </button>
        <button 
          className={`cert-tab ${activeTab === 'issued' ? 'active' : ''}`}
          onClick={() => handleTabChange('issued')}
        >
          Issued Certificates
        </button>
      </div>

      {/* Search and Action Header */}
      <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
        <SearchInput 
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder={
            activeTab === 'exams' ? 'Search exams by title or course...' :
            activeTab === 'students' ? 'Search students by name, email, or course...' :
            'Search certificates by name, course, or certificate number...'
          }
          style={{ maxWidth: '400px', flex: 1 }}
        />

        {activeTab === 'exams' && (
          <button className="btn btn-primary flex items-center gap-2" onClick={handleOpenCreateExam}>
            <Plus size={18} />
            Create Exam
          </button>
        )}
      </div>

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <LoadingState message="Fetching records..." />
      ) : (
        <>
          {/* TAB 1: Certification Exams */}
          {activeTab === 'exams' && (
            filteredExams.length === 0 ? (
              <EmptyState 
                title="No Certification Exams" 
                description="Create custom certification tests that external buyers must pass to obtain their certificates."
                actionLabel="Create Certification Exam"
                onAction={handleOpenCreateExam}
              />
            ) : (
              <div className="cert-exams-grid">
                {filteredExams.map(exam => (
                  <div className="cert-exam-card" key={exam.id}>
                    <div className="cert-exam-header">
                      <div>
                        <span className="cert-exam-course">{exam.courseTitle || 'Generic Course'}</span>
                        <h3 className="cert-exam-title">{exam.title}</h3>
                      </div>
                      <label className="switch">
                        <input 
                          type="checkbox" 
                          checked={exam.isActive} 
                          onChange={() => handleToggleExamStatus(exam.id, exam.isActive)}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    <p className="cert-exam-desc">{exam.description || 'No description provided.'}</p>

                    <div className="cert-exam-meta">
                      <div className="cert-meta-item">
                        <Clock size={16} />
                        <span>{exam.duration} mins</span>
                      </div>
                      <div className="cert-meta-item">
                        <Award size={16} />
                        <span>Pass: {exam.passingPercentage}%</span>
                      </div>
                      <div className="cert-meta-item">
                        <Calendar size={16} />
                        <span>{new Date(exam.scheduledDate).toLocaleDateString()}</span>
                      </div>
                      <div className="cert-meta-item">
                        <FileCheck size={16} />
                        <span>{exam.questions?.length || 0} Questions</span>
                      </div>
                    </div>

                    <div className="cert-exam-actions">
                      <button 
                        className="btn btn-secondary flex-1 flex items-center justify-center gap-2"
                        onClick={() => handleOpenEditExam(exam)}
                      >
                        <Edit3 size={16} />
                        Edit
                      </button>
                      <button 
                        className="btn btn-danger-subtle p-2"
                        onClick={() => handleConfirmDeleteExam(exam.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* TAB 2: Student Eligibility */}
          {activeTab === 'students' && (
            getEligiblePairs().length === 0 ? (
              <EmptyState 
                title="No External Students Found" 
                description="Only students purchased external courses (who are not assigned to internal batches) will show here."
              />
            ) : (
              <div className="cert-table-container">
                <table className="cert-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Purchased Course</th>
                      <th>Video Progress</th>
                      <th>Exam Performance</th>
                      <th>Certificate Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getEligiblePairs().map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <div className="cert-student-profile">
                            <div className="cert-student-avatar">
                              {(item.user.firstName || item.user.name || '?')[0].toUpperCase()}
                            </div>
                            <div className="cert-student-info">
                              <span className="cert-student-name">
                                {item.user.name || `${item.user.firstName || ''} ${item.user.surname || ''}`.trim()}
                              </span>
                              <span className="cert-student-email">{item.user.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{item.course.title}</span>
                        </td>
                        <td>
                          <div className="cert-progress-wrapper">
                            <span style={{ fontWeight: 600 }}>{item.videoProgress}%</span>
                            <div className="cert-progress-bar">
                              <div 
                                className="cert-progress-fill" 
                                style={{ width: `${item.videoProgress}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          {item.exam ? (
                            item.bestResult ? (
                              <div className="flex flex-col gap-1">
                                <span className={`cert-badge ${item.bestResult.passed ? 'cert-badge-success' : 'cert-badge-danger'}`}>
                                  {item.bestResult.passed ? 'PASSED' : 'FAILED'} ({item.bestResult.score}%)
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                  Attempts: {item.attempts} / {item.exam.maxAttempts}
                                </span>
                              </div>
                            ) : (
                              <span className="cert-badge cert-badge-warning">NOT ATTEMPTED</span>
                            )
                          ) : (
                            <span className="cert-badge cert-badge-danger">EXAM NOT SCHEDULED</span>
                          )}
                        </td>
                        <td>
                          {item.certificate ? (
                            <span className="cert-badge cert-badge-success">ISSUED</span>
                          ) : item.isEligibleForCert ? (
                            <span className="cert-badge cert-badge-info">READY TO GENERATE</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <span className="cert-badge cert-badge-warning">INCOMPLETE</span>
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', maxWidth: '160px' }}>
                                {!item.exam && 'Needs exam scheduling.'}
                                {item.exam && item.videoProgress < (item.exam.minVideoCompletionPercentage ?? 100) && 'Watch all course videos.'}
                                {item.exam && !item.bestResult && ' Must attempt & pass the scheduled exam.'}
                                {item.exam && item.bestResult && !item.bestResult.passed && ' Has not passed passing criteria.'}
                              </span>
                            </div>
                          )}
                        </td>
                        <td>
                          {item.certificate ? (
                            <button 
                              className="btn btn-secondary btn-sm flex items-center gap-1"
                              onClick={() => handleViewCertificate(item.certificate)}
                            >
                              <Eye size={14} />
                              View
                            </button>
                          ) : (
                            <button 
                              className="btn btn-primary btn-sm flex items-center gap-1"
                              disabled={!item.isEligibleForCert}
                              onClick={() => handleIssueCertificate(item)}
                            >
                              <Award size={14} />
                              Generate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* TAB 3: Issued Certificates */}
          {activeTab === 'issued' && (
            filteredCerts.length === 0 ? (
              <EmptyState 
                title="No Certificates Issued Yet" 
                description="Once external buyers complete their requirements and pass the scheduled exam, generated certificates will show here."
              />
            ) : (
              <div className="cert-table-container">
                <table className="cert-table">
                  <thead>
                    <tr>
                      <th>Certificate ID</th>
                      <th>Student Name</th>
                      <th>Course</th>
                      <th>Passing Score</th>
                      <th>Issued Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCerts.map((cert) => (
                      <tr key={cert.id}>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>
                            {cert.certificateNumber}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{cert.studentFullName || cert.userName}</span>
                        </td>
                        <td>{cert.courseName || cert.courseTitle}</td>
                        <td>
                          <span className="cert-badge cert-badge-success">{cert.examScore ?? cert.score}%</span>
                        </td>
                        <td>
                          {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td>
                          <button 
                            className="btn btn-secondary btn-sm flex items-center gap-1"
                            onClick={() => handleViewCertificate(cert)}
                          >
                            <Eye size={14} />
                            View Certificate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}

      {/* MODAL 1: Create/Edit Certification Exam */}
      {showExamModal && (
        <Modal 
          isOpen={showExamModal} 
          onClose={() => setShowExamModal(false)}
          title={editingExamId ? "Edit Certification Exam" : "Create Certification Exam"}
        >
          <form onSubmit={handleSaveExam}>
            <FormRow>
              <FormField label="Exam Title" required>
                <input 
                  type="text" 
                  className="form-control"
                  value={examFormData.title}
                  onChange={(e) => setExamFormData({ ...examFormData, title: e.target.value })}
                  placeholder="e.g. React Certified Associate Examination"
                  required
                />
              </FormField>
            </FormRow>

            <FormRow>
              <FormField label="Target Course" required>
                <CustomSelect
                  value={examFormData.courseId}
                  onChange={(val) => setExamFormData({ ...examFormData, courseId: val })}
                  options={courses.map(c => ({ value: c.id, label: c.title }))}
                  placeholder="Select target course for certificate eligibility"
                />
              </FormField>
            </FormRow>

            <FormRow>
              <FormField label="Exam Description">
                <textarea 
                  className="form-control"
                  rows={2}
                  value={examFormData.description}
                  onChange={(e) => setExamFormData({ ...examFormData, description: e.target.value })}
                  placeholder="Provide exam details, instructions or target certificate information..."
                />
              </FormField>
            </FormRow>

            <FormRow>
              <FormField label="Duration (mins)" required>
                <input 
                  type="number" 
                  className="form-control"
                  value={examFormData.duration}
                  onChange={(e) => setExamFormData({ ...examFormData, duration: e.target.value })}
                  min="5"
                  required
                />
              </FormField>
              <FormField label="Total Marks" required>
                <input 
                  type="number" 
                  className="form-control"
                  value={examFormData.totalMarks}
                  onChange={(e) => setExamFormData({ ...examFormData, totalMarks: e.target.value })}
                  min="1"
                  required
                />
              </FormField>
            </FormRow>

            <FormRow>
              <FormField label="Passing Score (%)" required>
                <input 
                  type="number" 
                  className="form-control"
                  value={examFormData.passingPercentage}
                  onChange={(e) => setExamFormData({ ...examFormData, passingPercentage: e.target.value })}
                  min="10"
                  max="100"
                  required
                />
              </FormField>
              <FormField label="Max Attempts Allowed" required>
                <input 
                  type="number" 
                  className="form-control"
                  value={examFormData.maxAttempts}
                  onChange={(e) => setExamFormData({ ...examFormData, maxAttempts: e.target.value })}
                  min="1"
                  required
                />
              </FormField>
            </FormRow>

            <FormRow>
              <FormField label="Min Video Progress (%)" required>
                <input 
                  type="number" 
                  className="form-control"
                  value={examFormData.minVideoCompletionPercentage}
                  onChange={(e) => setExamFormData({ ...examFormData, minVideoCompletionPercentage: e.target.value })}
                  min="0"
                  max="100"
                  required
                />
              </FormField>
              <FormField label="Scheduled Date" required>
                <input 
                  type="datetime-local" 
                  className="form-control"
                  value={examFormData.scheduledDate}
                  onChange={(e) => setExamFormData({ ...examFormData, scheduledDate: e.target.value })}
                  required
                />
              </FormField>
            </FormRow>

            {/* Question Builder */}
            <div className="mb-4 mt-6">
              <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Exam Questions ({examFormData.questions.length})</span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddQuestion}>
                  + Add Question
                </button>
              </h4>
              
              <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '8px', marginTop: '12px' }}>
                {examFormData.questions.length === 0 ? (
                  <div className="text-center p-4 border border-dashed rounded" style={{ color: 'var(--text-secondary)' }}>
                    No questions added yet. Click "+ Add Question" to begin.
                  </div>
                ) : (
                  examFormData.questions.map((q, qIdx) => (
                    <div className="q-builder-container" key={qIdx}>
                      <button 
                        type="button" 
                        className="btn-delete-q"
                        onClick={() => handleRemoveQuestion(qIdx)}
                      >
                        <Trash2 size={14} />
                      </button>

                      <div className="mb-3">
                        <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Question {qIdx + 1}</label>
                        <input 
                          type="text"
                          className="form-control mt-1"
                          value={q.questionText}
                          onChange={(e) => handleUpdateQuestionText(qIdx, e.target.value)}
                          placeholder="Enter question prompt..."
                          required
                        />
                      </div>

                      <div className="q-options-grid">
                        {q.options.map((opt: string, oIdx: number) => (
                          <div className="q-option-field" key={oIdx}>
                            <input 
                              type="radio" 
                              name={`correct_${qIdx}`}
                              checked={q.correctOptionIndex === oIdx}
                              onChange={() => handleUpdateQuestionCorrect(qIdx, oIdx)}
                            />
                            <input 
                              type="text"
                              className="form-control"
                              value={opt}
                              onChange={(e) => handleUpdateQuestionOption(qIdx, oIdx, e.target.value)}
                              placeholder={`Option ${oIdx + 1}`}
                              required
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <FormActions>
              <button type="button" className="btn btn-secondary" onClick={() => setShowExamModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingExamId ? "Update Exam" : "Publish Exam"}
              </button>
            </FormActions>
          </form>
        </Modal>
      )}

      {/* MODAL 2: Delete Exam confirmation */}
      {showDeleteModal && (
        <Modal 
          isOpen={showDeleteModal} 
          onClose={() => setShowDeleteModal(false)}
          title="Delete Exam"
        >
          <div className="p-4">
            <p>Are you sure you want to delete this certification exam? Students won't be able to attempt it anymore.</p>
            <FormActions style={{ marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteExam}>
                Delete
              </button>
            </FormActions>
          </div>
        </Modal>
      )}

      {/* MODAL 3: Premium Certificate Preview & Print */}
      {showCertPreview && selectedCert && (
        <div className="cert-preview-overlay" onClick={() => setShowCertPreview(false)}>
          <div className="cert-preview-card" onClick={(e) => e.stopPropagation()}>
            <div className="cert-preview-header">
              <h3>Certificate Viewer</h3>
              <div className="flex gap-2">
                <button className="btn btn-primary flex items-center gap-1" onClick={handlePrintCertificate}>
                  <Printer size={16} />
                  Print
                </button>
                <button className="btn btn-secondary p-2" onClick={() => setShowCertPreview(false)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="cert-preview-body">
              <div className="certificate-print-area">
                <div className="certificate-inner-border">
                  <div className="cert-logo-container">
                    <span style={{ fontSize: '24px', fontWeight: '900', color: '#ffffff', letterSpacing: '2px' }}>INNOV8</span>
                  </div>

                  <div>
                    <h2 className="cert-title-primary">Certificate of Excellence</h2>
                    <p className="cert-subtitle-primary">This credential honors the accomplishment of</p>
                  </div>

                  <div>
                    <div className="cert-recipient-name">{selectedCert.studentFullName || selectedCert.userName}</div>
                    <p className="cert-statement">for successfully meeting all academic requirements and passing the examination for</p>
                    <p className="cert-course-statement">
                      <span className="cert-course-name">{selectedCert.courseName || selectedCert.courseTitle}</span>
                    </p>
                  </div>

                  <div className="cert-badge-seal">
                    <div className="cert-seal-star">★</div>
                  </div>

                  <div className="cert-footer-row">
                    <div className="cert-footer-item">
                      <div className="cert-signature-line"></div>
                      <span className="cert-footer-label">DIRECTOR SIGNATURE</span>
                    </div>

                    <div className="cert-footer-item">
                      <span className="cert-footer-label">CERTIFICATE NO</span>
                      <span className="cert-footer-value" style={{ fontFamily: 'monospace' }}>
                        {selectedCert.certificateNumber}
                      </span>
                    </div>

                    <div className="cert-footer-item">
                      <span className="cert-footer-label">DATE OF ISSUANCE</span>
                      <span className="cert-footer-value">
                        {selectedCert.issuedAt ? new Date(selectedCert.issuedAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
