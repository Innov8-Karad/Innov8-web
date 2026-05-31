// ═══════════════════════════════════════════════════════════════════════════════
// verifySignupOTP — HTTPS Callable Cloud Function
// ═══════════════════════════════════════════════════════════════════════════════
// Called from the mobile app after the user enters the 6-digit OTP.
// Validates:
//   1. OTP document exists for the given email
//   2. OTP has not expired (5 minutes)
//   3. Brute-force protection (max 5 incorrect attempts)
//   4. OTP matches exactly
// On success, marks the document as verified. The mobile signup flow
// reads this flag before proceeding to Firebase Auth account creation.
// ═══════════════════════════════════════════════════════════════════════════════

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Max incorrect OTP attempts before locking the OTP doc
const MAX_ATTEMPTS = 5;

export const verifySignupOTP = onCall(
  { region: "asia-south1" },
  async (request) => {
    const email: string = request.data?.email?.trim().toLowerCase();
    const otp: string = request.data?.otp?.trim();

    // ── Input validation ─────────────────────────────────────────────────────
    if (!email || !otp) {
      throw new HttpsError("invalid-argument", "Email and OTP are required.");
    }
    if (!/^\d{6}$/.test(otp)) {
      throw new HttpsError("invalid-argument", "OTP must be a 6-digit number.");
    }

    const docKey = email.replace(/[^a-zA-Z0-9]/g, "_");
    const otpDocRef = db.collection("otp_verifications").doc(docKey);

    // ── Step 1: Read OTP document ─────────────────────────────────────────────
    const otpDoc = await otpDocRef.get();
    if (!otpDoc.exists) {
      throw new HttpsError(
        "not-found",
        "No OTP was sent to this email. Please request a new OTP."
      );
    }

    const data = otpDoc.data()!;
    const attempts: number = data.attempts || 0;
    const expiresAt: number = data.expiresAt || 0;
    const storedOTP: string = data.otp || "";
    const verified: boolean = data.verified || false;
    const now = Date.now();

    // ── Step 2: Already verified? ─────────────────────────────────────────────
    if (verified) {
      // Allow the signup to proceed if already verified (e.g. network retry)
      return { verified: true };
    }

    // ── Step 3: Check brute-force protection ──────────────────────────────────
    if (attempts >= MAX_ATTEMPTS) {
      throw new HttpsError(
        "resource-exhausted",
        "Too many incorrect attempts. Please request a new OTP."
      );
    }

    // ── Step 4: Check expiry ──────────────────────────────────────────────────
    if (now > expiresAt) {
      throw new HttpsError(
        "deadline-exceeded",
        "OTP has expired. Please request a new OTP."
      );
    }

    // ── Step 5: Verify OTP ────────────────────────────────────────────────────
    if (otp !== storedOTP) {
      // Increment attempt counter and reject
      await otpDocRef.update({
        attempts: admin.firestore.FieldValue.increment(1),
      });
      const remaining = MAX_ATTEMPTS - attempts - 1;
      throw new HttpsError(
        "invalid-argument",
        remaining > 0
          ? `Incorrect OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
          : "Incorrect OTP. You have no attempts remaining. Please request a new OTP."
      );
    }

    // ── Step 6: OTP is correct — mark as verified ─────────────────────────────
    await otpDocRef.update({
      verified: true,
      verifiedAt: now,
    });

    console.log(`[verifySignupOTP] Email verified: ${email}`);
    return { verified: true };
  }
);
