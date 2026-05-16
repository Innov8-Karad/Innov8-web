import * as admin from "firebase-admin";
import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";

if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * Validates that the requesting user is authenticated and NOT blocked.
 * If tokenVersion is provided in the document, it also checks for a mismatch.
 * @param request - The CallableRequest object
 * @throws HttpsError if user is not authenticated or is blocked
 * @returns The user data from Firestore
 */
export async function validateAuth(request: CallableRequest) {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be logged in to perform this action.");
    }

    const uid = request.auth.uid;

    const userDoc = await admin.firestore().collection("users").doc(uid).get();
    if (!userDoc.exists) {
        throw new HttpsError("not-found", "User profile not found.");
    }

    const userData = userDoc.data();
    if (!userData) {
        throw new HttpsError("internal", "User data is empty.");
    }

    // Check if user is blocked
    if (userData.isBlocked === true) {
        throw new HttpsError("permission-denied", "Account blocked by admin");
    }

    // Requirement: Token version invalidation
    // If the JWT has a tokenVersion, it must match the database
    const tokenVersion = (userData.tokenVersion as number) || 0;
    // Cast to a specific type instead of any to satisfy linter
    const requestTokenVersion = (request.auth.token as { tokenVersion?: number }).tokenVersion || 0;

    if (requestTokenVersion < tokenVersion) {
        // This forces the client to refresh their token or log out
        throw new HttpsError("unauthenticated", "Session expired due to account changes. Please log in again.");
    }

    return userData;
}
