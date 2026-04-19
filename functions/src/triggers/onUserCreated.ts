// ═══════════════════════════════════════════════════════════════════════════════
// onUserCreated — Firestore Trigger
// ═══════════════════════════════════════════════════════════════════════════════
// When an admin creates a student via the web panel (Firestore write only),
// this function auto-creates a Firebase Auth account and sends a branded
// welcome email so the student can set their own password and log in.
// ═══════════════════════════════════════════════════════════════════════════════

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { sendEmail, buildWelcomeEmailHtml } from "../utils/sendEmail";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

export const onUserCreated = onDocumentCreated(
  {
    document: "users/{userId}",
    region: "asia-south1",
  },
  async (event) => {
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
      await getAuth().getUser(firestoreDocId);
      console.log(`[onUserCreated] Auth account already exists for ${firestoreDocId}. Skipping.`);
      return;
    } catch (error: unknown) {
      const errCode = (error as { code?: string }).code;
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
    let authUid: string;
    try {
      const existingUser = await getAuth().getUserByEmail(email);
      authUid = existingUser.uid;
      console.log(`[onUserCreated] Auth account for ${email} already exists (uid: ${authUid}).`);
    } catch (emailError: unknown) {
      const errCode = (emailError as { code?: string }).code;
      if (errCode !== "auth/user-not-found") {
        console.error("[onUserCreated] Error checking email:", emailError);
        return;
      }

      // Create a new Firebase Auth account
      try {
        const tempPassword = generateTempPassword();
        const userRecord = await getAuth().createUser({
          email,
          password: tempPassword,
          displayName: userData.name || "",
        });
        authUid = userRecord.uid;
        console.log(`[onUserCreated] Auth account created for ${email} (uid: ${authUid}).`);
      } catch (createError) {
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
      } catch (migrationError) {
        console.error("[onUserCreated] Doc migration failed:", migrationError);
        // Non-fatal: the auth account exists, admin can fix the doc
      }
    }

    // Generate password reset link and send branded welcome email
    try {
      let resetLink = await getAuth().generatePasswordResetLink(email);
      resetLink = `${resetLink}&type=onboarding`;
      console.log(`[onUserCreated] Password reset link generated for ${email}.`);

      const studentName = userData.name || "Student";
      const courseName = userData.course || undefined;
      const batchName = userData.batch || undefined;

      const emailHtml = buildWelcomeEmailHtml(studentName, resetLink, courseName, batchName);

      await sendEmail(
        email,
        "Welcome to Innov8 — Set Your Password",
        emailHtml
      );

      console.log(`[onUserCreated] Welcome email sent to ${email}.`);
    } catch (emailError) {
      console.error("[onUserCreated] Failed to send welcome email:", emailError);
    }
  }
);

/**
 * Generate a random temporary password (20 chars, alphanumeric + specials).
 * This is never exposed to the user — they must use password reset.
 */
function generateTempPassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let password = "";
  for (let i = 0; i < 20; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

