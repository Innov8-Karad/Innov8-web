import { onCall, HttpsError } from "firebase-functions/v2/https";
import { validateAuth } from "../utils/auth";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ── Types ────────────────────────────────────────────────────────────────────

interface AdzunaJob {
  id: string;
  title: string;
  description: string;
  redirect_url: string;
  company: { display_name: string };
  location: { display_name: string; area?: string[] };
  salary_min?: number;
  salary_max?: number;
  contract_time?: string;
  contract_type?: string;
  created: string;
  category?: { label: string };
}

interface AdzunaResponse {
  results: AdzunaJob[];
  count: number;
}

export interface FormattedSearchResult {
  id: string;
  role: string;
  companyName: string;
  location: string;
  salary: string;
  jobType: "Full-time" | "Internship";
  description: string;
  sourceUrl: string;
  created: string;
  isAlreadyImported: boolean;
  importedJobId?: string;
}

interface SearchAdzunaRequest {
  query: string;
  location?: string;
  page?: number;
  resultsPerPage?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatSalary(min?: number, max?: number): string {
  if (!min && !max) return "Not Disclosed";

  const formatNum = (n: number) => {
    if (n >= 100000) return `${(n / 100000).toFixed(1)} LPA`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return `${n}`;
  };

  if (min && max && min !== max) {
    return `₹ ${formatNum(min)} - ${formatNum(max)}`;
  }
  if (min) return `₹ ${formatNum(min)}`;
  if (max) return `₹ ${formatNum(max)}`;

  return "Not Disclosed";
}

function mapContractType(contractTime?: string): "Full-time" | "Internship" {
  if (!contractTime) return "Full-time";
  const normalized = contractTime.toLowerCase();
  if (normalized.includes("part") || normalized.includes("intern")) {
    return "Internship";
  }
  return "Full-time";
}

// ── Callable Function ────────────────────────────────────────────────────────

export const searchAdzunaJobs = onCall(
  {
    region: "asia-south1",
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request): Promise<{ results: FormattedSearchResult[]; totalCount: number }> => {
    // 1. Authenticate and verify admin
    const userData = await validateAuth(request);
    if (userData.role !== "admin") {
      throw new HttpsError(
        "permission-denied",
        "Only administrators can search and import external jobs."
      );
    }

    const {
      query,
      location = "pune",
      page = 1,
      resultsPerPage = 10,
    } = (request.data || {}) as SearchAdzunaRequest;

    if (!query || typeof query !== "string" || !query.trim()) {
      throw new HttpsError("invalid-argument", "Search query is required.");
    }

    const appId = process.env.ADZUNA_APP_ID?.trim();
    const appKey = process.env.ADZUNA_APP_KEY?.trim();

    if (!appId || !appKey) {
      console.error("[searchAdzunaJobs] ADZUNA credentials missing in environment.");
      throw new HttpsError(
        "internal",
        "Adzuna API credentials not configured on the server."
      );
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

    let response: Response;
    try {
      response = await fetch(apiUrl, {
        headers: { Accept: "application/json" },
      });
    } catch (err) {
      console.error("[searchAdzunaJobs] Network error calling Adzuna API:", err);
      throw new HttpsError("unavailable", "Unable to connect to Adzuna job search service.");
    }

    if (!response.ok) {
      console.error(
        `[searchAdzunaJobs] Adzuna API returned error: ${response.status} ${response.statusText}`
      );
      throw new HttpsError(
        "internal",
        `Adzuna API returned error: ${response.status}`
      );
    }

    const data = (await response.json()) as AdzunaResponse;
    const rawResults = data.results || [];

    if (rawResults.length === 0) {
      return { results: [], totalCount: data.count || 0 };
    }

    // 2. Cross-reference with existing jobs in Firestore to flag duplicates
    const urls = rawResults.map((j) => j.redirect_url).filter(Boolean);
    const existingUrlMap = new Map<string, string>(); // url -> jobId

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
            const sourceUrl = doc.data().sourceUrl as string | undefined;
            if (sourceUrl) {
              existingUrlMap.set(sourceUrl, doc.id);
            }
          });
        } catch (err) {
          console.warn("[searchAdzunaJobs] Error checking duplicate URLs:", err);
        }
      }
    }

    // 3. Format results
    const results: FormattedSearchResult[] = rawResults.map((job) => {
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
  }
);
