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
exports.scheduledAdzunaImport = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// ── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Format salary range from Adzuna min/max into a human-readable string.
 */
function formatAdzunaSalary(min, max) {
    if (!min && !max)
        return "Not Disclosed";
    // Adzuna returns annual salary in local currency
    const formatNum = (n) => {
        if (n >= 100000)
            return `${(n / 100000).toFixed(1)} LPA`;
        if (n >= 1000)
            return `${(n / 1000).toFixed(0)}K`;
        return `${n}`;
    };
    if (min && max && min !== max) {
        return `₹ ${formatNum(min)} - ${formatNum(max)}`;
    }
    if (min)
        return `₹ ${formatNum(min)}`;
    if (max)
        return `₹ ${formatNum(max)}`;
    return "Not Disclosed";
}
/**
 * Map Adzuna contract_time to our JobType.
 */
function mapContractType(contractTime) {
    if (!contractTime)
        return "Full-time";
    const normalized = contractTime.toLowerCase();
    if (normalized.includes("part") || normalized.includes("intern")) {
        return "Internship";
    }
    return "Full-time";
}
// ── Scheduled Function ──────────────────────────────────────────────────────
exports.scheduledAdzunaImport = (0, scheduler_1.onSchedule)({
    schedule: "every day 06:00",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
    timeoutSeconds: 120,
}, async () => {
    const appId = process.env.ADZUNA_APP_ID?.trim();
    const appKey = process.env.ADZUNA_APP_KEY?.trim();
    if (!appId || !appKey) {
        console.error("[scheduledAdzunaImport] ADZUNA_APP_ID or ADZUNA_APP_KEY not set in environment.");
        return;
    }
    // Read config from Firestore
    const configDoc = await db.doc("config/adzunaImport").get();
    const config = configDoc.data();
    if (!config || !config.enabled) {
        console.log("[scheduledAdzunaImport] Import disabled or config not found. Skipping.");
        return;
    }
    if (!Array.isArray(config.queries) || config.queries.length === 0) {
        console.log("[scheduledAdzunaImport] No queries configured. Skipping.");
        return;
    }
    let totalImported = 0;
    let totalDuplicates = 0;
    let totalErrors = 0;
    for (const queryConfig of config.queries) {
        try {
            const params = new URLSearchParams({
                app_id: appId,
                app_key: appKey,
                what: queryConfig.role,
                where: queryConfig.city,
                results_per_page: "5",
                sort_by: "date",
            });
            const apiUrl = `https://api.adzuna.com/v1/api/jobs/in/search/1?${params.toString()}`;
            console.log(`[scheduledAdzunaImport] Fetching: ${queryConfig.role} in ${queryConfig.city}`);
            const response = await fetch(apiUrl, {
                headers: { Accept: "application/json" },
            });
            if (!response.ok) {
                console.error(`[scheduledAdzunaImport] Adzuna API error for "${queryConfig.role}" in "${queryConfig.city}": ${response.status} ${response.statusText}`);
                totalErrors++;
                continue;
            }
            const data = (await response.json());
            if (!data.results || data.results.length === 0) {
                console.log(`[scheduledAdzunaImport] No results for "${queryConfig.role}" in "${queryConfig.city}"`);
                continue;
            }
            for (const job of data.results) {
                try {
                    const sourceUrl = job.redirect_url;
                    // Dedupe check
                    const existingSnap = await db
                        .collection("jobs")
                        .where("sourceUrl", "==", sourceUrl)
                        .limit(1)
                        .get();
                    if (!existingSnap.empty) {
                        totalDuplicates++;
                        continue;
                    }
                    // Map to our schema
                    const jobData = {
                        companyName: job.company?.display_name || "Unknown Company",
                        role: job.title || "Untitled Role",
                        location: job.location?.display_name || queryConfig.city,
                        salary: formatAdzunaSalary(job.salary_min, job.salary_max),
                        jobType: mapContractType(job.contract_time),
                        description: job.description || "",
                        requirements: [],
                        eligibleStudentIds: [],
                        applyLink: sourceUrl,
                        isActive: false,
                        pendingApproval: true,
                        source: "adzuna",
                        sourceUrl: sourceUrl,
                        postedDate: admin.firestore.FieldValue.serverTimestamp(),
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    };
                    await db.collection("jobs").add(jobData);
                    totalImported++;
                }
                catch (err) {
                    console.error(`[scheduledAdzunaImport] Error saving job "${job.title}":`, err);
                    totalErrors++;
                }
            }
        }
        catch (err) {
            console.error(`[scheduledAdzunaImport] Error fetching "${queryConfig.role}" in "${queryConfig.city}":`, err);
            totalErrors++;
        }
    }
    console.log(`[scheduledAdzunaImport] Completed: ${totalImported} imported, ${totalDuplicates} duplicates, ${totalErrors} errors`);
});
//# sourceMappingURL=scheduledAdzunaImport.js.map