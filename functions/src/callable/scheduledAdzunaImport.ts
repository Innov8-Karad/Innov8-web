import { onSchedule } from "firebase-functions/v2/scheduler";
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

interface AdzunaQuery {
  role: string;
  city: string;
}

interface AdzunaConfig {
  enabled: boolean;
  queries: AdzunaQuery[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format salary range from Adzuna min/max into a human-readable string.
 */
function formatAdzunaSalary(min?: number, max?: number): string {
  if (!min && !max) return "Not Disclosed";

  // Adzuna returns annual salary in local currency
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

/**
 * Map Adzuna contract_time to our JobType.
 */
function mapContractType(contractTime?: string): "Full-time" | "Internship" {
  if (!contractTime) return "Full-time";
  const normalized = contractTime.toLowerCase();
  if (normalized.includes("part") || normalized.includes("intern")) {
    return "Internship";
  }
  return "Full-time";
}

// ── Scheduled Function ──────────────────────────────────────────────────────

export const scheduledAdzunaImport = onSchedule(
  {
    schedule: "every day 06:00",
    timeZone: "Asia/Kolkata",
    region: "asia-south1",
    timeoutSeconds: 120,
  },
  async () => {
    const appId = process.env.ADZUNA_APP_ID?.trim();
    const appKey = process.env.ADZUNA_APP_KEY?.trim();

    if (!appId || !appKey) {
      console.error(
        "[scheduledAdzunaImport] ADZUNA_APP_ID or ADZUNA_APP_KEY not set in environment."
      );
      return;
    }

    // Read config from Firestore
    const configDoc = await db.doc("config/adzunaImport").get();
    const config = configDoc.data() as AdzunaConfig | undefined;

    if (!config || !config.enabled) {
      console.log(
        "[scheduledAdzunaImport] Import disabled or config not found. Skipping."
      );
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

        console.log(
          `[scheduledAdzunaImport] Fetching: ${queryConfig.role} in ${queryConfig.city}`
        );

        const response = await fetch(apiUrl, {
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          console.error(
            `[scheduledAdzunaImport] Adzuna API error for "${queryConfig.role}" in "${queryConfig.city}": ${response.status} ${response.statusText}`
          );
          totalErrors++;
          continue;
        }

        const data = (await response.json()) as AdzunaResponse;

        if (!data.results || data.results.length === 0) {
          console.log(
            `[scheduledAdzunaImport] No results for "${queryConfig.role}" in "${queryConfig.city}"`
          );
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
            const jobData: Record<string, unknown> = {
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
          } catch (err) {
            console.error(
              `[scheduledAdzunaImport] Error saving job "${job.title}":`,
              err
            );
            totalErrors++;
          }
        }
      } catch (err) {
        console.error(
          `[scheduledAdzunaImport] Error fetching "${queryConfig.role}" in "${queryConfig.city}":`,
          err
        );
        totalErrors++;
      }
    }

    console.log(
      `[scheduledAdzunaImport] Completed: ${totalImported} imported, ${totalDuplicates} duplicates, ${totalErrors} errors`
    );
  }
);
