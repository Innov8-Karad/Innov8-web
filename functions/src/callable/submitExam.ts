import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const submitExam = onCall(
  { region: "asia-south1" },
  async (request) => {
    // 1. Ensure user is authenticated
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "You must be logged in to submit an exam.");
    }
    const uid = request.auth.uid;

    const { examId, answers, timeTaken } = request.data;

    if (!examId || !Array.isArray(answers) || typeof timeTaken !== "number") {
        throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    const db = admin.firestore();

    try {
        // 2. Fetch the exam to get questions and marks
        const examDoc = await db.collection("exams").doc(examId).get();
        if (!examDoc.exists) {
            throw new HttpsError("not-found", "Exam not found.");
        }
        const examData = examDoc.data();
        if (!examData) {
            throw new HttpsError("not-found", "Exam data missing.");
        }

        // 3. Fetch the secure answers
        const answersDoc = await db.collection("exam_answers").doc(examId).get();
        if (!answersDoc.exists) {
            throw new HttpsError("not-found", "Exam answers not found.");
        }
        const secureAnswersData = answersDoc.data();
        if (!secureAnswersData || !Array.isArray(secureAnswersData.answers)) {
            throw new HttpsError("internal", "Exam answers data corrupted.");
        }

        const correctAnswers = secureAnswersData.answers; // Array of { questionId, correctAnswerIndex }

        // 4. Calculate Score
        let correctCount = 0;
        const totalQuestions = examData.questions?.length || correctAnswers.length || 1;
        const totalMarks = examData.totalMarks || totalQuestions;
        const evaluatedAnswers: any[] = [];

        for (const submittedAnswer of answers) {
            const { questionId, selectedOption } = submittedAnswer;
            
            // Find correct answer
            const correctObj = correctAnswers.find((ans: any) => ans.questionId === questionId);
            const isCorrect = correctObj && correctObj.correctAnswerIndex === selectedOption;

            if (isCorrect) {
                correctCount += 1;
            }

            evaluatedAnswers.push({
                questionId,
                selectedOption,
                isCorrect,
            });
        }

        const score = Math.round((correctCount / totalQuestions) * totalMarks * 100) / 100;
        const percentage = Math.round((correctCount / totalQuestions) * 100 * 100) / 100;

        const resultData = {
            examId,
            userId: uid,
            score,
            totalMarks,
            percentage,
            answers: evaluatedAnswers,
            timeTaken,
            submittedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // 5. Save the result
        const resultRef = await db.collection("examResults").add(resultData);

        return {
            success: true,
            resultId: resultRef.id,
            score,
            totalMarks,
            percentage,
            answers: evaluatedAnswers,
        };
    } catch (error: any) {
        console.error("Error submitting exam:", error);
        throw new HttpsError("internal", error.message || "An error occurred while scoring the exam.");
    }
});
