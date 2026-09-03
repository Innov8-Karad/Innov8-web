// ═══════════════════════════════════════════════════════════════════════════════
// LLM Client — Provider-Agnostic Abstraction
// ═══════════════════════════════════════════════════════════════════════════════
// Currently implements Google Gemini (gemini-2.0-flash).
// To swap to another provider (e.g. Claude, OpenAI), change ONLY this file.
// ═══════════════════════════════════════════════════════════════════════════════

import { GoogleGenerativeAI, GenerationConfig } from "@google/generative-ai";

// ── Types ────────────────────────────────────────────────────────────────────

export interface LLMRequestOptions {
    /** System instruction that sets the LLM's role/behavior */
    systemInstruction?: string;
    /** Generation config overrides */
    temperature?: number;
    maxOutputTokens?: number;
    /** If true, expects and parses JSON output from the model */
    jsonOutput?: boolean;
}

export interface LLMResponse<T = string> {
    /** Raw text response from the model */
    rawText: string;
    /** Parsed JSON data (only if jsonOutput was true) */
    data?: T;
}

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

function getApiKey(): string {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        throw new Error(
            "GEMINI_API_KEY is not set. " +
            "Run: firebase functions:secrets:set GEMINI_API_KEY"
        );
    }
    return key.trim();
}

async function sleep(ms: number): Promise<void> {
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
export async function callLLM<T = string>(
    prompt: string,
    options: LLMRequestOptions = {}
): Promise<LLMResponse<T>> {
    const apiKey = getApiKey();
    const genAI = new GoogleGenerativeAI(apiKey);

    const generationConfig: GenerationConfig = {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxOutputTokens ?? 4096,
    };

    // Enable JSON response format if requested
    if (options.jsonOutput) {
        generationConfig.responseMimeType = "application/json";
    }

    let lastError: Error | null = null;

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

                const response: LLMResponse<T> = { rawText };

                if (options.jsonOutput) {
                    try {
                        // Strip markdown code fences if the model wraps output in them
                        let cleaned = rawText.trim();
                        if (cleaned.startsWith("```json")) {
                            cleaned = cleaned.slice(7);
                        } else if (cleaned.startsWith("```")) {
                            cleaned = cleaned.slice(3);
                        }
                        if (cleaned.endsWith("```")) {
                            cleaned = cleaned.slice(0, -3);
                        }
                        response.data = JSON.parse(cleaned.trim()) as T;
                    } catch (parseError) {
                        console.error("[LLM] JSON parse error:", parseError);
                        console.error("[LLM] Raw response:", rawText.substring(0, 500));
                        throw new Error("LLM returned invalid JSON. Raw response logged above.");
                    }
                }

                return response;
            } catch (error: any) {
                lastError = error;
                console.warn(
                    `[LLM] Model ${modelName} attempt ${attempt + 1}/${MAX_RETRIES + 1} failed:`,
                    error.message
                );

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

    throw new Error(
        `[LLM] All candidate models failed. Last error: ${lastError?.message}`
    );
}
