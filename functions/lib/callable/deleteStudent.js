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
exports.deleteStudent = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../utils/auth");
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
/**
 * Securely deletes a Cloudinary asset via direct REST API fetch.
 */
async function deleteCloudinaryAsset(publicId, resourceType = "image") {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
        console.error("[deleteCloudinaryAsset] Cloudinary credentials missing in environment variables.");
        return;
    }
    try {
        const timestamp = Math.floor(Date.now() / 1000);
        const crypto = await Promise.resolve().then(() => __importStar(require("crypto")));
        const signatureString = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
        const signature = crypto
            .createHash("sha1")
            .update(signatureString)
            .digest("hex");
        const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`;
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
        const result = (await response.json());
        console.log(`[deleteCloudinaryAsset] Deleted asset ${publicId} (${resourceType}):`, result);
    }
    catch (error) {
        console.error(`[deleteCloudinaryAsset] Error deleting asset ${publicId}:`, error);
    }
}
/**
 * Helper to delete Firestore document references in chunks of 400 to respect limit of 500.
 */
async function deleteDocRefs(refs) {
    const batchSize = 400;
    for (let i = 0; i < refs.length; i += batchSize) {
        const chunk = refs.slice(i, i + batchSize);
        const batch = db.batch();
        chunk.forEach((ref) => {
            batch.delete(ref);
        });
        await batch.commit();
    }
}
exports.deleteStudent = (0, https_1.onCall)({ region: "asia-south1", cors: true }, async (request) => {
    // 1. Authenticate and validate admin role
    const userData = await (0, auth_1.validateAuth)(request);
    if (userData.role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Only administrators can delete students.");
    }
    const { studentId } = request.data;
    if (!studentId || typeof studentId !== "string") {
        throw new https_1.HttpsError("invalid-argument", "The studentId argument must be a non-empty string.");
    }
    console.log(`[deleteStudent] Initiating permanent deletion for student: ${studentId}`);
    // 2. Retrieve student document to read metadata (Cloudinary publicId, batchId, email)
    const userDocRef = db.collection("users").doc(studentId);
    const userDocSnap = await userDocRef.get();
    if (!userDocSnap.exists) {
        throw new https_1.HttpsError("not-found", "Student document not found in Firestore database.");
    }
    const studentDocData = userDocSnap.data() || {};
    const profilePhotoPublicId = studentDocData.profilePhotoPublicId;
    const batchId = studentDocData.batchId;
    // 3. Delete from Firebase Authentication
    try {
        await admin.auth().deleteUser(studentId);
        console.log(`[deleteStudent] Firebase Auth account deleted successfully for: ${studentId}`);
    }
    catch (authError) {
        // If the user already doesn't exist in Auth, we can proceed with Firestore cleanup
        if (authError.code !== "auth/user-not-found") {
            console.error(`[deleteStudent] Firebase Auth deletion failed for: ${studentId}`, authError);
            throw new https_1.HttpsError("internal", `Firebase Authentication deletion failed: ${authError.message || authError}`);
        }
        else {
            console.log(`[deleteStudent] Auth account for ${studentId} not found. Proceeding to database cleanup.`);
        }
    }
    // 4. Collect all DocumentReferences to delete
    const refsToDelete = [userDocRef];
    // Subcollection: users/{studentId}/notifications
    const userNotifsSnap = await userDocRef.collection("notifications").get();
    userNotifsSnap.docs.forEach((doc) => refsToDelete.push(doc.ref));
    // Devices
    const devicesSnap = await db.collection("devices")
        .where("userId", "==", studentId)
        .get();
    devicesSnap.docs.forEach((doc) => refsToDelete.push(doc.ref));
    // Fees & nested PaymentHistory
    const feesSnap = await db.collection("fees")
        .where("userId", "==", studentId)
        .get();
    const feesSnap2 = await db.collection("fees")
        .where("studentId", "==", studentId)
        .get();
    const feeDocsMap = new Map();
    feesSnap.docs.forEach((doc) => feeDocsMap.set(doc.id, doc));
    feesSnap2.docs.forEach((doc) => feeDocsMap.set(doc.id, doc));
    for (const feeDoc of feeDocsMap.values()) {
        const historySnap = await feeDoc.ref.collection("paymentHistory").get();
        historySnap.docs.forEach((doc) => refsToDelete.push(doc.ref));
        refsToDelete.push(feeDoc.ref);
    }
    // User Progress (progress and user_progress)
    const progressSnap = await db.collection("user_progress")
        .where("userId", "==", studentId)
        .get();
    const progressSnap2 = await db.collection("user_progress")
        .where("studentId", "==", studentId)
        .get();
    const legacyProgressSnap = await db.collection("progress")
        .where("userId", "==", studentId)
        .get();
    const progressDocsMap = new Map();
    progressSnap.docs.forEach((doc) => progressDocsMap.set(doc.id, doc));
    progressSnap2.docs.forEach((doc) => progressDocsMap.set(doc.id, doc));
    legacyProgressSnap.docs.forEach((doc) => progressDocsMap.set(doc.id, doc));
    // Add exact matches by ID and starting with studentId_
    const progressDirectRef = db.collection("user_progress").doc(studentId);
    const progressDirectSnap = await progressDirectRef.get();
    if (progressDirectSnap.exists) {
        progressDocsMap.set(progressDirectRef.id, progressDirectSnap);
    }
    const legacyDirectRef = db.collection("progress").doc(studentId);
    const legacyDirectSnap = await legacyDirectRef.get();
    if (legacyDirectSnap.exists) {
        progressDocsMap.set(legacyDirectRef.id, legacyDirectSnap);
    }
    // Query composite doc IDs by starting prefix
    const allProgressSnap = await db.collection("user_progress").get();
    allProgressSnap.docs.forEach((doc) => {
        if (doc.id.startsWith(`${studentId}_`)) {
            progressDocsMap.set(doc.id, doc);
        }
    });
    const allLegacyProgressSnap = await db.collection("progress").get();
    allLegacyProgressSnap.docs.forEach((doc) => {
        if (doc.id.startsWith(`${studentId}_`)) {
            progressDocsMap.set(doc.id, doc);
        }
    });
    progressDocsMap.forEach((doc) => refsToDelete.push(doc.ref));
    // Exam Results
    const examResultsSnap = await db.collection("examResults")
        .where("userId", "==", studentId)
        .get();
    examResultsSnap.docs.forEach((doc) => refsToDelete.push(doc.ref));
    // Course Purchases
    const purchasesSnap = await db.collection("course_purchases")
        .where("userId", "==", studentId)
        .get();
    purchasesSnap.docs.forEach((doc) => refsToDelete.push(doc.ref));
    // Enrollment Requests
    const enrollmentRequestsSnap = await db.collection("enrollment_requests")
        .where("userId", "==", studentId)
        .get();
    enrollmentRequestsSnap.docs.forEach((doc) => refsToDelete.push(doc.ref));
    // Notifications (Global collection)
    const globalNotifsSnap = await db.collection("notifications")
        .where("userId", "==", studentId)
        .get();
    globalNotifsSnap.docs.forEach((doc) => refsToDelete.push(doc.ref));
    // Certificates & Certification Results
    const certificatesSnap = await db.collection("certificates")
        .where("userId", "==", studentId)
        .get();
    certificatesSnap.docs.forEach((doc) => refsToDelete.push(doc.ref));
    const certResultsSnap = await db.collection("certification_results")
        .where("userId", "==", studentId)
        .get();
    certResultsSnap.docs.forEach((doc) => refsToDelete.push(doc.ref));
    // Attendance
    const attendanceSnap = await db.collection("attendance")
        .where("studentId", "==", studentId)
        .get();
    attendanceSnap.docs.forEach((doc) => refsToDelete.push(doc.ref));
    // Placement Tally & block statuses
    const placementTallyRef = db.collection("placementTally").doc(studentId);
    refsToDelete.push(placementTallyRef);
    const blockStatusRef = db.collection("user_block_status").doc(studentId);
    refsToDelete.push(blockStatusRef);
    const mockBlockedRef = db.collection("mock_blocked_students").doc(studentId);
    refsToDelete.push(mockBlockedRef);
    // 5. Collection group query: Mock Registrations
    try {
        const registrationsSnap = await db.collectionGroup("registrations")
            .where("userId", "==", studentId)
            .get();
        for (const regDoc of registrationsSnap.docs) {
            const scheduleRef = regDoc.ref.parent.parent;
            if (scheduleRef) {
                try {
                    await scheduleRef.update({
                        registeredCount: admin.firestore.FieldValue.increment(-1),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }
                catch (err) {
                    console.error(`[deleteStudent] Failed to decrement count on mock schedule ${scheduleRef.id}:`, err);
                }
            }
            refsToDelete.push(regDoc.ref);
        }
    }
    catch (err) {
        console.warn(`[deleteStudent] Could not query registrations collection group (index may not exist). Skipping. Error:`, err);
    }
    // 6. Collection group query: Submissions (Assignment Submissions)
    try {
        const submissionsSnap = await db.collectionGroup("submissions")
            .where("userId", "==", studentId)
            .get();
        for (const subDoc of submissionsSnap.docs) {
            const subData = subDoc.data() || {};
            const cloudinaryPublicId = subData.cloudinaryPublicId;
            const fileType = subData.fileType;
            if (cloudinaryPublicId) {
                const resType = fileType === "pdf" ? "raw" : "image";
                try {
                    await deleteCloudinaryAsset(cloudinaryPublicId, resType);
                }
                catch (cloudinaryErr) {
                    console.error(`[deleteStudent] Failed to delete Cloudinary asset ${cloudinaryPublicId} for submission:`, cloudinaryErr);
                }
            }
            refsToDelete.push(subDoc.ref);
        }
    }
    catch (err) {
        console.warn(`[deleteStudent] Could not query submissions collection group (index may not exist). Skipping. Error:`, err);
    }
    // 7. Course enrollment list updates
    const coursesSnap = await db.collection("courses")
        .where("purchasedBy", "array-contains", studentId)
        .get();
    for (const courseDoc of coursesSnap.docs) {
        try {
            await courseDoc.ref.update({
                purchasedBy: admin.firestore.FieldValue.arrayRemove(studentId),
                purchaseCount: admin.firestore.FieldValue.increment(-1),
            });
        }
        catch (err) {
            console.error(`[deleteStudent] Failed to update purchases in course ${courseDoc.id}:`, err);
        }
    }
    // 8. Recalculate and update studentCount for all batches to be fully consistent
    try {
        const allUsersSnap = await db.collection("users")
            .where("role", "==", "student")
            .get();
        const batchCounts = {};
        allUsersSnap.docs.forEach((uDoc) => {
            // Exclude the deleted student since we are in the middle of deleting them
            if (uDoc.id !== studentId) {
                const uData = uDoc.data();
                if (uData.batchId) {
                    batchCounts[uData.batchId] = (batchCounts[uData.batchId] || 0) + 1;
                }
            }
        });
        const allBatchesSnap = await db.collection("batches").get();
        const batchUpdateBatch = db.batch();
        let batchUpdates = 0;
        allBatchesSnap.docs.forEach((batchDoc) => {
            const expectedCount = batchCounts[batchDoc.id] || 0;
            if (batchDoc.data().studentCount !== expectedCount) {
                batchUpdateBatch.update(batchDoc.ref, {
                    studentCount: expectedCount,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                batchUpdates++;
            }
        });
        if (batchUpdates > 0) {
            await batchUpdateBatch.commit();
            console.log(`[deleteStudent] Recalculated and updated studentCount for ${batchUpdates} batches.`);
        }
        else {
            console.log(`[deleteStudent] All batch studentCounts are already synchronized.`);
        }
    }
    catch (err) {
        console.error("[deleteStudent] Failed to recalculate batch student counts:", err);
    }
    // 9. Execute all Firestore deletions in batches
    console.log(`[deleteStudent] Deleting ${refsToDelete.length} documents from Firestore.`);
    await deleteDocRefs(refsToDelete);
    // 10. Delete student profile photo from Cloudinary
    if (profilePhotoPublicId) {
        try {
            await deleteCloudinaryAsset(profilePhotoPublicId, "image");
        }
        catch (cloudinaryErr) {
            console.error(`[deleteStudent] Failed to delete profile photo ${profilePhotoPublicId} from Cloudinary:`, cloudinaryErr);
        }
    }
    console.log(`[deleteStudent] Permanent student deletion successfully completed for: ${studentId}`);
    return { success: true };
});
//# sourceMappingURL=deleteStudent.js.map