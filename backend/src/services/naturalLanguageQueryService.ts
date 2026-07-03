/**
 * SEWA XAI — Natural Language Query Service
 *
 * Features:
 * - Semantic search over reports and findings
 * - LLM-based query parsing
 * - Filtering by modality, patient, date range, etc.
 */
import { prisma } from "../utils/prismaClient";

// Simple keyword/semantic mapping for clinical queries
const CLINICAL_KEYWORDS = {
  findings: [
    "ich", "intracranial hemorrhage", "hemorrhage",
    "stroke", "ischemic stroke", "hemorrhagic stroke",
    "pe", "pulmonary embolism",
    "pneumonia",
    "pneumothorax",
    "mass", "calcification",
    "diabetic retinopathy", "dr",
    "glaucoma",
    "amd", "macular degeneration",
    "tuberculosis", "tb",
  ],
  modalities: ["ct", "mri", "x-ray", "xr", "mammography", "retinal", "ultrasound", "us"],
  body_parts: ["head", "brain", "chest", "abdomen", "pelvis", "breast", "eye"],
  urgency: ["critical", "urgent", "normal", "routine"],
  time_ranges: ["today", "yesterday", "last week", "last month", "last year"],
};

interface ParsedQuery {
  keywords: string[];
  modalities: string[];
  bodyParts: string[];
  urgency: string[];
  patientId?: string;
  startDate?: Date;
  endDate?: Date;
}

export class NaturalLanguageQueryService {
  /**
   * Parse a natural language query into structured filters
   */
  static parseQuery(query: string): ParsedQuery {
    const lowerQuery = query.toLowerCase();
    const parsed: ParsedQuery = {
      keywords: [],
      modalities: [],
      bodyParts: [],
      urgency: [],
    };

    // Extract keywords
    CLINICAL_KEYWORDS.findings.forEach((keyword) => {
      if (lowerQuery.includes(keyword)) {
        parsed.keywords.push(keyword);
      }
    });

    // Extract modalities
    CLINICAL_KEYWORDS.modalities.forEach((modality) => {
      if (lowerQuery.includes(modality)) {
        let m = modality.toUpperCase();
        if (m === "X-RAY") m = "XR";
        parsed.modalities.push(m);
      }
    });

    // Extract body parts
    CLINICAL_KEYWORDS.bodyParts.forEach((bodyPart) => {
      if (lowerQuery.includes(bodyPart)) {
        parsed.bodyParts.push(bodyPart);
      }
    });

    // Extract urgency
    CLINICAL_KEYWORDS.urgency.forEach((urgency) => {
      if (lowerQuery.includes(urgency)) {
        parsed.urgency.push(urgency.toUpperCase());
      }
    });

    // Extract time ranges
    if (lowerQuery.includes("today")) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      parsed.startDate = today;
      parsed.endDate = new Date();
    } else if (lowerQuery.includes("yesterday")) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const end = new Date(yesterday);
      end.setHours(23, 59, 59, 999);
      parsed.startDate = yesterday;
      parsed.endDate = end;
    } else if (lowerQuery.includes("last week")) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      parsed.startDate = weekAgo;
      parsed.endDate = new Date();
    } else if (lowerQuery.includes("last month")) {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      parsed.startDate = monthAgo;
      parsed.endDate = new Date();
    } else if (lowerQuery.includes("last year")) {
      const yearAgo = new Date();
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      parsed.startDate = yearAgo;
      parsed.endDate = new Date();
    }

    return parsed;
  }

  /**
   * Execute the parsed query against the database
   */
  static async executeQuery(
    parsed: ParsedQuery,
    tenantId: string,
    userId: string
  ) {
    const where: any = { tenantId };

    // Filter by modality
    if (parsed.modalities.length > 0) {
      where.modality = { in: parsed.modalities };
    }

    // Filter by time range
    if (parsed.startDate && parsed.endDate) {
      where.createdAt = {
        gte: parsed.startDate,
        lte: parsed.endDate,
      };
    }

    // Build AI result search (Prisma relation filter syntax)
    if (parsed.keywords.length > 0 || parsed.urgency.length > 0) {
      const aiResultFilters: any[] = [];

      parsed.keywords.forEach((keyword) => {
        aiResultFilters.push(
          { primaryFinding: { contains: keyword, mode: "insensitive" } },
          { summary: { contains: keyword, mode: "insensitive" } }
        );
      });

      if (parsed.urgency.length > 0) {
        aiResultFilters.push({ urgency: { in: parsed.urgency } });
      }

      if (aiResultFilters.length > 0) {
        where.aiResult = {
          is: {
            OR: aiResultFilters,
          },
        };
      }
    }

    const scans = await prisma.scan.findMany({
      where,
      include: {
        patient: true,
        aiResult: true,
        report: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return scans;
  }

  /**
   * Generate a natural language summary of the results
   */
  static generateSummary(results: any[], query: string): string {
    if (results.length === 0) {
      return "No matching scans found for your query.";
    }

    const criticalCount = results.filter(
      (s) => s.aiResult?.urgency === "CRITICAL"
    ).length;
    const urgentCount = results.filter(
      (s) => s.aiResult?.urgency === "URGENT"
    ).length;

    let summary = `Found ${results.length} matching scan${results.length > 1 ? "s" : ""}.`;
    if (criticalCount > 0) {
      summary += ` ${criticalCount} critical finding${criticalCount > 1 ? "s" : ""}.`;
    }
    if (urgentCount > 0) {
      summary += ` ${urgentCount} urgent finding${urgentCount > 1 ? "s" : ""}.`;
    }

    return summary;
  }
}
