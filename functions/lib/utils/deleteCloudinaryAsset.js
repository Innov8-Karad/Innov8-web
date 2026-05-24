"use strict";
// ═══════════════════════════════════════════════════════════════════════════════
// deleteCloudinaryAsset — HTTPS Callable Cloud Function
// ═══════════════════════════════════════════════════════════════════════════════
// Securely deletes a Cloudinary asset using the api_secret which must NEVER
// be exposed on the client. Called from both web and mobile via httpsCallable.
//
// SETUP: Set environment config before deploying:
//   firebase functions:config:set cloudinary.cloud_name="YOUR_NAME"
//   firebase functions:config:set cloudinary.api_key="YOUR_KEY"
//   firebase functions:config:set cloudinary.api_secret="YOUR_SECRET"
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
exports.deleteCloudinaryAsset = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("./auth");
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.deleteCloudinaryAsset = (0, https_1.onCall)({ maxInstances: 10, region: "asia-south1", cors: true }, async (request) => {
    // Requirement: Global Auth Middleware (validate check)
    await (0, auth_1.validateAuth)(request);
    const { publicId, resourceType } = request.data;
    if (!publicId || typeof publicId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "A valid publicId string is required.");
    }
    // Get Cloudinary config from environment
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
        console.error("[deleteCloudinaryAsset] Missing Cloudinary config.");
        throw new https_1.HttpsError("failed-precondition", "Cloudinary is not configured on the server.");
    }
    try {
        // Use Cloudinary's REST API directly to avoid heavy SDK in Functions
        const timestamp = Math.floor(Date.now() / 1000);
        const resType = resourceType || "image";
        // Generate signature
        const crypto = await Promise.resolve().then(() => __importStar(require("crypto")));
        const signatureString = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
        const signature = crypto
            .createHash("sha1")
            .update(signatureString)
            .digest("hex");
        // Call Cloudinary Destroy API
        const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resType}/destroy`;
        const formBody = new URLSearchParams({
            public_id: publicId,
            timestamp: timestamp.toString(),
            api_key: apiKey,
            signature,
        });
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formBody.toString(),
        });
        const result = await response.json();
        if (result.result === "ok" || result.result === "not found") {
            console.log(`[deleteCloudinaryAsset] Deleted ${publicId}: ${result.result}`);
            return { success: true, result: result.result };
        }
        else {
            console.error(`[deleteCloudinaryAsset] Unexpected result:`, result);
            throw new https_1.HttpsError("internal", `Cloudinary returned: ${JSON.stringify(result)}`);
        }
    }
    catch (error) {
        if (error instanceof https_1.HttpsError)
            throw error;
        console.error("[deleteCloudinaryAsset] Error:", error);
        throw new https_1.HttpsError("internal", "Failed to delete asset from Cloudinary.");
    }
});
//# sourceMappingURL=deleteCloudinaryAsset.js.map