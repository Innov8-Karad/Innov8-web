// ═══════════════════════════════════════════════════════════════════════════════
// sendPush — Shared FCM helper for all trigger functions
// ═══════════════════════════════════════════════════════════════════════════════

import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

/**
 * Fetch FCM tokens for a specific user from Firestore.
 */
export async function getUserTokens(userId: string): Promise<string[]> {
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) return [];
  const data = userDoc.data();
  return data?.fcmTokens || [];
}

/**
 * Fetch FCM tokens for all users in specific batches.
 */
export async function getBatchTokens(batches: string[]): Promise<string[]> {
  if (!batches.length) return [];

  const tokens: string[] = [];
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
export async function sendPush(
  tokens: string[],
  notification: { title: string; body: string },
  data?: Record<string, string>
): Promise<void> {
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
        const staleTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (resp.error) {
            const code = resp.error.code;
            if (
              code === "messaging/invalid-registration-token" ||
              code === "messaging/registration-token-not-registered"
            ) {
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
    } catch (error) {
      console.error("[sendPush] Error sending push:", error);
    }
  }
}
