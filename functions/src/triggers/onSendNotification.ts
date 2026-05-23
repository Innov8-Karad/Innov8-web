// ═══════════════════════════════════════════════════════════════════════════════
// onSendNotification — HTTPS Callable Cloud Function
// ═══════════════════════════════════════════════════════════════════════════════
// Allows an admin to send an ad-hoc push notification from the web panel.
// Validates admin role, fetches relevant FCM tokens, sends via sendPush(),
// and stores a record in the `notifications` collection for audit history.
// ═══════════════════════════════════════════════════════════════════════════════

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { validateAuth } from "../utils/auth";
import * as admin from "firebase-admin";
import { getUserTokens, sendPush } from "../utils/sendPush";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface SendNotificationData {
  title: string;
  body: string;
  targetAudience: "all" | "batch" | "students";
  targetBatches?: string[];
  targetStudentIds?: string[];
}

export const onSendNotification = onCall(
  { region: "asia-south1", cors: true },
  async (request) => {
    // ── Auth Check & Admin Check ──
    const userData = await validateAuth(request);

    if (userData.role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Only admins can send notifications."
      );
    }

    const callerUid = request.auth!.uid;

    // ── Validate Input ──
    const data = request.data as SendNotificationData;

    if (!data.title || !data.body) {
      throw new HttpsError(
        "invalid-argument",
        "Title and body are required."
      );
    }

    if (!data.targetAudience) {
      throw new HttpsError(
        "invalid-argument",
        "Target audience is required."
      );
    }

    // ── Fetch Tokens & Student IDs ──
    let tokens: string[] = [];
    let resolvedStudentIds: string[] = [];

    switch (data.targetAudience) {
      case "all": {
        const usersSnap = await db
          .collection("users")
          .where("role", "==", "student")
          .get();

        usersSnap.forEach((doc) => {
          resolvedStudentIds.push(doc.id);
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
          throw new HttpsError(
            "invalid-argument",
            "At least one batch must be selected."
          );
        }
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
            resolvedStudentIds.push(doc.id);
            const userData = doc.data();
            if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
              tokens.push(...userData.fcmTokens);
            }
          });
        }
        tokens = [...new Set(tokens)]; // Deduplicate
        break;
      }

      case "students": {
        const studentIds = data.targetStudentIds || [];
        if (!studentIds.length) {
          throw new HttpsError(
            "invalid-argument",
            "At least one student must be selected."
          );
        }
        resolvedStudentIds = [...studentIds];
        // Fetch tokens for each selected student
        for (const studentId of studentIds) {
          const studentTokens = await getUserTokens(studentId);
          tokens.push(...studentTokens);
        }
        tokens = [...new Set(tokens)]; // Deduplicate
        break;
      }

      default:
        throw new HttpsError(
          "invalid-argument",
          `Invalid target audience: ${data.targetAudience}`
        );
    }

    // ── Send Push Notification ──
    await sendPush(
      tokens,
      { title: data.title, body: data.body },
      { type: "general" }
    );

    // ── Save Persistent Notification in Firestore for each target student ──
    if (resolvedStudentIds.length > 0) {
      const batchSize = 400;
      for (let i = 0; i < resolvedStudentIds.length; i += batchSize) {
        const batch = db.batch();
        const chunk = resolvedStudentIds.slice(i, i + batchSize);

        chunk.forEach((studentId) => {
          const notifRef = db
            .collection("users")
            .doc(studentId)
            .collection("notifications")
            .doc();

          batch.set(notifRef, {
            title: data.title,
            body: data.body,
            type: "general",
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });

        await batch.commit();
      }
      console.log(`[onSendNotification] Saved persistent notification to ${resolvedStudentIds.length} students' inboxes.`);
    }

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

    console.log(
      `[onSendNotification] Admin ${callerUid} sent "${data.title}" to ${tokens.length} devices (${data.targetAudience}).`
    );

    return {
      success: true,
      message: `Notification sent to ${tokens.length} device(s) and saved to ${resolvedStudentIds.length} student inbox(es).`,
      tokenCount: tokens.length,
    };
  }
);
