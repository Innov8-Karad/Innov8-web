import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

function getTodayDateString(timeZone = "Asia/Kolkata"): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

function getMsUntilMidnight(timeZone = "Asia/Kolkata"): number {
  const now = new Date();
  // Get tomorrow at 00:00:00 in IST
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(now);

  const partMap: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") partMap[p.type] = parseInt(p.value, 10);
  }

  const currentHour = partMap.hour || 0;
  const currentMinute = partMap.minute || 0;
  const currentSecond = partMap.second || 0;

  const secondsPassedToday = currentHour * 3600 + currentMinute * 60 + currentSecond;
  const totalSecondsInDay = 86400;
  const secondsRemaining = Math.max(0, totalSecondsInDay - secondsPassedToday);

  return secondsRemaining * 1000;
}

export const getPracticeMockStatus = onCall(
  { region: "asia-south1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    try {
      // 1. Fetch config
      const configDoc = await db.collection("practice_mock_config").doc("default").get();
      const config = configDoc.exists
        ? configDoc.data()!
        : {
            isEnabled: true,
            title: "Practice Mock",
            description: "Daily Linux MCQs Practice Mock",
            displayBadge: "Daily",
            questionsPerTest: 10,
            dailyAttemptLimit: 1,
            durationMinutes: 15,
            passPercentage: 60,
            allowedBatchIds: ["all"],
          };

      const dailyAttemptLimit = Number(config.dailyAttemptLimit) || 1;
      const todayStr = getTodayDateString();

      // 2. Fetch tracking
      const userTrackingDoc = await db.collection("practice_mock_user_tracking").doc(uid).get();
      const trackingData = userTrackingDoc.data() || {
        attemptsToday: 0,
        lastAttemptDate: "",
        totalCompletedAttempts: 0,
      };

      const attemptsToday = trackingData.lastAttemptDate === todayStr ? (trackingData.attemptsToday || 0) : 0;
      const attemptsRemaining = Math.max(0, dailyAttemptLimit - attemptsToday);
      const isEligible = Boolean(config.isEnabled) && attemptsRemaining > 0;
      const msUntilReset = getMsUntilMidnight();

      // 3. Count total question pool size
      const countSnap = await db.collection("practice_mock_questions").count().get();
      const totalQuestionsInPool = countSnap.data().count;

      return {
        isEnabled: Boolean(config.isEnabled),
        title: config.title || "Practice Mock",
        description: config.description || "",
        displayBadge: config.displayBadge || "Daily",
        questionsPerTest: Number(config.questionsPerTest) || 10,
        dailyAttemptLimit,
        durationMinutes: Number(config.durationMinutes) || 15,
        passPercentage: Number(config.passPercentage) || 60,
        attemptsToday,
        attemptsRemaining,
        isEligible,
        msUntilReset,
        totalQuestionsInPool,
        totalCompletedAttempts: trackingData.totalCompletedAttempts || 0,
      };
    } catch (err: any) {
      console.error("Error getting practice mock status:", err);
      throw new HttpsError("internal", err.message || "Failed to fetch practice mock status.");
    }
  }
);
