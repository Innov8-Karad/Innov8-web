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
exports.seedLinuxMCQs = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const linuxMCQsData_1 = require("../data/linuxMCQsData");
exports.seedLinuxMCQs = (0, https_1.onCall)({ region: "asia-south1" }, async (request) => {
    // 1. Ensure user is authenticated
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const db = admin.firestore();
    const uid = request.auth.uid;
    // Check admin rights
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.data();
    const isAdmin = request.auth.token?.role === "admin" || userData?.role === "admin";
    // If there's already users and this is not admin, deny unless it's initial setup
    if (!isAdmin) {
        throw new https_1.HttpsError("permission-denied", "Only administrators can seed question pool.");
    }
    try {
        // 2. Set default config if not existing
        const configRef = db.collection("practice_mock_config").doc("default");
        const configDoc = await configRef.get();
        if (!configDoc.exists) {
            await configRef.set({
                isEnabled: true,
                title: "Practice Mock",
                description: "Test your Linux Administration knowledge with 10 random MCQs daily.",
                displayBadge: "Daily",
                questionsPerTest: 10,
                dailyAttemptLimit: 1,
                durationMinutes: 15,
                passPercentage: 60,
                allowedBatchIds: ["all"],
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedBy: uid,
            });
        }
        // 3. Batch write all 100 questions and answers
        // Firestore batch supports up to 500 operations
        const batch = db.batch();
        for (const item of linuxMCQsData_1.LINUX_100_MCQS) {
            // Public question document (NO correct answer)
            const qRef = db.collection("practice_mock_questions").doc(item.id);
            batch.set(qRef, {
                id: item.id,
                questionNumber: item.questionNumber,
                chapter: item.chapter,
                questionText: item.questionText,
                options: item.options,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            // Private answer document (Admin/Backend only)
            const aRef = db.collection("practice_mock_answers").doc(item.id);
            batch.set(aRef, {
                questionId: item.id,
                correctAnswerIndex: item.correctAnswerIndex,
                correctAnswerText: item.correctAnswerText,
                explanation: item.explanation || "",
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        }
        await batch.commit();
        return {
            success: true,
            message: `Successfully seeded ${linuxMCQsData_1.LINUX_100_MCQS.length} Linux MCQs and default Practice Mock configuration.`,
            totalQuestions: linuxMCQsData_1.LINUX_100_MCQS.length,
        };
    }
    catch (err) {
        console.error("Error seeding Linux MCQs:", err);
        throw new https_1.HttpsError("internal", err.message || "Failed to seed Linux MCQs.");
    }
});
//# sourceMappingURL=seedLinuxMCQs.js.map