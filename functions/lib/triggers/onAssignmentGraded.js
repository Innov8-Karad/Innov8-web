"use strict";
// ═══════════════════════════════════════════════════════════════════════════════
// onAssignmentGraded — Firestore Trigger
// ═══════════════════════════════════════════════════════════════════════════════
// When an admin grades a submission (sets status → 'graded'), push a
// notification to the student who submitted it.
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
exports.onAssignmentGraded = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const sendPush_1 = require("../utils/sendPush");
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.onAssignmentGraded = (0, firestore_1.onDocumentUpdated)({
    document: "courses/{courseId}/assignments/{assignmentId}/submissions/{submissionId}",
    region: "asia-south1",
}, async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after)
        return;
    // Only fire when status transitions to 'graded'
    if (before.status === "graded" || after.status !== "graded")
        return;
    const userId = after.userId;
    const grade = after.grade ?? "N/A";
    const feedback = after.feedback || "";
    const tokens = await (0, sendPush_1.getUserTokens)(userId);
    await (0, sendPush_1.sendPush)(tokens, {
        title: "📝 Assignment Graded!",
        body: `You scored ${grade}%.${feedback ? ` Feedback: ${feedback.substring(0, 60)}...` : ""}`,
    }, {
        type: "assignment",
        referenceId: event.params.courseId,
    });
    console.log(`[onAssignmentGraded] Notified user ${userId} — grade: ${grade}%.`);
});
//# sourceMappingURL=onAssignmentGraded.js.map