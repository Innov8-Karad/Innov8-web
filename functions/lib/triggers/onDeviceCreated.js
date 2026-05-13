"use strict";
// ═══════════════════════════════════════════════════════════════════════════════
// onDeviceCreated — Firestore Trigger
// ═══════════════════════════════════════════════════════════════════════════════
// When a student logs in from a new device (not their first), a "pending"
// device document is created. This trigger sends a push notification to all
// admin users so they can approve or reject the request.
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
exports.onDeviceCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const sendPush_1 = require("../utils/sendPush");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.onDeviceCreated = (0, firestore_1.onDocumentCreated)({
    document: "devices/{deviceDocId}",
    region: "asia-south1",
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const data = snapshot.data();
    // Only notify admins for pending requests (skip auto-approved first devices)
    if (data.status !== "pending") {
        console.log("[onDeviceCreated] Status is not pending, skipping notification.");
        return;
    }
    const userName = data.userName || "A student";
    const deviceName = data.deviceMeta?.deviceName || "Unknown Device";
    const userEmail = data.userEmail || "";
    // Fetch all admin FCM tokens
    const adminsSnap = await db.collection("users")
        .where("role", "==", "admin")
        .get();
    const tokens = [];
    adminsSnap.forEach((doc) => {
        const userData = doc.data();
        if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
            tokens.push(...userData.fcmTokens);
        }
    });
    const uniqueTokens = [...new Set(tokens)];
    if (!uniqueTokens.length) {
        console.log("[onDeviceCreated] No admin tokens found.");
        return;
    }
    await (0, sendPush_1.sendPush)(uniqueTokens, {
        title: "🔐 New Device Login Request",
        body: `${userName} (${userEmail}) is trying to login from ${deviceName}`,
    }, {
        type: "device_approval",
        referenceId: event.params.deviceDocId,
    });
    console.log(`[onDeviceCreated] Pushed to ${uniqueTokens.length} admin tokens.`);
});
//# sourceMappingURL=onDeviceCreated.js.map