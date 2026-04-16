const express = require("express");

const { requireAuth } = require("../auth/middleware");
const { getCategoryById } = require("../category/service");
const { createCourse, getCourses } = require("./service");
const { isUuid, requireNonEmptyString } = require("../utils/validation");

function createCoursesRouter({ pool }) {
  const router = express.Router();

  router.post("/", requireAuth, async (req, res, next) => {
    try {
      const name = requireNonEmptyString(req.body && req.body.name, "name");
      const link = requireNonEmptyString(req.body && req.body.link, "link");
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

      const course = await createCourse(pool, { name, categoryId, link });
      return res.status(201).json(course);
    } catch (e) {
      return next(e);
    }
  });

  router.get("/", requireAuth, async (req, res, next) => {
    try {
      const categoryId = req.query.category_id ? String(req.query.category_id).trim() : "";
      if (categoryId && !isUuid(categoryId)) {
        const err = new Error("Invalid category_id");
        err.statusCode = 400;
        throw err;
      }
      const rows = await getCourses(pool, { categoryId: categoryId || null });
      return res.json(rows);
    } catch (e) {
      return next(e);
    }
  });

  return router;
}

module.exports = { createCoursesRouter };

