"use strict";
// ═══════════════════════════════════════════════════════════════════════════════
// sendPush — Shared FCM helper for all trigger functions
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
exports.getUserTokens = getUserTokens;
exports.getBatchTokens = getBatchTokens;
exports.sendPush = sendPush;
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const messaging = admin.messaging();
/**
 * Fetch FCM tokens for a specific user from Firestore.
 */
async function getUserTokens(userId) {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists)
        return [];
    const data = userDoc.data();
    return data?.fcmTokens || [];
}
/**
 * Fetch FCM tokens for all users in specific batches.
 */
async function getBatchTokens(batches) {
    if (!batches.length)
        return [];
    const tokens = [];
    // Firestore 'in' queries support max 30 values
    const chunks = [];
    for (let i = 0; i < batches.length; i += 30) {
        chunks.push(batches.slice(i, i + 30));
    }
    for (const chunk of chunks) {
        const snapshot = await db.collection("users")
            .where("batch", "in", chunk)
            .where("role", "==", "student")
            .get();
        snapshot.forEach((doc) => {
            const data = doc.data();
            if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
                tokens.push(...data.fcmTokens);
            }
        });
    }
    return [...new Set(tokens)]; // Deduplicate
}
/**
 * Send a push notification to an array of FCM tokens.
 * Automatically handles stale token cleanup.
 */
async function sendPush(tokens, notification, data) {
    if (!tokens.length) {
        console.log("[sendPush] No tokens to send to.");
        return;
    }
    // FCM multicast supports max 500 tokens per call
    const chunks = [];
    for (let i = 0; i < tokens.length; i += 500) {
        chunks.push(tokens.slice(i, i + 500));
    }
    for (const chunk of chunks) {
        try {
            const response = await messaging.sendEachForMulticast({
                tokens: chunk,
                notification,
                data: data || {},
                android: {
                    priority: "high",
                    notification: { channelId: "innov8_default" },
                },
                apns: {
                    payload: {
                        aps: { badge: 1, sound: "default" },
                    },
                },
            });
            // Clean up invalid/expired tokens
            if (response.failureCount > 0) {
                const staleTokens = [];
                response.responses.forEach((resp, idx) => {
                    if (resp.error) {
                        const code = resp.error.code;
                        if (code === "messaging/invalid-registration-token" ||
                            code === "messaging/registration-token-not-registered") {
                            staleTokens.push(chunk[idx]);
                        }
                    }
                });
                if (staleTokens.length) {
                    console.log(`[sendPush] Removing ${staleTokens.length} stale tokens.`);
                    // Remove stale tokens from all users that have them
                    const usersSnap = await db.collection("users")
                        .where("fcmTokens", "array-contains-any", staleTokens.slice(0, 10))
                        .get();
                    const batch = db.batch();
                    usersSnap.forEach((doc) => {
                        batch.update(doc.ref, {
                            fcmTokens: admin.firestore.FieldValue.arrayRemove(...staleTokens),
                        });
                    });
                    await batch.commit();
                }
            }
            console.log(`[sendPush] Sent ${response.successCount}/${chunk.length} successfully.`);
        }
        catch (error) {
            console.error("[sendPush] Error sending push:", error);
        }
    }
}
//# sourceMappingURL=sendPush.js.map