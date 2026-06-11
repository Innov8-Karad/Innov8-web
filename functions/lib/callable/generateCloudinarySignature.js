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
exports.generateCloudinarySignature = void 0;
const https_1 = require("firebase-functions/v2/https");
const crypto = __importStar(require("crypto"));
exports.generateCloudinarySignature = (0, https_1.onCall)({ region: "asia-south1" }, (request) => {
    // 1. Ensure user is authenticated
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "You must be logged in to upload files.");
    }
    const { folder, public_id, timestamp } = request.data;
    if (!timestamp) {
        throw new https_1.HttpsError("invalid-argument", "Missing timestamp.");
    }
    // Get Cloudinary API secret from environment config
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiSecret) {
        console.error("Cloudinary API secret is missing in environment config.");
        throw new https_1.HttpsError("internal", "Cloudinary configuration is missing.");
    }
    // Build the string to sign. Parameters must be in alphabetical order.
    // e.g. folder=xxx&public_id=yyy&timestamp=zzz
    const paramsToSign = { timestamp };
    if (folder)
        paramsToSign.folder = folder;
    if (public_id)
        paramsToSign.public_id = public_id;
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
        apiKey: process.env.CLOUDINARY_API_KEY
    };
});
//# sourceMappingURL=generateCloudinarySignature.js.map