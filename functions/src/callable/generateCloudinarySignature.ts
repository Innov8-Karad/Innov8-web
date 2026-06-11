import * as functions from "firebase-functions";
import * as crypto from "crypto";

export const generateCloudinarySignature = functions.region("asia-south1").https.onCall((data, context) => {
    // 1. Ensure user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in to upload files.");
    }

    const { folder, public_id, timestamp } = data;

    if (!timestamp) {
        throw new functions.https.HttpsError("invalid-argument", "Missing timestamp.");
    }

    // Get Cloudinary API secret from Firebase config
    const apiSecret = functions.config().cloudinary?.api_secret || process.env.CLOUDINARY_API_SECRET;
    
    if (!apiSecret) {
        console.error("Cloudinary API secret is missing in environment config.");
        throw new functions.https.HttpsError("internal", "Cloudinary configuration is missing.");
    }

    // Build the string to sign. Parameters must be in alphabetical order.
    // e.g. folder=xxx&public_id=yyy&timestamp=zzz
    const paramsToSign: Record<string, any> = { timestamp };
    if (folder) paramsToSign.folder = folder;
    if (public_id) paramsToSign.public_id = public_id;

    // Filter out undefined and sort keys
    const sortedKeys = Object.keys(paramsToSign).filter((k) => paramsToSign[k] !== undefined).sort();
    
    const signString = sortedKeys.map((key) => `${key}=${paramsToSign[key]}`).join("&");

    // Generate SHA-1 signature
    const shasum = crypto.createHash("sha1");
    shasum.update(signString + apiSecret);
    const signature = shasum.digest("hex");

    return {
        signature,
        timestamp,
        apiKey: functions.config().cloudinary?.api_key || process.env.CLOUDINARY_API_KEY
    };
});
