const express = require("express");

function createPublicDataRouter({ pool }) {
  const router = express.Router();

  // Public: all users
  router.get("/users", async (_req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT id, name, email, role, points, created_at
         FROM users
         ORDER BY created_at DESC`,
      );
      return res.json(result.rows);
    } catch (e) {
      return next(e);
    }
  });

  // Public: all categories
  router.get("/categories", async (_req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT id, name
         FROM category
         ORDER BY name ASC`,
      );
      return res.json(result.rows);
    } catch (e) {
      return next(e);
    }
  });

  // Public: all answers
  router.get("/answers", async (_req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT a.id, a.question_id, a.user_id, u.name AS author, a.content, a.status, a.approved_by, a.created_at
         FROM answers a
         JOIN users u ON u.id = a.user_id
         ORDER BY a.created_at DESC`,
      );
      return res.json(result.rows);
    } catch (e) {
      return next(e);
    }
  });

  // Public: single category by name
  router.get("/categories/:name", async (req, res, next) => {
    try {
      const { name } = req.params;
      const result = await pool.query(
        `SELECT id, name FROM category WHERE name = $1`,
        [name],
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Category not found" });
      }
      return res.json(result.rows[0]);
    } catch (e) {
      return next(e);
    }
  });

  return router;
}

module.exports = { createPublicDataRouter };
