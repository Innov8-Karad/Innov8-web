// ═══════════════════════════════════════════════════════════════════════════════
// Innov8 Cloud Functions — Entry Point
// ═══════════════════════════════════════════════════════════════════════════════

export { onUserCreated } from "./triggers/onUserCreated";
export { onAnnouncementCreated } from "./triggers/onAnnouncementCreated";
export { onAssignmentGraded } from "./triggers/onAssignmentGraded";
export { onFeeCreated } from "./triggers/onFeeCreated";
export { deleteCloudinaryAsset } from "./utils/deleteCloudinaryAsset";
