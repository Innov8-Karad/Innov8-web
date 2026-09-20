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
exports.startPracticeMockSession = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
function getTodayDateString(timeZone = "Asia/Kolkata") {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    return formatter.format(now);
}
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}
exports.startPracticeMockSession = (0, https_1.onCall)({ region: "asia-south1" }, async (request) => {
    // 1. Ensure authenticated
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in to start a practice mock.");
    }
    const uid = request.auth.uid;
    const db = admin.firestore();
    try {
        // 2. Fetch global configuration
        const configDoc = await db.collection("practice_mock_config").doc("default").get();
        const config = configDoc.exists
            ? configDoc.data()
            : {
                isEnabled: true,
                questionsPerTest: 10,
                dailyAttemptLimit: 1,
                durationMinutes: 15,
                allowedBatchIds: ["all"],
            };
        if (!config?.isEnabled) {
            throw new https_1.HttpsError("failed-precondition", "Practice mock is currently disabled by administrator.");
        }
        // Check student batch restrictions if applicable
        const userDoc = await db.collection("users").doc(uid).get();
        const userData = userDoc.data();
        const userBatchId = userData?.batchId;
        const allowedBatches = config.allowedBatchIds || ["all"];
        if (!allowedBatches.includes("all") && (!userBatchId || !allowedBatches.includes(userBatchId))) {
            throw new https_1.HttpsError("permission-denied", "Practice mock is not available for your batch.");
        }
        const questionsPerTest = Number(config.questionsPerTest) || 10;
        const dailyAttemptLimit = Number(config.dailyAttemptLimit) || 1;
        const durationMinutes = Number(config.durationMinutes) || 15;
        const todayStr = getTodayDateString();
        // 3. Check user attempt limit (Server-enforced)
        const userTrackingRef = db.collection("practice_mock_user_tracking").doc(uid);
        const trackingDoc = await userTrackingRef.get();
        const trackingData = trackingDoc.data() || {
            servedQuestionIds: [],
            lastAttemptDate: "",
            attemptsToday: 0,
        };
        const attemptsToday = trackingData.lastAttemptDate === todayStr ? (trackingData.attemptsToday || 0) : 0;
        if (attemptsToday >= dailyAttemptLimit) {
            throw new https_1.HttpsError("resource-exhausted", `You have reached your daily attempt limit (${dailyAttemptLimit} test${dailyAttemptLimit > 1 ? "s" : ""}/day). Next test will unlock tomorrow at 12:00 AM.`);
        }
        // 4. Retrieve question pool
        const questionsSnap = await db.collection("practice_mock_questions").get();
        if (questionsSnap.empty) {
            throw new https_1.HttpsError("not-found", "No questions found in the practice mock pool.");
        }
        const allQuestions = questionsSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
        }));
        // 5. Filter by activeSubject (configured by admin)
        const activeSubject = config.activeSubject || "Linux Administration";
        let subjectPool = allQuestions.filter((q) => (q.subject || "Linux Administration").toLowerCase() === activeSubject.toLowerCase());
        if (subjectPool.length === 0) {
            subjectPool = allQuestions;
        }
        // 6. Select unique questions (Cycle-based uniqueness)
        const servedSet = new Set(trackingData.servedQuestionIds || []);
        let unservedQuestions = subjectPool.filter((q) => !servedSet.has(q.id));
        // If remaining unserved questions < requested test size, reset served cycle
        let updatedServedIds = trackingData.servedQuestionIds || [];
        if (unservedQuestions.length < questionsPerTest) {
            unservedQuestions = [...subjectPool];
            updatedServedIds = [];
        }
        // Shuffle and pick
        const shuffled = shuffleArray(unservedQuestions);
        const selectedQuestions = shuffled.slice(0, questionsPerTest);
        // Strip answers if any accidentally existed in question pool
        const cleanQuestions = selectedQuestions.map((q, idx) => ({
            id: q.id,
            index: idx + 1,
            questionNumber: q.questionNumber || idx + 1,
            chapter: q.chapter || "General",
            questionText: q.questionText,
            options: q.options || [],
        }));
        // Update served question IDs for this user
        const newQuestionIds = cleanQuestions.map((q) => q.id);
        const combinedServedIds = Array.from(new Set([...updatedServedIds, ...newQuestionIds]));
        await userTrackingRef.set({
            userId: uid,
            servedQuestionIds: combinedServedIds,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        // 6. Create practice mock session
        const sessionRef = db.collection("practice_mock_sessions").doc();
        const expiresAt = new Date(Date.now() + (durationMinutes + 5) * 60 * 1000);
        await sessionRef.set({
            sessionId: sessionRef.id,
            userId: uid,
            questionIds: newQuestionIds,
            durationMinutes,
            startedAt: admin.firestore.FieldValue.serverTimestamp(),
            expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
            status: "in-progress",
        });
        return {
            success: true,
            sessionId: sessionRef.id,
            durationMinutes,
            totalQuestions: cleanQuestions.length,
            questions: cleanQuestions,
            attemptsRemainingToday: dailyAttemptLimit - attemptsToday,
        };
    }
    catch (err) {
        if (err instanceof https_1.HttpsError) {
            throw err;
        }
        console.error("Error starting practice mock session:", err);
        throw new https_1.HttpsError("internal", err.message || "Failed to start practice mock session.");
    }
});
//# sourceMappingURL=startPracticeMockSession.js.map