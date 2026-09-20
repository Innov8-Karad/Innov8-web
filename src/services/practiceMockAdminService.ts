import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import { COLLECTIONS } from '../constants';
import { LINUX_100_MCQS, type LinuxMCQ } from '../data/linuxMCQsData';

export interface PracticeMockConfig {
  isEnabled: boolean;
  title: string;
  description: string;
  displayBadge: string;
  activeSubject?: string;
  questionsPerTest: number;
  dailyAttemptLimit: number;
  durationMinutes: number;
  passPercentage: number;
  allowedBatchIds: string[];
  updatedAt?: unknown;
  updatedBy?: string;
}

export interface PracticeMockQuestionAdmin {
  id: string;
  questionNumber: number;
  subject?: string;
  chapter: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  correctAnswerText?: string;
  explanation?: string;
}

export const practiceMockAdminService = {
  /**
   * Fetch current global Practice Mock settings
   */
  async fetchConfig(): Promise<PracticeMockConfig> {
    const ref = doc(db, COLLECTIONS.PRACTICE_MOCK_CONFIG, 'default');
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      return {
        isEnabled: true,
        title: 'Practice Mock',
        description: 'Test your Linux Administration knowledge with 10 random MCQs daily.',
        displayBadge: 'Daily',
        questionsPerTest: 10,
        dailyAttemptLimit: 1,
        durationMinutes: 15,
        passPercentage: 60,
        allowedBatchIds: ['all'],
        activeSubject: 'Linux Administration',
      };
    }
    const data = snap.data() as PracticeMockConfig;
    return {
      ...data,
      activeSubject: data.activeSubject || 'Linux Administration',
    };
  },

  /**
   * Update Practice Mock global settings
   */
  async updateConfig(config: Partial<PracticeMockConfig>, userId?: string): Promise<void> {
    const ref = doc(db, COLLECTIONS.PRACTICE_MOCK_CONFIG, 'default');
    await setDoc(
      ref,
      {
        ...config,
        updatedAt: serverTimestamp(),
        updatedBy: userId || 'admin',
      },
      { merge: true }
    );
  },

  /**
   * Fetch all questions and their corresponding answers for the admin table
   */
  async fetchQuestions(): Promise<PracticeMockQuestionAdmin[]> {
    const [qSnap, aSnap] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.PRACTICE_MOCK_QUESTIONS)),
      getDocs(collection(db, COLLECTIONS.PRACTICE_MOCK_ANSWERS)),
    ]);

    const answerMap = new Map<string, Record<string, unknown>>();
    aSnap.docs.forEach((d) => answerMap.set(d.id, d.data() as Record<string, unknown>));

    const list: PracticeMockQuestionAdmin[] = qSnap.docs.map((d) => {
      const qData = d.data();
      const aData = answerMap.get(d.id) || {};
      return {
        id: d.id,
        questionNumber: qData.questionNumber || 0,
        subject: qData.subject || 'Linux Administration',
        chapter: qData.chapter || 'General',
        questionText: qData.questionText || '',
        options: qData.options || ['', '', '', ''],
        correctAnswerIndex: typeof aData.correctAnswerIndex === 'number' ? aData.correctAnswerIndex : 0,
        correctAnswerText: typeof aData.correctAnswerText === 'string' ? aData.correctAnswerText : '',
        explanation: typeof aData.explanation === 'string' ? aData.explanation : '',
      };
    });

    list.sort((a, b) => (a.questionNumber || 0) - (b.questionNumber || 0));
    return list;
  },

  /**
   * Create or update a single question and its answer
   */
  async saveQuestion(q: PracticeMockQuestionAdmin): Promise<void> {
    const questionId = q.id || `pmq_${Date.now()}`;
    const batch = writeBatch(db);

    const qRef = doc(db, COLLECTIONS.PRACTICE_MOCK_QUESTIONS, questionId);
    batch.set(
      qRef,
      {
        id: questionId,
        questionNumber: Number(q.questionNumber) || 1,
        subject: q.subject?.trim() || 'Linux Administration',
        chapter: q.chapter.trim() || 'General',
        questionText: q.questionText.trim(),
        options: q.options.map((o) => o.trim()),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    const aRef = doc(db, COLLECTIONS.PRACTICE_MOCK_ANSWERS, questionId);
    const correctIdx = Number(q.correctAnswerIndex) || 0;
    batch.set(
      aRef,
      {
        questionId,
        correctAnswerIndex: correctIdx,
        correctAnswerText: q.options[correctIdx] || '',
        explanation: q.explanation?.trim() || '',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await batch.commit();
  },

  /**
   * Delete a question from both questions and answers collections
   */
  async deleteQuestion(questionId: string): Promise<void> {
    await Promise.all([
      deleteDoc(doc(db, COLLECTIONS.PRACTICE_MOCK_QUESTIONS, questionId)),
      deleteDoc(doc(db, COLLECTIONS.PRACTICE_MOCK_ANSWERS, questionId)),
    ]);
  },

  /**
   * Seed all 100 Linux MCQs from the dataset into Firestore
   */
  async seedLinux100MCQs(): Promise<{ success: boolean; total: number }> {
    // Direct client-side batch write in chunks under 500 operations (100 questions + 100 answers = 200 operations)
    const batch = writeBatch(db);
    for (const item of LINUX_100_MCQS) {
      const qRef = doc(db, COLLECTIONS.PRACTICE_MOCK_QUESTIONS, item.id);
      batch.set(qRef, {
        id: item.id,
        questionNumber: item.questionNumber,
        chapter: item.chapter,
        questionText: item.questionText,
        options: item.options,
        createdAt: serverTimestamp(),
      }, { merge: true });

      const aRef = doc(db, COLLECTIONS.PRACTICE_MOCK_ANSWERS, item.id);
      batch.set(aRef, {
        questionId: item.id,
        correctAnswerIndex: item.correctAnswerIndex,
        correctAnswerText: item.correctAnswerText,
        explanation: item.explanation || '',
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }

    await batch.commit();

    // Ensure config exists
    const configRef = doc(db, COLLECTIONS.PRACTICE_MOCK_CONFIG, 'default');
    await setDoc(
      configRef,
      {
        isEnabled: true,
        title: 'Practice Mock',
        description: 'Daily Linux Administration MCQs Practice Mock',
        displayBadge: 'Daily',
        questionsPerTest: 10,
        dailyAttemptLimit: 1,
        durationMinutes: 15,
        passPercentage: 60,
        allowedBatchIds: ['all'],
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return { success: true, total: LINUX_100_MCQS.length };
  },

  /**
   * Parse formatted MCQ text (matching the PDF format)
   */
  parseMCQText(rawText: string): LinuxMCQ[] {
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed: LinuxMCQ[] = [];

    let currentChapter = 'General';
    let currentQuestion: Partial<LinuxMCQ> | null = null;
    let currentOptions: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Chapter header
      const chapterMatch = line.match(/^Chapter\s+\d+:\s*(.+)$/i);
      if (chapterMatch) {
        currentChapter = chapterMatch[1].trim();
        continue;
      }

      // Question start: e.g. "1. What is..." or "45. Which command..."
      const qMatch = line.match(/^(\d+)\.\s*(.+)$/);
      if (qMatch) {
        if (currentQuestion && currentQuestion.questionText && currentOptions.length >= 2) {
          parsed.push({
            id: `pmq_${parsed.length + 1}`,
            questionNumber: currentQuestion.questionNumber || parsed.length + 1,
            chapter: currentQuestion.chapter || currentChapter,
            questionText: currentQuestion.questionText,
            options: currentOptions,
            correctAnswerIndex: currentQuestion.correctAnswerIndex ?? 0,
            correctAnswerText: currentQuestion.correctAnswerText || '',
            explanation: currentQuestion.explanation || '',
          });
        }
        currentQuestion = {
          questionNumber: parseInt(qMatch[1], 10),
          questionText: qMatch[2].trim(),
          chapter: currentChapter,
        };
        currentOptions = [];
        continue;
      }

      // Options: A) ... B) ... C) ... D) ...
      const optMatch = line.match(/^([A-D])\)\s*(.+)$/i);
      if (optMatch) {
        currentOptions.push(optMatch[2].trim());
        continue;
      }

      // Answer line: Answer: B) Store boot-related files
      const ansMatch = line.match(/^Answer:\s*([A-D])\)?\s*(.*)$/i);
      if (ansMatch && currentQuestion) {
        const letter = ansMatch[1].toUpperCase();
        const letterIndex = letter.charCodeAt(0) - 'A'.charCodeAt(0);
        currentQuestion.correctAnswerIndex = letterIndex;
        currentQuestion.correctAnswerText = ansMatch[2].trim() || (currentOptions[letterIndex] || '');
        continue;
      }

      // Explanation (if present)
      const expMatch = line.match(/^Explanation:\s*(.+)$/i);
      if (expMatch && currentQuestion) {
        currentQuestion.explanation = expMatch[1].trim();
        continue;
      }
    }

    // Flush last question
    if (currentQuestion && currentQuestion.questionText && currentOptions.length >= 2) {
      parsed.push({
        id: `pmq_${parsed.length + 1}`,
        questionNumber: currentQuestion.questionNumber || parsed.length + 1,
        chapter: currentQuestion.chapter || currentChapter,
        questionText: currentQuestion.questionText,
        options: currentOptions,
        correctAnswerIndex: currentQuestion.correctAnswerIndex ?? 0,
        correctAnswerText: currentQuestion.correctAnswerText || '',
        explanation: currentQuestion.explanation || '',
      });
    }

    return parsed;
  },

  /**
   * Extract MCQs directly from an uploaded PDF document using Gemini 2.0 Flash
   */
  async extractQuestionsFromPdf(file: File, subject?: string, defaultChapter?: string): Promise<LinuxMCQ[]> {
    // Convert File to base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = (reader.result as string) || '';
        const rawBase64 = res.includes(',') ? res.split(',')[1] : res;
        resolve(rawBase64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

    const extractFn = httpsCallable<
      { pdfBase64: string; subject?: string; defaultChapter?: string },
      { success: boolean; total: number; questions: LinuxMCQ[] }
    >(functions, 'extractQuestionsFromPdf');

    const response = await extractFn({
      pdfBase64: base64Data,
      subject: subject?.trim() || undefined,
      defaultChapter: defaultChapter?.trim() || undefined,
    });

    return response.data.questions || [];
  },

  /**
   * Bulk import parsed/extracted questions into Firestore in safe chunks (max 200 per batch)
   */
  async bulkImportQuestions(questions: (LinuxMCQ | PracticeMockQuestionAdmin)[]): Promise<number> {
    const CHUNK_SIZE = 150; // 150 questions = 300 writes (safely within Firestore 500 write limit)
    let totalImported = 0;

    for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
      const chunk = questions.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      for (const q of chunk) {
        const qid = q.id || `pmq_${Date.now()}_${totalImported}`;
        const qRef = doc(db, COLLECTIONS.PRACTICE_MOCK_QUESTIONS, qid);
        batch.set(
          qRef,
          {
            id: qid,
            questionNumber: q.questionNumber || totalImported + 1,
            subject: q.subject?.trim() || 'Linux Administration',
            chapter: q.chapter || 'General',
            questionText: q.questionText,
            options: q.options,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );

        const aRef = doc(db, COLLECTIONS.PRACTICE_MOCK_ANSWERS, qid);
        const correctIdx = typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0;
        batch.set(
          aRef,
          {
            questionId: qid,
            correctAnswerIndex: correctIdx,
            correctAnswerText: q.correctAnswerText || q.options[correctIdx] || '',
            explanation: q.explanation || '',
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        totalImported++;
      }

      await batch.commit();
    }

    return totalImported;
  },
};
