// ═══════════════════════════════════════════════════════════════════════════════
// Innov8 Cloud Functions — Entry Point
// ═══════════════════════════════════════════════════════════════════════════════

import * as admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp();
}

export { onUserCreated } from "./triggers/onUserCreated";
export { onUserUpdated } from "./triggers/onUserUpdated";
export { onAnnouncementCreated } from "./triggers/onAnnouncementCreated";
export { onAssignmentGraded } from "./triggers/onAssignmentGraded";
export { onFeeCreated } from "./triggers/onFeeCreated";
export { onDeviceCreated } from "./triggers/onDeviceCreated";
export { onDeviceApproved } from "./triggers/onDeviceApproved";
export { onSendNotification } from "./triggers/onSendNotification";
export { deleteCloudinaryAsset } from "./utils/deleteCloudinaryAsset";
export { sendSignupOTP } from "./triggers/sendSignupOTP";
export { verifySignupOTP } from "./triggers/verifySignupOTP";
export { submitExam } from "./callable/submitExam";
export { generateCloudinarySignature } from "./callable/generateCloudinarySignature";
export { deleteStudent } from "./callable/deleteStudent";
export { scheduledAdzunaImport } from "./callable/scheduledAdzunaImport";
export { searchAdzunaJobs } from "./callable/searchAdzunaJobs";
export { generateInterviewQuestions } from "./callable/generateInterviewQuestions";
export { evaluateInterview } from "./callable/evaluateInterview";
export { seedInterviewConfig } from "./callable/seedInterviewConfig";
