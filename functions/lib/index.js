"use strict";
// ═══════════════════════════════════════════════════════════════════════════════
// Innov8 Cloud Functions — Entry Point
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
exports.seedInterviewConfig = exports.evaluateInterview = exports.generateInterviewQuestions = exports.searchAdzunaJobs = exports.scheduledAdzunaImport = exports.deleteStudent = exports.generateCloudinarySignature = exports.submitExam = exports.verifySignupOTP = exports.sendSignupOTP = exports.deleteCloudinaryAsset = exports.onSendNotification = exports.onDeviceApproved = exports.onDeviceCreated = exports.onFeeCreated = exports.onAssignmentGraded = exports.onAnnouncementCreated = exports.onUserUpdated = exports.onUserCreated = void 0;
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
var onUserCreated_1 = require("./triggers/onUserCreated");
Object.defineProperty(exports, "onUserCreated", { enumerable: true, get: function () { return onUserCreated_1.onUserCreated; } });
var onUserUpdated_1 = require("./triggers/onUserUpdated");
Object.defineProperty(exports, "onUserUpdated", { enumerable: true, get: function () { return onUserUpdated_1.onUserUpdated; } });
var onAnnouncementCreated_1 = require("./triggers/onAnnouncementCreated");
Object.defineProperty(exports, "onAnnouncementCreated", { enumerable: true, get: function () { return onAnnouncementCreated_1.onAnnouncementCreated; } });
var onAssignmentGraded_1 = require("./triggers/onAssignmentGraded");
Object.defineProperty(exports, "onAssignmentGraded", { enumerable: true, get: function () { return onAssignmentGraded_1.onAssignmentGraded; } });
var onFeeCreated_1 = require("./triggers/onFeeCreated");
Object.defineProperty(exports, "onFeeCreated", { enumerable: true, get: function () { return onFeeCreated_1.onFeeCreated; } });
var onDeviceCreated_1 = require("./triggers/onDeviceCreated");
Object.defineProperty(exports, "onDeviceCreated", { enumerable: true, get: function () { return onDeviceCreated_1.onDeviceCreated; } });
var onDeviceApproved_1 = require("./triggers/onDeviceApproved");
Object.defineProperty(exports, "onDeviceApproved", { enumerable: true, get: function () { return onDeviceApproved_1.onDeviceApproved; } });
var onSendNotification_1 = require("./triggers/onSendNotification");
Object.defineProperty(exports, "onSendNotification", { enumerable: true, get: function () { return onSendNotification_1.onSendNotification; } });
var deleteCloudinaryAsset_1 = require("./utils/deleteCloudinaryAsset");
Object.defineProperty(exports, "deleteCloudinaryAsset", { enumerable: true, get: function () { return deleteCloudinaryAsset_1.deleteCloudinaryAsset; } });
var sendSignupOTP_1 = require("./triggers/sendSignupOTP");
Object.defineProperty(exports, "sendSignupOTP", { enumerable: true, get: function () { return sendSignupOTP_1.sendSignupOTP; } });
var verifySignupOTP_1 = require("./triggers/verifySignupOTP");
Object.defineProperty(exports, "verifySignupOTP", { enumerable: true, get: function () { return verifySignupOTP_1.verifySignupOTP; } });
var submitExam_1 = require("./callable/submitExam");
Object.defineProperty(exports, "submitExam", { enumerable: true, get: function () { return submitExam_1.submitExam; } });
var generateCloudinarySignature_1 = require("./callable/generateCloudinarySignature");
Object.defineProperty(exports, "generateCloudinarySignature", { enumerable: true, get: function () { return generateCloudinarySignature_1.generateCloudinarySignature; } });
var deleteStudent_1 = require("./callable/deleteStudent");
Object.defineProperty(exports, "deleteStudent", { enumerable: true, get: function () { return deleteStudent_1.deleteStudent; } });
var scheduledAdzunaImport_1 = require("./callable/scheduledAdzunaImport");
Object.defineProperty(exports, "scheduledAdzunaImport", { enumerable: true, get: function () { return scheduledAdzunaImport_1.scheduledAdzunaImport; } });
var searchAdzunaJobs_1 = require("./callable/searchAdzunaJobs");
Object.defineProperty(exports, "searchAdzunaJobs", { enumerable: true, get: function () { return searchAdzunaJobs_1.searchAdzunaJobs; } });
var generateInterviewQuestions_1 = require("./callable/generateInterviewQuestions");
Object.defineProperty(exports, "generateInterviewQuestions", { enumerable: true, get: function () { return generateInterviewQuestions_1.generateInterviewQuestions; } });
var evaluateInterview_1 = require("./callable/evaluateInterview");
Object.defineProperty(exports, "evaluateInterview", { enumerable: true, get: function () { return evaluateInterview_1.evaluateInterview; } });
var seedInterviewConfig_1 = require("./callable/seedInterviewConfig");
Object.defineProperty(exports, "seedInterviewConfig", { enumerable: true, get: function () { return seedInterviewConfig_1.seedInterviewConfig; } });
//# sourceMappingURL=index.js.map