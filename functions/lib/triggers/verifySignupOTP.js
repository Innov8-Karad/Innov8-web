"use strict";
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
exports.verifySignupOTP = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// Max incorrect OTP attempts before locking the OTP doc
const MAX_ATTEMPTS = 5;
exports.verifySignupOTP = (0, https_1.onCall)({ region: "asia-south1" }, async (request) => {
    const email = request.data?.email?.trim().toLowerCase();
    const otp = request.data?.otp?.trim();
    // ── Input validation ─────────────────────────────────────────────────────
    if (!email || !otp) {
        throw new https_1.HttpsError("invalid-argument", "Email and OTP are required.");
    }
    if (!/^\d{6}$/.test(otp)) {
        throw new https_1.HttpsError("invalid-argument", "OTP must be a 6-digit number.");
    }
    const docKey = email.replace(/[^a-zA-Z0-9]/g, "_");
    const otpDocRef = db.collection("otp_verifications").doc(docKey);
    // ── Step 1: Read OTP document ─────────────────────────────────────────────
    const otpDoc = await otpDocRef.get();
    if (!otpDoc.exists) {
        throw new https_1.HttpsError("not-found", "No OTP was sent to this email. Please request a new OTP.");
    }
    const data = otpDoc.data();
    const attempts = data.attempts || 0;
    const expiresAt = data.expiresAt || 0;
    const storedOTP = data.otp || "";
    const verified = data.verified || false;
    const now = Date.now();
    // ── Step 2: Already verified? ─────────────────────────────────────────────
    if (verified) {
        // Allow the signup to proceed if already verified (e.g. network retry)
        return { verified: true };
    }
    // ── Step 3: Check brute-force protection ──────────────────────────────────
    if (attempts >= MAX_ATTEMPTS) {
        throw new https_1.HttpsError("resource-exhausted", "Too many incorrect attempts. Please request a new OTP.");
    }
    // ── Step 4: Check expiry ──────────────────────────────────────────────────
    if (now > expiresAt) {
        throw new https_1.HttpsError("deadline-exceeded", "OTP has expired. Please request a new OTP.");
    }
    // ── Step 5: Verify OTP ────────────────────────────────────────────────────
    if (otp !== storedOTP) {
        // Increment attempt counter and reject
        await otpDocRef.update({
            attempts: admin.firestore.FieldValue.increment(1),
        });
        const remaining = MAX_ATTEMPTS - attempts - 1;
        throw new https_1.HttpsError("invalid-argument", remaining > 0
            ? `Incorrect OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
            : "Incorrect OTP. You have no attempts remaining. Please request a new OTP.");
    }
    // ── Step 6: OTP is correct — mark as verified ─────────────────────────────
    await otpDocRef.update({
        verified: true,
        verifiedAt: now,
    });
    console.log(`[verifySignupOTP] Email verified: ${email}`);
    return { verified: true };
});
//# sourceMappingURL=verifySignupOTP.js.map