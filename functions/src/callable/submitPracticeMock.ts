import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

function getTodayDateString(timeZone = "Asia/Kolkata"): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

export const submitPracticeMock = onCall(
  { region: "asia-south1" },
  async (request) => {
    // 1. Ensure user is authenticated
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in to submit a practice mock.");
    }

    const uid = request.auth.uid;
    const { sessionId, answers, timeTaken } = request.data || {};

    if (!sessionId || !Array.isArray(answers) || typeof timeTaken !== "number") {
      throw new HttpsError("invalid-argument", "Missing required fields: sessionId, answers, timeTaken.");
    }

    const db = admin.firestore();

    try {
      // 2. Fetch and validate session
      const sessionRef = db.collection("practice_mock_sessions").doc(sessionId);
      const sessionDoc = await sessionRef.get();

      if (!sessionDoc.exists) {
        throw new HttpsError("not-found", "Practice mock session not found.");
      }

      const sessionData = sessionDoc.data()!;
      if (sessionData.userId !== uid) {
        throw new HttpsError("permission-denied", "This session does not belong to your account.");
      }

      if (sessionData.status === "submitted") {
        throw new HttpsError("failed-precondition", "This practice mock session has already been submitted.");
      }

      const sessionQuestionIds: string[] = sessionData.questionIds || [];
      const totalQuestions = sessionQuestionIds.length;

      // 3. Fetch questions and secure answers
      const questionDocs = await Promise.all(
        sessionQuestionIds.map((qid) => db.collection("practice_mock_questions").doc(qid).get())
      );
      const answerDocs = await Promise.all(
        sessionQuestionIds.map((qid) => db.collection("practice_mock_answers").doc(qid).get())
      );

      const questionMap = new Map<string, any>();
      questionDocs.forEach((doc) => {
        if (doc.exists) questionMap.set(doc.id, doc.data());
      });

      const answerMap = new Map<string, any>();
      answerDocs.forEach((doc) => {
        if (doc.exists) answerMap.set(doc.id, doc.data());
      });

      // 4. Grade the submission
      let correctCount = 0;
      const submittedMap = new Map<string, number>();
      for (const ans of answers) {
        submittedMap.set(ans.questionId, ans.selectedOption);
      }

      const evaluatedAnswers: any[] = [];

      for (const qid of sessionQuestionIds) {
        const qData = questionMap.get(qid) || {};
        const aData = answerMap.get(qid) || {};
        const selectedOption = submittedMap.has(qid) ? submittedMap.get(qid)! : -1;
        const correctAnswerIndex = typeof aData.correctAnswerIndex === "number" ? aData.correctAnswerIndex : 0;
        const isCorrect = selectedOption !== -1 && selectedOption === correctAnswerIndex;

        if (isCorrect) {
          correctCount += 1;
        }

        evaluatedAnswers.push({
          questionId: qid,
          questionText: qData.questionText || "",
          chapter: qData.chapter || "",
          options: qData.options || [],
          selectedOption,
          correctAnswerIndex,
          correctAnswerText: aData.correctAnswerText || (qData.options && qData.options[correctAnswerIndex]) || "",
          isCorrect,
          explanation: aData.explanation || "",
        });
      }

      const score = correctCount;
      const totalMarks = totalQuestions;
      const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100 * 100) / 100 : 0;

      // 5. Update session status
      await sessionRef.update({
        status: "submitted",
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
        score,
        totalMarks,
        percentage,
      });

      // 6. Update user tracking & increment daily attempt counter
      const todayStr = getTodayDateString();
      const userTrackingRef = db.collection("practice_mock_user_tracking").doc(uid);
      const trackingDoc = await userTrackingRef.get();
      const trackingData = trackingDoc.data() || { attemptsToday: 0, lastAttemptDate: "" };

      const currentAttemptsToday = trackingData.lastAttemptDate === todayStr ? (trackingData.attemptsToday || 0) : 0;

      await userTrackingRef.set(
        {
          userId: uid,
          lastAttemptDate: todayStr,
          attemptsToday: currentAttemptsToday + 1,
          totalCompletedAttempts: (trackingData.totalCompletedAttempts || 0) + 1,
          lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // 7. Save to practice_mock_results
      const resultDoc = {
        sessionId,
        userId: uid,
        score,
        totalMarks,
        percentage,
        timeTaken,
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
        dateString: todayStr,
        answers: evaluatedAnswers,
      };

      const resultRef = await db.collection("practice_mock_results").add(resultDoc);

      return {
        success: true,
        resultId: resultRef.id,
        score,
        totalMarks,
        percentage,
        timeTaken,
        answers: evaluatedAnswers,
      };
    } catch (err: any) {
      if (err instanceof HttpsError) {
        throw err;
      }
      console.error("Error submitting practice mock:", err);
      throw new HttpsError("internal", err.message || "Failed to submit practice mock.");
    }
  }
);
