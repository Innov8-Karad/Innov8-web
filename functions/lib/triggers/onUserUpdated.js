"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserUpdated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
/**
 * Triggered when a user document is updated.
 * Handles:
 * 1. Revoking refresh tokens if isBlocked is set to true.
 * 2. Updating Custom Claims for security rule efficiency.
 */
exports.onUserUpdated = (0, firestore_1.onDocumentUpdated)("users/{userId}", async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    const userId = event.params.userId;
    if (!beforeData || !afterData)
        return;
    const isBlocking = afterData.isBlocked === true && beforeData.isBlocked !== true;
    const isUnblocking = afterData.isBlocked === false && beforeData.isBlocked === true;
    const versionChanged = afterData.tokenVersion !== beforeData.tokenVersion;
    if (isBlocking || isUnblocking || versionChanged) {
        let authUid = userId;
        // Resilient check: if the document ID is not a valid Auth user ID, resolve by email.
        try {
            await admin.auth().getUser(userId);
        }
        catch (error) {
            const authError = error;
            if (authError.code === "auth/user-not-found" && afterData.email) {
                try {
                    const userRecord = await admin.auth().getUserByEmail(afterData.email.toLowerCase().trim());
                    authUid = userRecord.uid;
                    console.log(`[onUserUpdated] Resolved authUid ${authUid} by email ${afterData.email} for docId ${userId}`);
                }
                catch (emailError) {
                    console.error(`[onUserUpdated] Failed to resolve authUid by email ${afterData.email}:`, emailError);
                    return; // Can't resolve Auth user, exit early.
                }
            }
            else {
                console.error(`[onUserUpdated] Error checking Auth user ${userId}:`, error);
                return;
            }
        }
        // If blocked or version changed, revoke tokens to force fresh login/re-auth
        if (isBlocking || versionChanged) {
            console.log(`[onUserUpdated] Revoking refresh tokens for Auth user ${authUid} due to ${isBlocking ? 'Blocking' : 'Version Change'}`);
            try {
                await admin.auth().revokeRefreshTokens(authUid);
            }
            catch (err) {
                console.error(`[onUserUpdated] Failed to revoke refresh tokens for ${authUid}:`, err);
            }
        }
        // Sync isBlocked and tokenVersion to Custom Claims
        // This allows security rules to check 'request.auth.token.isBlocked' without a get() call
        console.log(`[onUserUpdated] Syncing custom claims for Auth user ${authUid}`);
        try {
            await admin.auth().setCustomUserClaims(authUid, {
                isBlocked: afterData.isBlocked || false,
                tokenVersion: afterData.tokenVersion || 0,
                role: afterData.role || 'student'
            });
        }
        catch (err) {
            console.error(`[onUserUpdated] Failed to set custom claims for ${authUid}:`, err);
        }
    }
});
//# sourceMappingURL=onUserUpdated.js.map