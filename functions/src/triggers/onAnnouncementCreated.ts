// ═══════════════════════════════════════════════════════════════════════════════
// onAnnouncementCreated — Firestore Trigger
// ═══════════════════════════════════════════════════════════════════════════════
// When an admin creates an announcement, push a notification to all students
// in the targeted batches (or all students if targetBatches is empty / "All").
// ═══════════════════════════════════════════════════════════════════════════════

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { getBatchTokens, sendPush } from "../utils/sendPush";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const onAnnouncementCreated = onDocumentCreated(
  {
    document: "announcements/{announcementId}",
    region: "asia-south1",
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const data = snapshot.data();
    const title = data.title || "New Announcement";
    const content = data.content || "";
    const targetBatches: string[] = data.targetBatches || [];

    let tokens: string[] = [];

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
    } else {
      tokens = await getBatchTokens(targetBatches);
    }

    await sendPush(
      tokens,
      {
        title: `📢 ${title}`,
        body: content.substring(0, 100) + (content.length > 100 ? "..." : ""),
      },
      {
        type: data.mockScheduleId ? "mock_schedule" : "announcement",
        referenceId: data.mockScheduleId || event.params.announcementId,
      }
    );

    console.log(`[onAnnouncementCreated] Pushed to ${tokens.length} tokens.`);
  }
);
