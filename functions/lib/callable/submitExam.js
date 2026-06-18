"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitExam = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
exports.submitExam = (0, https_1.onCall)({ region: "asia-south1" }, async (request) => {
    // 1. Ensure user is authenticated
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in to submit an exam.");
    }
    const uid = request.auth.uid;
    const { examId, answers, timeTaken } = request.data;
    if (!examId || !Array.isArray(answers) || typeof timeTaken !== "number") {
        throw new https_1.HttpsError("invalid-argument", "Missing required fields.");
    }
    const db = admin.firestore();
    try {
        // 2. Fetch the exam to get questions and marks
        const examDoc = await db.collection("exams").doc(examId).get();
        if (!examDoc.exists) {
            throw new https_1.HttpsError("not-found", "Exam not found.");
        }
        const examData = examDoc.data();
        if (!examData) {
            throw new https_1.HttpsError("not-found", "Exam data missing.");
        }
        // 3. Fetch the secure answers
        const answersDoc = await db.collection("exam_answers").doc(examId).get();
        if (!answersDoc.exists) {
            throw new https_1.HttpsError("not-found", "Exam answers not found.");
        }
        const secureAnswersData = answersDoc.data();
        if (!secureAnswersData || !Array.isArray(secureAnswersData.answers)) {
            throw new https_1.HttpsError("internal", "Exam answers data corrupted.");
        }
        const correctAnswers = secureAnswersData.answers; // Array of { questionId, correctAnswerIndex }
        // 4. Calculate Score
        let correctCount = 0;
        const totalQuestions = examData.questions?.length || correctAnswers.length || 1;
        const totalMarks = examData.totalMarks || totalQuestions;
        const evaluatedAnswers = [];
        for (const submittedAnswer of answers) {
            const { questionId, selectedOption } = submittedAnswer;
            // Find correct answer
            const correctObj = correctAnswers.find((ans) => ans.questionId === questionId);
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
    }
    catch (error) {
        console.error("Error submitting exam:", error);
        throw new https_1.HttpsError("internal", error.message || "An error occurred while scoring the exam.");
    }
});
//# sourceMappingURL=submitExam.js.map