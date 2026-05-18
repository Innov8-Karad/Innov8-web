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
exports.validateAuth = validateAuth;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
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
async function validateAuth(request) {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be logged in to perform this action.");
    }
    const uid = request.auth.uid;
    const userDoc = await admin.firestore().collection("users").doc(uid).get();
    if (!userDoc.exists) {
        throw new https_1.HttpsError("not-found", "User profile not found.");
    }
    const userData = userDoc.data();
    if (!userData) {
        throw new https_1.HttpsError("internal", "User data is empty.");
    }
    // Check if user is blocked
    if (userData.isBlocked === true) {
        throw new https_1.HttpsError("permission-denied", "Account blocked by admin");
    }
    // Requirement: Token version invalidation
    // If the JWT has a tokenVersion, it must match the database
    const tokenVersion = userData.tokenVersion || 0;
    // Cast to a specific type instead of any to satisfy linter
    const requestTokenVersion = request.auth.token.tokenVersion || 0;
    if (requestTokenVersion < tokenVersion) {
        // This forces the client to refresh their token or log out
        throw new https_1.HttpsError("unauthenticated", "Session expired due to account changes. Please log in again.");
    }
    return userData;
}
//# sourceMappingURL=auth.js.map