"use strict";
// ═══════════════════════════════════════════════════════════════════════════════
// extractQuestionsFromPdf — Cloud Function
// ═══════════════════════════════════════════════════════════════════════════════
// Extracts structured MCQs from an uploaded PDF document using Gemini 2.0 Flash.
// Parses questions, options A-D, correct answers, and explanations.
// ═══════════════════════════════════════════════════════════════════════════════
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
exports.extractQuestionsFromPdf = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const admin = __importStar(require("firebase-admin"));
const generative_ai_1 = require("@google/generative-ai");
const geminiApiKey = (0, params_1.defineSecret)("GEMINI_API_KEY");
const CANDIDATE_MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-2.5-flash",
];
function getApiKey() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        throw new Error("GEMINI_API_KEY is not set. Run: firebase functions:secrets:set GEMINI_API_KEY");
    }
    return key.trim();
}
exports.extractQuestionsFromPdf = (0, https_1.onCall)({
    region: "asia-south1",
    secrets: [geminiApiKey],
    timeoutSeconds: 180,
    memory: "512MiB",
}, async (request) => {
    // 1. Authenticate & ensure admin privileges
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be logged in to extract questions.");
    }
    const uid = request.auth.uid;
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
        throw new https_1.HttpsError("not-found", "User profile not found.");
    }
    const userData = userDoc.data();
    const role = request.auth.token?.role || userData?.role;
    if (role !== "admin" && role !== "superadmin") {
        throw new https_1.HttpsError("permission-denied", "Only administrators can extract questions.");
    }
    // 2. Validate input
    const { pdfBase64, rawText, subject, defaultChapter } = (request.data || {});
    if (!pdfBase64 && !rawText) {
        throw new https_1.HttpsError("invalid-argument", "Either pdfBase64 or rawText must be provided.");
    }
    const apiKey = getApiKey();
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const targetSubject = (subject && subject.trim()) ? subject.trim() : "Linux Administration";
    const chapterFallback = (defaultChapter && defaultChapter.trim()) ? defaultChapter.trim() : "General";
    const systemPrompt = `
You are an expert exam processor and ${targetSubject} instructor.
Extract all multiple-choice questions (MCQs) from the provided document.

Instructions:
1. Extract every distinct multiple choice question.
2. For each question:
   - "questionNumber": sequential integer starting from 1 (or matching the document's numbering).
   - "chapter": Topic or chapter name if specified in the document (e.g., "File Management", "Basic Syntax", "Queries"), or use "${chapterFallback}".
   - "questionText": The complete question stem. Clean up any trailing option indicators.
   - "options": An array of exactly 4 strings for options (A, B, C, D). Do NOT prefix with "A)" or "A.". Just the clean option text. If a question in the document only has 2 or 3 options, provide reasonable distractors so there are exactly 4 choices.
   - "correctAnswerIndex": Integer from 0 to 3 (0 for A, 1 for B, 2 for C, 3 for D).
     * IMPORTANT: Search for answers indicated directly below questions (e.g. "Answer: B", "Ans: B"), bolded/underlined options, or check any "Answer Key" / "Answers" section at the end of the chapter or document.
     * If no answer is explicitly indicated anywhere, deduce the most technically accurate answer for ${targetSubject}.
   - "correctAnswerText": The exact text of the correct option matching correctAnswerIndex.
   - "explanation": Brief, clear explanation of why this is the correct answer.

Output format MUST be strict JSON matching this structure:
{
  "questions": [
    {
      "questionNumber": 1,
      "chapter": "File Management",
      "questionText": "What is the primary purpose of /boot?",
      "options": [
        "Store user files",
        "Store boot-related files",
        "Store temporary files",
        "Store log files"
      ],
      "correctAnswerIndex": 1,
      "correctAnswerText": "Store boot-related files",
      "explanation": "The /boot directory contains the Linux kernel and bootloader files."
    }
  ]
}
`;
    let lastError = null;
    for (const modelName of CANDIDATE_MODELS) {
        try {
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    temperature: 0.1,
                    responseMimeType: "application/json",
                },
            });
            const contentParts = [];
            if (pdfBase64) {
                // Clean base64 if it has data url prefix
                const cleanedBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
                contentParts.push({
                    inlineData: {
                        data: cleanedBase64,
                        mimeType: "application/pdf",
                    },
                });
            }
            if (rawText) {
                contentParts.push({
                    text: `Document Content:\n${rawText}`,
                });
            }
            contentParts.push({
                text: systemPrompt,
            });
            const result = await model.generateContent(contentParts);
            const rawResponse = result.response.text();
            let cleaned = rawResponse.trim();
            if (cleaned.startsWith("```json")) {
                cleaned = cleaned.slice(7);
            }
            else if (cleaned.startsWith("```")) {
                cleaned = cleaned.slice(3);
            }
            if (cleaned.endsWith("```")) {
                cleaned = cleaned.slice(0, -3);
            }
            const parsedData = JSON.parse(cleaned.trim());
            const extractedQuestions = Array.isArray(parsedData.questions)
                ? parsedData.questions
                : Array.isArray(parsedData)
                    ? parsedData
                    : [];
            if (extractedQuestions.length === 0) {
                throw new Error("No questions were detected in the document.");
            }
            // Format and validate each question
            const timestamp = Date.now();
            const formattedList = extractedQuestions.map((q, idx) => {
                const qNum = Number(q.questionNumber) || idx + 1;
                const options = Array.isArray(q.options)
                    ? q.options.map((opt) => String(opt || "").trim()).filter(Boolean)
                    : [];
                while (options.length < 4) {
                    options.push(`Option ${String.fromCharCode(65 + options.length)}`);
                }
                const fourOptions = options.slice(0, 4);
                let correctIdx = Number(q.correctAnswerIndex);
                if (isNaN(correctIdx) || correctIdx < 0 || correctIdx > 3) {
                    // Attempt to match by text or fallback to 0
                    if (q.correctAnswerText) {
                        const matchedIdx = fourOptions.findIndex((o) => o.toLowerCase() === String(q.correctAnswerText).toLowerCase());
                        correctIdx = matchedIdx >= 0 ? matchedIdx : 0;
                    }
                    else {
                        correctIdx = 0;
                    }
                }
                return {
                    id: `pmq_extracted_${timestamp}_${idx + 1}`,
                    questionNumber: qNum,
                    subject: targetSubject,
                    chapter: (q.chapter && String(q.chapter).trim()) || chapterFallback,
                    questionText: String(q.questionText || `Question ${qNum}`).trim(),
                    options: fourOptions,
                    correctAnswerIndex: correctIdx,
                    correctAnswerText: fourOptions[correctIdx] || "",
                    explanation: String(q.explanation || "").trim(),
                };
            });
            return {
                success: true,
                total: formattedList.length,
                questions: formattedList,
            };
        }
        catch (err) {
            lastError = err;
            console.warn(`[extractQuestionsFromPdf] Model ${modelName} failed:`, err.message);
        }
    }
    console.error("[extractQuestionsFromPdf] All models failed:", lastError);
    throw new https_1.HttpsError("internal", `Failed to extract questions from document. ${lastError?.message || ""}`);
});
//# sourceMappingURL=extractQuestionsFromPdf.js.map