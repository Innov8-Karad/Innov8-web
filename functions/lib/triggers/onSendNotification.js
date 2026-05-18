"use strict";
// ═══════════════════════════════════════════════════════════════════════════════
// onSendNotification — HTTPS Callable Cloud Function
// ═══════════════════════════════════════════════════════════════════════════════
// Allows an admin to send an ad-hoc push notification from the web panel.
// Validates admin role, fetches relevant FCM tokens, sends via sendPush(),
// and stores a record in the `notifications` collection for audit history.
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
exports.onSendNotification = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../utils/auth");
const admin = __importStar(require("firebase-admin"));
const sendPush_1 = require("../utils/sendPush");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.onSendNotification = (0, https_1.onCall)({ region: "asia-south1" }, async (request) => {
    // ── Auth Check & Admin Check ──
    const userData = await (0, auth_1.validateAuth)(request);
    if (userData.role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Only admins can send notifications.");
    }
    const callerUid = request.auth.uid;
    // ── Validate Input ──
    const data = request.data;
    if (!data.title || !data.body) {
        throw new https_1.HttpsError("invalid-argument", "Title and body are required.");
    }
    if (!data.targetAudience) {
        throw new https_1.HttpsError("invalid-argument", "Target audience is required.");
    }
    // ── Fetch Tokens ──
    let tokens = [];
    switch (data.targetAudience) {
        case "all": {
            const usersSnap = await db
                .collection("users")
                .where("role", "==", "student")
                .get();
            usersSnap.forEach((doc) => {
                const userData = doc.data();
                if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
                    tokens.push(...userData.fcmTokens);
                }
            });
            tokens = [...new Set(tokens)]; // Deduplicate
            break;
        }
        case "batch": {
            const batches = data.targetBatches || [];
            if (!batches.length) {
                throw new https_1.HttpsError("invalid-argument", "At least one batch must be selected.");
            }
            tokens = await (0, sendPush_1.getBatchTokens)(batches);
            break;
        }
        case "students": {
            const studentIds = data.targetStudentIds || [];
            if (!studentIds.length) {
                throw new https_1.HttpsError("invalid-argument", "At least one student must be selected.");
            }
            // Fetch tokens for each selected student
            for (const studentId of studentIds) {
                const studentTokens = await (0, sendPush_1.getUserTokens)(studentId);
                tokens.push(...studentTokens);
            }
            tokens = [...new Set(tokens)]; // Deduplicate
            break;
        }
        default:
            throw new https_1.HttpsError("invalid-argument", `Invalid target audience: ${data.targetAudience}`);
    }
    // ── Send Push Notification ──
    await (0, sendPush_1.sendPush)(tokens, { title: data.title, body: data.body }, { type: "general" });
    // ── Store Notification Record for Admin History ──
    const notificationRecord = {
        title: data.title,
        body: data.body,
        targetAudience: data.targetAudience,
        targetBatches: data.targetBatches || [],
        targetStudentIds: data.targetStudentIds || [],
        sentBy: callerUid,
        tokenCount: tokens.length,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection("notifications").add(notificationRecord);
    console.log(`[onSendNotification] Admin ${callerUid} sent "${data.title}" to ${tokens.length} devices (${data.targetAudience}).`);
    return {
        success: true,
        message: `Notification sent to ${tokens.length} device(s).`,
        tokenCount: tokens.length,
    };
});
//# sourceMappingURL=onSendNotification.js.map