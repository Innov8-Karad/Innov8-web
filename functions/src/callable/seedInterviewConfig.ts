// ═══════════════════════════════════════════════════════════════════════════════
// seedInterviewConfig — Cloud Function
// ═══════════════════════════════════════════════════════════════════════════════
// Admin-only callable to seed the interviewConfig/settings document with
// default job roles, difficulty levels, question types, and question counts.
// Idempotent — only creates if the config doc does not already exist.
// ═══════════════════════════════════════════════════════════════════════════════

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { validateAuth } from "../utils/auth";

const DEFAULT_CONFIG = {
    roles: [
        "Backend Developer",
        "Frontend Developer",
        "Full Stack Developer",
        "Mobile Developer",
        "Data Analyst",
        "DevOps Engineer",
        "QA Engineer",
        "Cloud Engineer",
        "UI/UX Designer",
    ],
    difficulties: ["Easy", "Medium", "Hard"],
    questionTypes: ["Technical", "Behavioral", "Coding", "HR"],
    questionsPerDifficulty: {
        Easy: 5,
        Medium: 7,
        Hard: 10,
    },
};

export const seedInterviewConfig = onCall(
    { region: "asia-south1" },
    async (request) => {
        // 1. Authenticate — must be admin
        const userData = await validateAuth(request);
        const db = admin.firestore();

        if (userData.role !== "admin") {
            throw new HttpsError(
                "permission-denied",
                "Only admins can seed interview config."
            );
        }

        // 2. Check if config already exists
        const configRef = db.doc("interviewConfig/settings");
        const existing = await configRef.get();

        if (existing.exists) {
            return {
                success: true,
                message: "Interview config already exists. No changes made.",
                config: existing.data(),
            };
        }

        // 3. Create with defaults
        await configRef.set({
            ...DEFAULT_CONFIG,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log("[seedInterviewConfig] Default config seeded successfully.");

        return {
            success: true,
            message: "Interview config seeded with defaults.",
            config: DEFAULT_CONFIG,
        };
    }
);
