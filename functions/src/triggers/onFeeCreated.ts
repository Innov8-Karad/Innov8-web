// ═══════════════════════════════════════════════════════════════════════════════
// onFeeCreated — Firestore Trigger
// ═══════════════════════════════════════════════════════════════════════════════
// When an admin creates a new fee entry, push a payment reminder notification
// to the student.
// ═══════════════════════════════════════════════════════════════════════════════

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { getUserTokens, sendPush } from "../utils/sendPush";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const onFeeCreated = onDocumentCreated(
  {
    document: "fees/{feeId}",
    region: "asia-south1",
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

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

    const tokens = await getUserTokens(userId);

    const dueDate = data.dueDate?.toDate
      ? data.dueDate.toDate().toLocaleDateString("en-IN")
      : "soon";

    await sendPush(
      tokens,
      {
        title: "💰 Fee Payment Reminder",
        body: `A fee of ₹${amount.toLocaleString("en-IN")} is ${status}. Due: ${dueDate}.`,
      },
      {
        type: "fee",
        referenceId: event.params.feeId,
      }
    );

    console.log(`[onFeeCreated] Notified user ${userId} — ₹${amount} ${status}.`);
  }
);
