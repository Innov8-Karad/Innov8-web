"use strict";
// ═══════════════════════════════════════════════════════════════════════════════
// onFeeCreated — Firestore Trigger
// ═══════════════════════════════════════════════════════════════════════════════
// When an admin creates a new fee entry, push a payment reminder notification
// to the student.
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
exports.onFeeCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const sendPush_1 = require("../utils/sendPush");
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.onFeeCreated = (0, firestore_1.onDocumentCreated)("fees/{feeId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot)
        return;
    const data = snapshot.data();
    const userId = data.userId || data.studentId;
    const amount = data.amount || 0;
    const status = data.status || "pending";
    if (!userId) {
        console.log("[onFeeCreated] No userId found on fee document.");
        return;
    }
    // Only notify for pending/overdue fees (not for 'paid' records)
    if (status === "paid") {
        console.log("[onFeeCreated] Skipping notification for paid fee.");
        return;
    }
    const tokens = await (0, sendPush_1.getUserTokens)(userId);
    const dueDate = data.dueDate?.toDate
        ? data.dueDate.toDate().toLocaleDateString("en-IN")
        : "soon";
    await (0, sendPush_1.sendPush)(tokens, {
        title: "💰 Fee Payment Reminder",
        body: `A fee of ₹${amount.toLocaleString("en-IN")} is ${status}. Due: ${dueDate}.`,
    }, {
        type: "fee",
        referenceId: event.params.feeId,
    });
    console.log(`[onFeeCreated] Notified user ${userId} — ₹${amount} ${status}.`);
});
//# sourceMappingURL=onFeeCreated.js.map