import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

/**
 * Triggered when a user document is updated.
 * Handles:
 * 1. Revoking refresh tokens if isBlocked is set to true.
 * 2. Updating Custom Claims for security rule efficiency.
 */
export const onUserUpdated = onDocumentUpdated("users/{userId}", async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    const userId = event.params.userId;

    if (!beforeData || !afterData) return;

    const isBlocking = afterData.isBlocked === true && beforeData.isBlocked !== true;
    const isUnblocking = afterData.isBlocked === false && beforeData.isBlocked === true;
    const versionChanged = afterData.tokenVersion !== beforeData.tokenVersion;

    // If blocked or version changed, revoke tokens to force fresh login/re-auth
    if (isBlocking || versionChanged) {
        console.log(`[onUserUpdated] Revoking tokens for user ${userId} due to ${isBlocking ? 'Blocking' : 'Version Change'}`);
        await admin.auth().revokeRefreshTokens(userId);
    }

    // Sync isBlocked and tokenVersion to Custom Claims
    // This allows Firestore rules to check 'request.auth.token.isBlocked' without a 'get()' call
    if (isBlocking || isUnblocking || versionChanged) {
        console.log(`[onUserUpdated] Syncing custom claims for user ${userId}`);
        await admin.auth().setCustomUserClaims(userId, {
            isBlocked: afterData.isBlocked || false,
            tokenVersion: afterData.tokenVersion || 0,
            role: afterData.role || 'student'
        });
    }
});
