"use strict";
// ═══════════════════════════════════════════════════════════════════════════════
// Innov8 Cloud Functions — Entry Point
// ═══════════════════════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCloudinaryAsset = exports.onSendNotification = exports.onDeviceApproved = exports.onDeviceCreated = exports.onFeeCreated = exports.onAssignmentGraded = exports.onAnnouncementCreated = exports.onUserUpdated = exports.onUserCreated = void 0;
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
//# sourceMappingURL=index.js.map