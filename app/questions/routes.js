const express = require("express");

const { requireAuth } = require("../auth/middleware");
const { getCategoryById } = require("../category/service");
const { isUuid, requireNonEmptyString } = require("../utils/validation");
const { createQuestion, getApprovedQuestions } = require("./service");

function createQuestionsRouter({ pool }) {
  const router = express.Router();

  router.post("/", requireAuth, async (req, res, next) => {
    try {
      const title = requireNonEmptyString(req.body && req.body.title, "title");
      const content = requireNonEmptyString(req.body && req.body.content, "content");
      const categoryId = String((req.body && req.body.category_id) || "").trim();
      const type = String((req.body && req.body.type) || "")
        .trim()
        .toLowerCase();

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
      if (!["general", "bug"].includes(type)) {
        const err = new Error("Invalid type");
        err.statusCode = 400;
        throw err;
      }

      await createQuestion(pool, {
        userId: req.user.user_id,
        categoryId,
        title,
        content,
        type,
      });

      return res.status(201).json({ message: "Question submitted for approval" });
    } catch (e) {
      return next(e);
    }
  });

  router.get("/", requireAuth, async (_req, res, next) => {
    try {
      const rows = await getApprovedQuestions(pool);
      return res.json(rows);
    } catch (e) {
      return next(e);
    }
  });

  return router;
}

module.exports = { createQuestionsRouter };

