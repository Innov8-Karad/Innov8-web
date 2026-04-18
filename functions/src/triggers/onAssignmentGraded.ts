// ═══════════════════════════════════════════════════════════════════════════════
// onAssignmentGraded — Firestore Trigger
// ═══════════════════════════════════════════════════════════════════════════════
// When an admin grades a submission (sets status → 'graded'), push a
// notification to the student who submitted it.
// ═══════════════════════════════════════════════════════════════════════════════

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { getUserTokens, sendPush } from "../utils/sendPush";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const onAssignmentGraded = onDocumentUpdated(
  {
    document: "courses/{courseId}/assignments/{assignmentId}/submissions/{submissionId}",
    region: "asia-south1",
  },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();

    if (!before || !after) return;

    // Only fire when status transitions to 'graded'
    if (before.status === "graded" || after.status !== "graded") return;

    const userId = after.userId;
    const grade = after.grade ?? "N/A";
    const feedback = after.feedback || "";

    const tokens = await getUserTokens(userId);

    await sendPush(
      tokens,
      {
        title: "📝 Assignment Graded!",
        body: `You scored ${grade}%.${feedback ? ` Feedback: ${feedback.substring(0, 60)}...` : ""}`,
      },
      {
        type: "assignment",
        referenceId: event.params.courseId,
      }
    );

    console.log(`[onAssignmentGraded] Notified user ${userId} — grade: ${grade}%.`);
  }
);
