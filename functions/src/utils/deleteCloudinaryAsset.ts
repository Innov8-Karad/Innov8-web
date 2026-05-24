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

import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { validateAuth } from "./auth";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const deleteCloudinaryAsset = onCall(
  { maxInstances: 10, region: "asia-south1", cors: true },
  async (request: CallableRequest) => {
    // Requirement: Global Auth Middleware (validate check)
    await validateAuth(request);

    const { publicId, resourceType } = request.data;

    if (!publicId || typeof publicId !== "string") {
      throw new HttpsError(
        "invalid-argument",
        "A valid publicId string is required."
      );
    }

    // Get Cloudinary config from environment
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error("[deleteCloudinaryAsset] Missing Cloudinary config.");
      throw new HttpsError(
        "failed-precondition",
        "Cloudinary is not configured on the server."
      );
    }

    try {
      // Use Cloudinary's REST API directly to avoid heavy SDK in Functions
      const timestamp = Math.floor(Date.now() / 1000);
      const resType = resourceType || "image";

      // Generate signature
      const crypto = await import("crypto");
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
      } else {
        console.error(`[deleteCloudinaryAsset] Unexpected result:`, result);
        throw new HttpsError("internal", `Cloudinary returned: ${JSON.stringify(result)}`);
      }
    } catch (error: unknown) {
      if (error instanceof HttpsError) throw error;
      console.error("[deleteCloudinaryAsset] Error:", error);
      throw new HttpsError("internal", "Failed to delete asset from Cloudinary.");
    }
  }
);
