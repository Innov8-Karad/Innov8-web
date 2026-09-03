// ═══════════════════════════════════════════════════════════════════════════════
// evaluateInterview — Cloud Function
// ═══════════════════════════════════════════════════════════════════════════════
// Evaluates all answers from a completed interview session in a single LLM call.
// Returns a comprehensive scored report with per-question feedback.
// ═══════════════════════════════════════════════════════════════════════════════

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { callLLM } from "../utils/llmClient";
import { validateAuth } from "../utils/auth";

// Declare the secret — Firebase will inject it at runtime from Secret Manager
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// ── Types ────────────────────────────────────────────────────────────────────

interface EvaluateRequest {
    sessionId: string;
}

interface QuestionFeedback {
    questionId: string;
    questionText: string;
    answerTranscript: string;
    score: number;
    feedback: string;
    keyPoints: string[];
}

interface EvaluationReport {
    overallScore: number;
    summary: string;
    strengths: string[];
    improvements: string[];
    perQuestionFeedback: QuestionFeedback[];
}

export const evaluateInterview = onCall(
    {
        region: "asia-south1",
        secrets: [geminiApiKey],
        timeoutSeconds: 120,
        memory: "512MiB",
    },
    async (request) => {
        // 1. Authenticate & authorize
        await validateAuth(request);
        const uid = request.auth!.uid;
        const db = admin.firestore();

        // 2. Validate input
        const { sessionId } = request.data as EvaluateRequest;

        if (!sessionId || typeof sessionId !== "string") {
            throw new HttpsError("invalid-argument", "Missing sessionId.");
        }

        // 3. Read session document
        const sessionRef = db.collection("interviewSessions").doc(sessionId);
        const sessionDoc = await sessionRef.get();

        if (!sessionDoc.exists) {
            throw new HttpsError("not-found", "Interview session not found.");
        }

        const session = sessionDoc.data()!;

        // 4. Verify ownership
        if (session.studentId !== uid) {
            throw new HttpsError(
                "permission-denied",
                "You can only evaluate your own interview sessions."
            );
        }

        // 5. Verify session state
        if (session.status === "evaluated") {
            // Already evaluated — return existing report
            return {
                success: true,
                report: session.report,
            };
        }

        if (!session.answers || session.answers.length === 0) {
            throw new HttpsError(
                "failed-precondition",
                "No answers found. Complete the interview before requesting evaluation."
            );
        }

        // 6. Mark as evaluating
        await sessionRef.update({ status: "evaluating" });

        // 7. Build transcript for LLM
        const transcript = session.questions
            .map((q: any) => {
                const answer = session.answers.find((a: any) => a.questionId === q.id);
                return `Question ${q.order} (${q.type}): ${q.text}\nStudent's Answer: ${answer?.transcript || "[No answer provided]"}`;
            })
            .join("\n\n---\n\n");

        const systemInstruction = `You are a senior IT industry interviewer and career coach evaluating a mock interview transcript. Provide honest, constructive, and actionable feedback.

Rules:
- Score each question from 1 to 10 (1 = completely wrong/irrelevant, 10 = perfect industry-level answer)
- Overall score is from 1 to 100
- Be encouraging but honest — don't inflate scores for weak answers
- For each question, list 2-4 key points the student SHOULD have mentioned (whether they did or not)
- Strengths: highlight what the student did well (communication, specific knowledge areas, structure)
- Improvements: specific, actionable suggestions (e.g., "Study SQL joins" not just "Improve databases")
- Summary: 2-3 sentences summarizing the overall performance
- If the answer is empty or "[No answer provided]", score it 1 and note that the question was unanswered
- Return ONLY valid JSON, no extra text`;

        const prompt = `Evaluate the following mock interview for a "${session.role}" position at "${session.difficulty}" difficulty level.

TRANSCRIPT:
${transcript}

Return JSON with this exact structure:
{
  "overallScore": <number 1-100>,
  "summary": "<2-3 sentence summary>",
  "strengths": ["<strength1>", "<strength2>", ...],
  "improvements": ["<improvement1>", "<improvement2>", ...],
  "perQuestionFeedback": [
    {
      "questionId": "<id matching the question>",
      "questionText": "<the question text>",
      "answerTranscript": "<what the student said>",
      "score": <number 1-10>,
      "feedback": "<specific feedback for this answer>",
      "keyPoints": ["<key point 1>", "<key point 2>", ...]
    }
  ]
}`;

        let report: EvaluationReport;
        try {
            const response = await callLLM<EvaluationReport>(prompt, {
                systemInstruction,
                temperature: 0.4,
                maxOutputTokens: 4096,
                jsonOutput: true,
            });

            if (!response.data) {
                throw new Error("LLM did not return valid evaluation data.");
            }

            report = response.data;

            // Validate report structure
            if (
                typeof report.overallScore !== "number" ||
                !Array.isArray(report.strengths) ||
                !Array.isArray(report.improvements) ||
                !Array.isArray(report.perQuestionFeedback)
            ) {
                throw new Error("Evaluation report has invalid structure.");
            }

            // Clamp overall score to 1-100
            report.overallScore = Math.max(1, Math.min(100, Math.round(report.overallScore)));

            // Clamp per-question scores to 1-10
            report.perQuestionFeedback = report.perQuestionFeedback.map((qf) => ({
                ...qf,
                score: Math.max(1, Math.min(10, Math.round(qf.score))),
            }));
        } catch (error: any) {
            console.error("[evaluateInterview] LLM error:", error);
            // Reset status so student can retry
            await sessionRef.update({ status: "completed" });
            throw new HttpsError(
                "internal",
                "Failed to evaluate interview. Please try again."
            );
        }

        // 8. Save report to session document
        await sessionRef.update({
            report,
            status: "evaluated",
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(
            `[evaluateInterview] Session ${sessionId} evaluated — overall score: ${report.overallScore}`
        );

        return {
            success: true,
            report,
        };
    }
);
