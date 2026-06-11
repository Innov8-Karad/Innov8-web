import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

export const submitExam = functions.region("asia-south1").https.onCall(async (data, context) => {
    // 1. Ensure user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in to submit an exam.");
    }
    const uid = context.auth.uid;

    const { examId, answers, timeTaken } = data;

    if (!examId || !Array.isArray(answers) || typeof timeTaken !== "number") {
        throw new functions.https.HttpsError("invalid-argument", "Missing required fields.");
    }

    const db = admin.firestore();

    try {
        // 2. Fetch the exam to get questions and marks
        const examDoc = await db.collection("exams").doc(examId).get();
        if (!examDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Exam not found.");
        }
        const examData = examDoc.data();
        if (!examData) {
            throw new functions.https.HttpsError("not-found", "Exam data missing.");
        }

        // 3. Fetch the secure answers
        const answersDoc = await db.collection("exam_answers").doc(examId).get();
        if (!answersDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Exam answers not found.");
        }
        const secureAnswersData = answersDoc.data();
        if (!secureAnswersData || !Array.isArray(secureAnswersData.answers)) {
            throw new functions.https.HttpsError("internal", "Exam answers data corrupted.");
        }

        const correctAnswers = secureAnswersData.answers; // Array of { questionId, correctAnswerIndex }

        // 4. Calculate Score
        let score = 0;
        const totalMarks = examData.totalMarks || examData.questions?.length || 0;
        const evaluatedAnswers: any[] = [];

        for (const submittedAnswer of answers) {
            const { questionId, selectedOption } = submittedAnswer;
            
            // Find correct answer
            const correctObj = correctAnswers.find((ans: any) => ans.questionId === questionId);
            const isCorrect = correctObj && correctObj.correctAnswerIndex === selectedOption;

            if (isCorrect) {
                score += 1;
            }

            evaluatedAnswers.push({
                questionId,
                selectedOption,
                isCorrect,
            });
        }

        const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100 * 100) / 100 : 0;

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
        throw new functions.https.HttpsError("internal", error.message || "An error occurred while scoring the exam.");
    }
});
