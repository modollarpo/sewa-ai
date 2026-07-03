/**
 * SEWA XAI — Natural Language Query Routes
 */
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { NaturalLanguageQueryService } from "../services/naturalLanguageQueryService";
import { auditLog } from "../utils/audit";
import { logger } from "../utils/logger";

const router = Router();
router.use(authenticate);

/**
 * Execute a natural language query
 * POST /api/v1/nlq/query
 */
router.post("/query", async (req, res, next) => {
  try {
    const { query } = req.body;
    const { tenantId, id: userId } = req.user!;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({ error: "Query is required and must be a non-empty string" });
    }

    logger.info(`[NLQ] Processing query from user ${userId}: ${query}`);

    // Parse the query
    const parsed = NaturalLanguageQueryService.parseQuery(query);
    logger.debug(`[NLQ] Parsed query:`, parsed);

    // Execute the query
    const results = await NaturalLanguageQueryService.executeQuery(parsed, tenantId, userId);
    logger.info(`[NLQ] Found ${results.length} results`);

    // Generate summary
    const summary = NaturalLanguageQueryService.generateSummary(results, query);

    // Audit log
    await auditLog({
      tenantId,
      userId,
      action: "NATURAL_LANGUAGE_QUERY",
      entity: "Scan",
      metadata: { query, resultCount: results.length },
    });

    res.json({
      success: true,
      query,
      parsed,
      summary,
      results,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
