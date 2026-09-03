"use strict";
// ═══════════════════════════════════════════════════════════════════════════════
// LLM Client — Provider-Agnostic Abstraction
// ═══════════════════════════════════════════════════════════════════════════════
// Currently implements Google Gemini (gemini-2.0-flash).
// To swap to another provider (e.g. Claude, OpenAI), change ONLY this file.
// ═══════════════════════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.callLLM = callLLM;
const generative_ai_1 = require("@google/generative-ai");
// ── Constants ────────────────────────────────────────────────────────────────
const CANDIDATE_MODELS = [
    "gemini-3.6-flash",
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-2.0-flash",
];
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
// ── Helper ───────────────────────────────────────────────────────────────────
function getApiKey() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        throw new Error("GEMINI_API_KEY is not set. " +
            "Run: firebase functions:secrets:set GEMINI_API_KEY");
    }
    return key.trim();
}
async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
// ── Main Function ────────────────────────────────────────────────────────────
/**
 * Send a prompt to the LLM and get a response.
 * Abstracts provider details so the rest of the codebase is provider-agnostic.
 *
 * @param prompt - The user prompt text
 * @param options - Optional configuration (system instruction, temperature, JSON mode)
 * @returns LLMResponse with raw text and optionally parsed JSON
 */
async function callLLM(prompt, options = {}) {
    const apiKey = getApiKey();
    const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
    const generationConfig = {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxOutputTokens ?? 4096,
    };
    // Enable JSON response format if requested
    if (options.jsonOutput) {
        generationConfig.responseMimeType = "application/json";
    }
    let lastError = null;
    for (const modelName of CANDIDATE_MODELS) {
        const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig,
            ...(options.systemInstruction
                ? { systemInstruction: options.systemInstruction }
                : {}),
        });
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                const result = await model.generateContent(prompt);
                const rawText = result.response.text();
                const response = { rawText };
                if (options.jsonOutput) {
                    try {
                        // Strip markdown code fences if the model wraps output in them
                        let cleaned = rawText.trim();
                        if (cleaned.startsWith("```json")) {
                            cleaned = cleaned.slice(7);
                        }
                        else if (cleaned.startsWith("```")) {
                            cleaned = cleaned.slice(3);
                        }
                        if (cleaned.endsWith("```")) {
                            cleaned = cleaned.slice(0, -3);
                        }
                        response.data = JSON.parse(cleaned.trim());
                    }
                    catch (parseError) {
                        console.error("[LLM] JSON parse error:", parseError);
                        console.error("[LLM] Raw response:", rawText.substring(0, 500));
                        throw new Error("LLM returned invalid JSON. Raw response logged above.");
                    }
                }
                return response;
            }
            catch (error) {
                lastError = error;
                console.warn(`[LLM] Model ${modelName} attempt ${attempt + 1}/${MAX_RETRIES + 1} failed:`, error.message);
                // If 404 (model not found / deprecated), break immediately to try next candidate model
                if (error.message?.includes("404") || error.message?.includes("not found") || error.message?.includes("no longer available")) {
                    break;
                }
                if (attempt < MAX_RETRIES) {
                    await sleep(RETRY_DELAY_MS * (attempt + 1));
                }
            }
        }
    }
    throw new Error(`[LLM] All candidate models failed. Last error: ${lastError?.message}`);
}
//# sourceMappingURL=llmClient.js.map