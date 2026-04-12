"use strict";
// ═══════════════════════════════════════════════════════════════════════════════
// onUserCreated — Firestore Trigger
// ═══════════════════════════════════════════════════════════════════════════════
// When an admin creates a student via the web panel (Firestore write only),
// this function auto-creates a Firebase Auth account and sends a password
// reset email so the student can set their own credentials and log in.
// ═══════════════════════════════════════════════════════════════════════════════
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
exports.onUserCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("firebase-admin/auth");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
exports.onUserCreated = (0, firestore_1.onDocumentCreated)("users/{userId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        console.log("[onUserCreated] No data in snapshot.");
        return;
    }
    const userData = snapshot.data();
    const firestoreDocId = event.params.userId;
    // Skip if the user already has a matching Auth account
    // (e.g., self-registration from mobile)
    try {
        await (0, auth_1.getAuth)().getUser(firestoreDocId);
        console.log(`[onUserCreated] Auth account already exists for ${firestoreDocId}. Skipping.`);
        return;
    }
    catch (error) {
        const errCode = error.code;
        if (errCode !== "auth/user-not-found") {
            console.error("[onUserCreated] Unexpected error checking Auth:", error);
            return;
        }
        // auth/user-not-found → proceed to create
    }
    const email = userData.email;
    if (!email) {
        console.error(`[onUserCreated] No email found for document ${firestoreDocId}.`);
        return;
    }
    // Check if an Auth account with this email already exists
    // (could happen if the doc was created with addDoc using a random ID)
    let authUid;
    try {
        const existingUser = await (0, auth_1.getAuth)().getUserByEmail(email);
        authUid = existingUser.uid;
        console.log(`[onUserCreated] Auth account for ${email} already exists (uid: ${authUid}).`);
    }
    catch (emailError) {
        const errCode = emailError.code;
        if (errCode !== "auth/user-not-found") {
            console.error("[onUserCreated] Error checking email:", emailError);
            return;
        }
        // Create a new Firebase Auth account
        try {
            const tempPassword = generateTempPassword();
            const userRecord = await (0, auth_1.getAuth)().createUser({
                email,
                password: tempPassword,
                displayName: userData.name || "",
            });
            authUid = userRecord.uid;
            console.log(`[onUserCreated] Auth account created for ${email} (uid: ${authUid}).`);
        }
        catch (createError) {
            console.error(`[onUserCreated] Failed to create Auth account for ${email}:`, createError);
            return;
        }
    }
    // If the Firestore doc ID doesn't match the Auth UID, migrate the document
    if (firestoreDocId !== authUid) {
        try {
            const batch = db.batch();
            // Create new doc with Auth UID as the ID
            const newDocRef = db.collection("users").doc(authUid);
            batch.set(newDocRef, {
                ...userData,
                createdAt: userData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
            });
            // Delete the old doc with the random ID
            batch.delete(snapshot.ref);
            await batch.commit();
            console.log(`[onUserCreated] Migrated doc ${firestoreDocId} → ${authUid}.`);
        }
        catch (migrationError) {
            console.error("[onUserCreated] Doc migration failed:", migrationError);
            // Non-fatal: the auth account exists, admin can fix the doc
        }
    }
    // Send password reset email so the student can set their own password
    try {
        const resetLink = await (0, auth_1.getAuth)().generatePasswordResetLink(email);
        console.log(`[onUserCreated] Password reset link generated for ${email}: ${resetLink}`);
        // NOTE: Firebase automatically sends the email when using
        // sendPasswordResetEmail from the client. The link above can be
        // used with a custom email service if needed.
        // For now, the admin should tell students to use "Forgot Password".
    }
    catch (resetError) {
        console.error("[onUserCreated] Failed to generate reset link:", resetError);
    }
});
/**
 * Generate a random temporary password (20 chars, alphanumeric + specials).
 * This is never exposed to the user — they must use password reset.
 */
function generateTempPassword() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    let password = "";
    for (let i = 0; i < 20; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}
//# sourceMappingURL=onUserCreated.js.map