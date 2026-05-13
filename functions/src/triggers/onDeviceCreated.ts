// ═══════════════════════════════════════════════════════════════════════════════
// onDeviceCreated — Firestore Trigger
// ═══════════════════════════════════════════════════════════════════════════════
// When a student logs in from a new device (not their first), a "pending"
// device document is created. This trigger sends a push notification to all
// admin users so they can approve or reject the request.
// ═══════════════════════════════════════════════════════════════════════════════

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { sendPush } from "../utils/sendPush";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const onDeviceCreated = onDocumentCreated(
  {
    document: "devices/{deviceDocId}",
    region: "asia-south1",
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

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

    const tokens: string[] = [];
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

    await sendPush(
      uniqueTokens,
      {
        title: "🔐 New Device Login Request",
        body: `${userName} (${userEmail}) is trying to login from ${deviceName}`,
      },
      {
        type: "device_approval",
        referenceId: event.params.deviceDocId,
      }
    );

    console.log(`[onDeviceCreated] Pushed to ${uniqueTokens.length} admin tokens.`);
  }
);
