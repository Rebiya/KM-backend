const express = require("express");

const { requireAuth } = require("../auth/middleware");
const { getCategoryById } = require("../category/service");
const { isUuid, requireNonEmptyString } = require("../utils/validation");
const { createExitInterview, getExitInterviews } = require("./service");

function createExitInterviewsRouter({ pool }) {
  const router = express.Router();

  router.post("/", requireAuth, async (req, res, next) => {
    try {
      const userName = requireNonEmptyString(req.body && req.body.user_name, "user_name");
      const youtubeLink = requireNonEmptyString(req.body && req.body.youtube_link, "youtube_link");
      const categoryId = String((req.body && req.body.category_id) || "").trim();
      if (!isUuid(categoryId)) {
        const err = new Error("Invalid category");
        err.statusCode = 400;
        throw err;
      }
      const category = await getCategoryById(pool, categoryId);
      if (!category) {
        const err = new Error("Invalid category");
        err.statusCode = 400;
        throw err;
      }

      const created = await createExitInterview(pool, { userName, categoryId, youtubeLink });
      return res.status(201).json(created);
    } catch (e) {
      return next(e);
    }
  });

  router.get("/", requireAuth, async (_req, res, next) => {
    try {
      const rows = await getExitInterviews(pool);
      return res.json(rows);
    } catch (e) {
      return next(e);
    }
  });

  return router;
}

module.exports = { createExitInterviewsRouter };

