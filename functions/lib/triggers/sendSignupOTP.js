"use strict";
// ═══════════════════════════════════════════════════════════════════════════════
// sendSignupOTP — HTTPS Callable Cloud Function
// ═══════════════════════════════════════════════════════════════════════════════
// Called from the mobile app during signup to send an email OTP.
// Validates:
//   1. Email format
//   2. Email not already registered in Firebase Auth
//   3. Rate limiting (max 3 OTP requests per email per 15 minutes)
// Then generates a 6-digit OTP, stores it in Firestore, and emails it.
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
exports.sendSignupOTP = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("firebase-admin/auth");
const sendEmail_1 = require("../utils/sendEmail");
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// OTP expiry: 5 minutes
const OTP_EXPIRY_MS = 5 * 60 * 1000;
// Rate limit: max 3 OTP requests per email per 15 minutes
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 3;
exports.sendSignupOTP = (0, https_1.onCall)({ region: "asia-south1" }, async (request) => {
    const email = request.data?.email?.trim().toLowerCase();
    // ── Step 1: Validate email format & domain ───────────────────────────────
    if (!email) {
        throw new https_1.HttpsError("invalid-argument", "Email is required.");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new https_1.HttpsError("invalid-argument", "Invalid email address format.");
    }
    const ALLOWED_EMAIL_DOMAINS = [
        'gmail.com',
        'yahoo.com',
        'yahoo.co.in',
        'yahoo.in',
        'outlook.com',
        'hotmail.com',
        'icloud.com'
    ];
    const domain = email.split('@')[1]?.toLowerCase();
    if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) {
        throw new https_1.HttpsError("invalid-argument", "Please use a trusted provider (Gmail, Yahoo, Outlook, iCloud)");
    }
    // ── Step 2: Check if email already registered in Firebase Auth ───────────
    try {
        await (0, auth_1.getAuth)().getUserByEmail(email);
        // If no error thrown, user exists — reject early with a helpful message
        throw new https_1.HttpsError("already-exists", "This email is already registered. Please go to the Login screen.");
    }
    catch (authError) {
        // auth/user-not-found means email is free — continue
        if (authError?.code === "auth/user-not-found") {
            // Good — email not yet registered
        }
        else if (authError instanceof https_1.HttpsError) {
            // Re-throw our own "already-exists" error
            throw authError;
        }
        else {
            console.error("[sendSignupOTP] Unexpected auth check error:", authError);
            throw new https_1.HttpsError("internal", "Could not verify email availability. Try again.");
        }
    }
    // ── Step 3: Rate limiting check ──────────────────────────────────────────
    // Use a sanitised email as the Firestore document key
    const docKey = email.replace(/[^a-zA-Z0-9]/g, "_");
    const otpDocRef = db.collection("otp_verifications").doc(docKey);
    const existingDoc = await otpDocRef.get();
    if (existingDoc.exists) {
        const data = existingDoc.data();
        const createdAt = data.createdAt || 0;
        const requestCount = data.requestCount || 0;
        const now = Date.now();
        // If within rate-limit window and exceeded max attempts
        if (now - createdAt < RATE_LIMIT_WINDOW_MS && requestCount >= RATE_LIMIT_MAX) {
            throw new https_1.HttpsError("resource-exhausted", "Too many OTP requests. Please wait 15 minutes before trying again.");
        }
    }
    // ── Step 4: Generate 6-digit OTP ─────────────────────────────────────────
    const otp = generateOTP();
    const now = Date.now();
    // ── Step 5: Store OTP in Firestore ────────────────────────────────────────
    const isNewWindow = !existingDoc.exists ||
        (now - (existingDoc.data()?.createdAt || 0)) >= RATE_LIMIT_WINDOW_MS;
    await otpDocRef.set({
        email,
        otp,
        createdAt: isNewWindow ? now : (existingDoc.data()?.createdAt || now),
        expiresAt: now + OTP_EXPIRY_MS,
        verified: false,
        attempts: 0,
        requestCount: isNewWindow ? 1 : admin.firestore.FieldValue.increment(1),
    });
    console.log(`[sendSignupOTP] OTP generated for ${email}`);
    // ── Step 6: Send branded OTP email ────────────────────────────────────────
    const html = (0, sendEmail_1.buildOTPEmailHtml)(otp, email);
    await (0, sendEmail_1.sendEmail)(email, "Your Innov8 Signup OTP", html);
    console.log(`[sendSignupOTP] OTP email sent to ${email}`);
    return { success: true };
});
/**
 * Generate a random 6-digit numeric OTP.
 */
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
//# sourceMappingURL=sendSignupOTP.js.map