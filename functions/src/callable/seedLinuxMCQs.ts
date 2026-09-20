import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { LINUX_100_MCQS } from "../data/linuxMCQsData";

export const seedLinuxMCQs = onCall(
  { region: "asia-south1" },
  async (request) => {
    // 1. Ensure user is authenticated
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const db = admin.firestore();
    const uid = request.auth.uid;

    // Check admin rights
    const userDoc = await db.collection("users").doc(uid).get();
    const userData = userDoc.data();
    const isAdmin = request.auth.token?.role === "admin" || userData?.role === "admin";

    // If there's already users and this is not admin, deny unless it's initial setup
    if (!isAdmin) {
      throw new HttpsError("permission-denied", "Only administrators can seed question pool.");
    }

    try {
      // 2. Set default config if not existing
      const configRef = db.collection("practice_mock_config").doc("default");
      const configDoc = await configRef.get();
      if (!configDoc.exists) {
        await configRef.set({
          isEnabled: true,
          title: "Practice Mock",
          description: "Test your Linux Administration knowledge with 10 random MCQs daily.",
          displayBadge: "Daily",
          questionsPerTest: 10,
          dailyAttemptLimit: 1,
          durationMinutes: 15,
          passPercentage: 60,
          allowedBatchIds: ["all"],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: uid,
        });
      }

      // 3. Batch write all 100 questions and answers
      // Firestore batch supports up to 500 operations
      const batch = db.batch();

      for (const item of LINUX_100_MCQS) {
        // Public question document (NO correct answer)
        const qRef = db.collection("practice_mock_questions").doc(item.id);
        batch.set(qRef, {
          id: item.id,
          questionNumber: item.questionNumber,
          chapter: item.chapter,
          questionText: item.questionText,
          options: item.options,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // Private answer document (Admin/Backend only)
        const aRef = db.collection("practice_mock_answers").doc(item.id);
        batch.set(aRef, {
          questionId: item.id,
          correctAnswerIndex: item.correctAnswerIndex,
          correctAnswerText: item.correctAnswerText,
          explanation: item.explanation || "",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      await batch.commit();

      return {
        success: true,
        message: `Successfully seeded ${LINUX_100_MCQS.length} Linux MCQs and default Practice Mock configuration.`,
        totalQuestions: LINUX_100_MCQS.length,
      };
    } catch (err: any) {
      console.error("Error seeding Linux MCQs:", err);
      throw new HttpsError("internal", err.message || "Failed to seed Linux MCQs.");
    }
  }
);
