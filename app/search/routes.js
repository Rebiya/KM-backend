const express = require("express");

const { requireAuth } = require("../auth/middleware");
const { requireNonEmptyString } = require("../utils/validation");

function createSearchRouter({ pool }) {
  const router = express.Router();

  router.get("/", requireAuth, async (req, res, next) => {
    try {
      const q = requireNonEmptyString(req.query.q, "q");
      const pattern = `%${q}%`;

      const insights = await pool.query(
        `SELECT id, 'insight' AS type, title, created_at
         FROM insights
         WHERE status = 'approved'
           AND (title ILIKE $1 OR COALESCE(content, '') ILIKE $1)
         ORDER BY created_at DESC
         LIMIT 10`,
        [pattern]
      );

      const questions = await pool.query(
        `SELECT id, 'question' AS type, title, created_at
         FROM questions
         WHERE status = 'approved'
           AND (title ILIKE $1 OR content ILIKE $1)
         ORDER BY created_at DESC
         LIMIT 10`,
        [pattern]
      );

      return res.json([...insights.rows, ...questions.rows]);
    } catch (e) {
      return next(e);
    }
  });

  return router;
}

module.exports = { createSearchRouter };

