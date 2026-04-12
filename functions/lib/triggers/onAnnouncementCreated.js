"use strict";
// ═══════════════════════════════════════════════════════════════════════════════
// onAnnouncementCreated — Firestore Trigger
// ═══════════════════════════════════════════════════════════════════════════════
// When an admin creates an announcement, push a notification to all students
// in the targeted batches (or all students if targetBatches is empty / "All").
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
exports.onAnnouncementCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const sendPush_1 = require("../utils/sendPush");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.onAnnouncementCreated = (0, firestore_1.onDocumentCreated)("announcements/{announcementId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const data = snapshot.data();
    const title = data.title || "New Announcement";
    const content = data.content || "";
    const targetBatches = data.targetBatches || [];
    let tokens = [];
    if (!targetBatches.length || targetBatches.includes("All")) {
        // Send to all students
        const usersSnap = await db.collection("users")
            .where("role", "==", "student")
            .get();
        usersSnap.forEach((doc) => {
            const userData = doc.data();
            if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
                tokens.push(...userData.fcmTokens);
            }
        });
        tokens = [...new Set(tokens)];
    }
    else {
        tokens = await (0, sendPush_1.getBatchTokens)(targetBatches);
    }
    await (0, sendPush_1.sendPush)(tokens, {
        title: `📢 ${title}`,
        body: content.substring(0, 100) + (content.length > 100 ? "..." : ""),
    }, {
        type: "announcement",
        referenceId: event.params.announcementId,
    });
    console.log(`[onAnnouncementCreated] Pushed to ${tokens.length} tokens.`);
});
//# sourceMappingURL=onAnnouncementCreated.js.map