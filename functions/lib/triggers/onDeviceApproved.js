"use strict";
// ═══════════════════════════════════════════════════════════════════════════════
// onDeviceApproved — Firestore Trigger
// ═══════════════════════════════════════════════════════════════════════════════
// When an admin approves a device (status changes to "approved"), this trigger
// automatically:
// 1. Updates the user's "activeDeviceDocId" to the newly approved device.
// 2. Revokes ALL other approved devices for the same user.
//
// This enforces the "Single Active Device" policy:
//   - Only ONE device can be "approved" at any time per user.
//   - Old devices get "revoked" and the SecurityGuard on those devices
//     will detect the change and force a logout.
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
exports.onDeviceApproved = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.onDeviceApproved = (0, firestore_1.onDocumentUpdated)({
    document: "devices/{deviceDocId}",
    region: "asia-south1",
}, async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData)
        return;
    // Only trigger when status changes TO "approved" (from anything else)
    if (beforeData.status === "approved" || afterData.status !== "approved") {
        return;
    }
    const userId = afterData.userId;
    const approvedDocId = event.params.deviceDocId;
    console.log(`[onDeviceApproved] Device ${approvedDocId} approved for user ${userId}. Revoking others...`);
    const batch = db.batch();
    // 1. Update the User document with the new activeDeviceDocId
    const userRef = db.collection("users").doc(userId);
    batch.update(userRef, {
        activeDeviceDocId: approvedDocId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // 2. Find ALL other approved devices for this user and revoke them
    const otherDevicesSnap = await db
        .collection("devices")
        .where("userId", "==", userId)
        .where("status", "==", "approved")
        .get();
    let revokedCount = 0;
    otherDevicesSnap.forEach((doc) => {
        // Don't revoke the device that was just approved
        if (doc.id === approvedDocId)
            return;
        batch.update(doc.ref, {
            status: "revoked",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            revokedAt: admin.firestore.FieldValue.serverTimestamp(),
            revocationReason: "new_device_approved",
            revokedByDeviceId: approvedDocId,
        });
        revokedCount++;
    });
    await batch.commit();
    console.log(`[onDeviceApproved] Successfully updated user ${userId} active device to ${approvedDocId} and revoked ${revokedCount} other device(s).`);
});
//# sourceMappingURL=onDeviceApproved.js.map