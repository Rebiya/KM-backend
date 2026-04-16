const express = require("express");

const { parseCreateCategoryBody } = require("../schemas/category");
const { createCategory, getCategories } = require("./service");

function createCategoryRouter({ pool }) {
  const router = express.Router();

  router.get("/", async (_req, res, next) => {
    try {
      const rows = await getCategories(pool);
      return res.json(rows);
    } catch (e) {
      return next(e);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const { name } = parseCreateCategoryBody(req.body);
      const category = await createCategory(pool, { name });
      return res.status(201).json(category);
    } catch (e) {
      if (e && e.code === "23505") {
        const err = new Error("A category with this name already exists.");
        err.statusCode = 409;
        return next(err);
      }

      return next(e);
    }
  });

  return router;
}

module.exports = { createCategoryRouter };
