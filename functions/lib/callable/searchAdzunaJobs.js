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
exports.searchAdzunaJobs = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("../utils/auth");
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// ── Helpers ──────────────────────────────────────────────────────────────────
function formatSalary(min, max) {
    if (!min && !max)
        return "Not Disclosed";
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
function mapContractType(contractTime) {
    if (!contractTime)
        return "Full-time";
    const normalized = contractTime.toLowerCase();
    if (normalized.includes("part") || normalized.includes("intern")) {
        return "Internship";
    }
    return "Full-time";
}
// ── Callable Function ────────────────────────────────────────────────────────
exports.searchAdzunaJobs = (0, https_1.onCall)({
    region: "asia-south1",
    timeoutSeconds: 60,
    memory: "256MiB",
}, async (request) => {
    // 1. Authenticate and verify admin
    const userData = await (0, auth_1.validateAuth)(request);
    if (userData.role !== "admin") {
        throw new https_1.HttpsError("permission-denied", "Only administrators can search and import external jobs.");
    }
    const { query, location = "pune", page = 1, resultsPerPage = 10, } = (request.data || {});
    if (!query || typeof query !== "string" || !query.trim()) {
        throw new https_1.HttpsError("invalid-argument", "Search query is required.");
    }
    const appId = process.env.ADZUNA_APP_ID?.trim();
    const appKey = process.env.ADZUNA_APP_KEY?.trim();
    if (!appId || !appKey) {
        console.error("[searchAdzunaJobs] ADZUNA credentials missing in environment.");
        throw new https_1.HttpsError("internal", "Adzuna API credentials not configured on the server.");
    }
    const limit = Math.min(Math.max(Number(resultsPerPage) || 10, 1), 20);
    const pageNum = Math.max(Number(page) || 1, 1);
    const params = new URLSearchParams({
        app_id: appId,
        app_key: appKey,
        what: query.trim(),
        where: (location || "pune").trim(),
        results_per_page: String(limit),
        sort_by: "date",
    });
    const apiUrl = `https://api.adzuna.com/v1/api/jobs/in/search/${pageNum}?${params.toString()}`;
    console.log(`[searchAdzunaJobs] Searching: "${query}" in "${location}" (page ${pageNum})`);
    let response;
    try {
        response = await fetch(apiUrl, {
            headers: { Accept: "application/json" },
        });
    }
    catch (err) {
        console.error("[searchAdzunaJobs] Network error calling Adzuna API:", err);
        throw new https_1.HttpsError("unavailable", "Unable to connect to Adzuna job search service.");
    }
    if (!response.ok) {
        console.error(`[searchAdzunaJobs] Adzuna API returned error: ${response.status} ${response.statusText}`);
        throw new https_1.HttpsError("internal", `Adzuna API returned error: ${response.status}`);
    }
    const data = (await response.json());
    const rawResults = data.results || [];
    if (rawResults.length === 0) {
        return { results: [], totalCount: data.count || 0 };
    }
    // 2. Cross-reference with existing jobs in Firestore to flag duplicates
    const urls = rawResults.map((j) => j.redirect_url).filter(Boolean);
    const existingUrlMap = new Map(); // url -> jobId
    if (urls.length > 0) {
        // Chunk queries by 10 for Firestore 'in' limitation if needed, or query individual URLs
        for (let i = 0; i < urls.length; i += 10) {
            const batchUrls = urls.slice(i, i + 10);
            try {
                const snap = await db
                    .collection("jobs")
                    .where("sourceUrl", "in", batchUrls)
                    .get();
                snap.docs.forEach((doc) => {
                    const sourceUrl = doc.data().sourceUrl;
                    if (sourceUrl) {
                        existingUrlMap.set(sourceUrl, doc.id);
                    }
                });
            }
            catch (err) {
                console.warn("[searchAdzunaJobs] Error checking duplicate URLs:", err);
            }
        }
    }
    // 3. Format results
    const results = rawResults.map((job) => {
        const sourceUrl = job.redirect_url || "";
        const isAlreadyImported = existingUrlMap.has(sourceUrl);
        return {
            id: job.id,
            role: job.title || "Untitled Role",
            companyName: job.company?.display_name || "Unknown Company",
            location: job.location?.display_name || location,
            salary: formatSalary(job.salary_min, job.salary_max),
            jobType: mapContractType(job.contract_time),
            description: job.description || "",
            sourceUrl: sourceUrl,
            created: job.created || new Date().toISOString(),
            isAlreadyImported: isAlreadyImported,
            importedJobId: isAlreadyImported ? existingUrlMap.get(sourceUrl) : undefined,
        };
    });
    return {
        results,
        totalCount: data.count || results.length,
    };
});
//# sourceMappingURL=searchAdzunaJobs.js.map