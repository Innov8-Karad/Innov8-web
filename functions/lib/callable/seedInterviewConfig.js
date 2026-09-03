"use strict";
// ═══════════════════════════════════════════════════════════════════════════════
// seedInterviewConfig — Cloud Function
// ═══════════════════════════════════════════════════════════════════════════════
// Admin-only callable to seed the interviewConfig/settings document with
// default job roles, difficulty levels, question types, and question counts.
// Idempotent — only creates if the config doc does not already exist.
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
exports.seedInterviewConfig = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("../utils/auth");
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
exports.seedInterviewConfig = (0, https_1.onCall)({ region: "asia-south1" }, async (request) => {
    // 1. Authenticate — must be admin
    const userData = await (0, auth_1.validateAuth)(request);
    const db = admin.firestore();
    if (userData.role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Only admins can seed interview config.");
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
});
//# sourceMappingURL=seedInterviewConfig.js.map