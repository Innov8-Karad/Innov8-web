// ═══════════════════════════════════════════════════════════════════════════════
// generateInterviewQuestions — Cloud Function
// ═══════════════════════════════════════════════════════════════════════════════
// Generates a full set of interview questions for a mock interview session.
// Uses the LLM (Gemini) to create tailored questions based on role, difficulty,
// and question types selected by the student.
// ═══════════════════════════════════════════════════════════════════════════════

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { callLLM } from "../utils/llmClient";
import { validateAuth } from "../utils/auth";

// Declare the secret — Firebase will inject it at runtime from Secret Manager
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// ── Types ────────────────────────────────────────────────────────────────────

interface GenerateRequest {
    role: string;
    difficulty: "Easy" | "Medium" | "Hard";
    questionTypes: string[];
    mode: "text" | "video";
}

interface GeneratedQuestion {
    id: string;
    text: string;
    type: string;
    order: number;
}

export const generateInterviewQuestions = onCall(
    {
        region: "asia-south1",
        secrets: [geminiApiKey],
        timeoutSeconds: 60,
        memory: "256MiB",
    },
    async (request) => {
        // 1. Authenticate & authorize
        await validateAuth(request);
        const uid = request.auth!.uid;
        const userEmail = request.auth!.token.email || "";
        const db = admin.firestore();

        // 2. Validate input
        const { role, difficulty, questionTypes, mode } = request.data as GenerateRequest;

        if (!role || !difficulty || !Array.isArray(questionTypes) || questionTypes.length === 0) {
            throw new HttpsError(
                "invalid-argument",
                "Missing required fields: role, difficulty, questionTypes."
            );
        }

        if (!["Easy", "Medium", "Hard"].includes(difficulty)) {
            throw new HttpsError("invalid-argument", "Invalid difficulty level.");
        }

        if (!["text", "video"].includes(mode)) {
            throw new HttpsError("invalid-argument", "Invalid interview mode.");
        }

        // 3. Read config from Firestore for question count
        let questionCount = 5; // default fallback
        try {
            const configDoc = await db.doc("interviewConfig/settings").get();
            if (configDoc.exists) {
                const config = configDoc.data();
                const perDifficulty = config?.questionsPerDifficulty;
                if (perDifficulty && perDifficulty[difficulty]) {
                    questionCount = perDifficulty[difficulty];
                }
            }
        } catch (error: any) {
            if (error instanceof HttpsError) throw error;
            console.warn("[generateInterviewQuestions] Could not read config, using defaults:", error.message);
        }

        // 4. Generate questions via LLM
        const typesLabel = questionTypes.join(", ");

        const systemInstruction = `You are an expert IT industry interviewer with 15+ years of experience conducting technical interviews at top companies. Your job is to generate realistic, industry-standard interview questions.

Rules:
- Generate exactly ${questionCount} questions
- Questions must be appropriate for a "${role}" position at "${difficulty}" difficulty level
- Question types to include: ${typesLabel}
- Distribute questions evenly across the requested types
- For "Easy": ask fundamental concepts, definitions, and simple scenarios
- For "Medium": ask applied knowledge, design decisions, and moderate problem-solving
- For "Hard": ask system design, complex algorithms, edge cases, and deep domain expertise
- Each question must be clear, specific, and answerable in 1-3 minutes of speaking
- For "Coding" type questions: describe the problem verbally (the student will explain their approach, not write code)
- Do NOT repeat similar questions
- Return ONLY valid JSON, no extra text`;

        const prompt = `Generate ${questionCount} mock interview questions for a "${role}" position.
Difficulty: ${difficulty}
Question types: ${typesLabel}

Return a JSON array where each element has:
- "id": a unique string like "q1", "q2", etc.
- "text": the interview question text
- "type": one of [${questionTypes.map(t => `"${t}"`).join(", ")}]
- "order": sequential number starting from 1`;

        let questions: GeneratedQuestion[];
        try {
            const response = await callLLM<GeneratedQuestion[]>(prompt, {
                systemInstruction,
                temperature: 0.8,
                maxOutputTokens: 2048,
                jsonOutput: true,
            });

            if (!response.data || !Array.isArray(response.data)) {
                throw new Error("LLM did not return a valid question array.");
            }

            questions = response.data.map((q, idx) => ({
                id: q.id || `q${idx + 1}`,
                text: q.text,
                type: q.type,
                order: q.order || idx + 1,
            }));
        } catch (error: any) {
            console.error("[generateInterviewQuestions] LLM error:", error);
            throw new HttpsError(
                "internal",
                "Failed to generate interview questions. Please try again."
            );
        }

        // 5. Create session document in Firestore
        const sessionData = {
            studentId: uid,
            studentEmail: userEmail,
            role,
            difficulty,
            questionTypes,
            mode,
            status: "in_progress",
            questionCount: questions.length,
            questions,
            answers: [],
            report: null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            completedAt: null,
        };

        const sessionRef = await db.collection("interviewSessions").add(sessionData);

        console.log(`[generateInterviewQuestions] Session ${sessionRef.id} created for user ${uid} — ${questions.length} questions`);

        return {
            success: true,
            sessionId: sessionRef.id,
            questions,
        };
    }
);
