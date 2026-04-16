const express = require("express");

const { get_current_user, require_role } = require("../auth/middleware");
const { getCategoryById } = require("../category/service");
const { parseCreateInsightBody } = require("../schemas/insight");
const { isUuid } = require("../utils/validation");
const {
  createInsight,
  getApprovedInsights,
  getApprovedInsightById,
  getMyInsights,
} = require("./service");

function createInsightsRouter({ pool }) {
  const router = express.Router();

  // Create Insight (intern/mentor)
  router.post(
    "/",
    get_current_user,
    require_role(["intern", "mentor"]),
    async (req, res, next) => {
      try {
        const userId = req.user.user_id;
        const { title, content, link, category_id } = parseCreateInsightBody(req.body);
        if (!isUuid(category_id)) {
          const err = new Error("Invalid category");
          err.statusCode = 400;
          throw err;
        }

        const category = await getCategoryById(pool, category_id);
        if (!category) {
          const err = new Error("Invalid category");
          err.statusCode = 400;
          throw err;
        }

        const insight = await createInsight(pool, {
          userId,
          categoryId: category_id,
          title,
          content,
          link,
        });

        return res.status(201).json({
          message: "Insight submitted for approval",
          data: { insight },
        });
      } catch (e) {
        return next(e);
      }
    }
  );

  // Public: only approved insights
  router.get("/", async (_req, res, next) => {
    try {
      const rows = await getApprovedInsights(pool);
      return res.json(rows);
    } catch (e) {
      return next(e);
    }
  });

  // Auth: my insights (includes pending/rejected)
  router.get("/me", get_current_user, async (req, res, next) => {
    try {
      const rows = await getMyInsights(pool, req.user.user_id);
      return res.json(rows);
    } catch (e) {
      return next(e);
    }
  });

  // Public: approved only; otherwise 404 (as if it doesn't exist)
  router.get("/:id", async (req, res, next) => {
    try {
      const insight = await getApprovedInsightById(pool, req.params.id);
      if (!insight) {
        return res.status(404).json({ error: "Not found" });
      }
      return res.json(insight);
    } catch (e) {
      return next(e);
    }
  });

  return router;
}

module.exports = { createInsightsRouter };
