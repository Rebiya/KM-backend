const express = require("express");

const { initDb } = require("./db/init");
const { makePool } = require("./db/index");

const { createAuthRouter } = require("./auth/routes");
const { createCategoryRouter } = require("./category/routes");
const { createInsightsRouter } = require("./insights/routes");
const { createQuestionsRouter } = require("./questions/routes");
const { createAnswersRouter } = require("./answers/routes");
const { createVotesRouter } = require("./votes/routes");
const { createCoursesRouter } = require("./courses/routes");
const { createExitInterviewsRouter } = require("./exit-interviews/routes");
const { createSearchRouter } = require("./search/routes");
const { createPublicDataRouter } = require("./public-data/routes");
const { createAdminRouter } = require("./admin/routes");

async function createServer(options = {}) {
  const app = express();
  app.locals.db = {
    ready: false,
    initError: null,
  };

  // Minimal middleware
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    const { db } = app.locals;
    res.json({
      ok: true,
      db: db.ready ? "ready" : "unavailable",
      ...(db.initError ? { db_error: db.initError.message } : {}),
    });
  });

  // DB init at startup (CREATE TABLE IF NOT EXISTS).
  const pool = options.pool || makePool();
  app.locals.pool = pool;
  if (typeof pool.on === "function") {
    pool.on("error", (err) => {
      console.error("PostgreSQL pool error:", err.message);
      app.locals.db = {
        ready: false,
        initError: err,
      };
    });
  }

  if (options.skipInit) {
    app.locals.db = {
      ready: true,
      initError: null,
    };
  } else if (process.env.AUTO_CREATE_TABLES === "true") {
    try {
      await initDb(pool);
      app.locals.db = {
        ready: true,
        initError: null,
      };
    } catch (err) {
      console.error("Database initialization failed:", err.message);
      app.locals.db = {
        ready: false,
        initError: err,
      };
    }
  } else {
    app.locals.db = {
      ready: true,
      initError: null,
    };
  }

  app.use("/auth", createAuthRouter({ pool }));
  app.use("/category", createCategoryRouter({ pool }));
  app.use("/categories", createCategoryRouter({ pool }));
  app.use("/insights", createInsightsRouter({ pool }));
  app.use("/questions", createQuestionsRouter({ pool }));
  app.use("/answers", createAnswersRouter({ pool }));
  app.use("/votes", createVotesRouter({ pool }));
  app.use("/courses", createCoursesRouter({ pool }));
  app.use("/exit-interviews", createExitInterviewsRouter({ pool }));
  app.use("/search", createSearchRouter({ pool }));
  app.use("/", createPublicDataRouter({ pool }));
  app.use("/admin", createAdminRouter({ pool }));

  function getDefaultErrorMessage(status) {
    if (status === 400) return "The request is invalid. Please check the submitted data.";
    if (status === 401) return "Authentication is required to access this resource.";
    if (status === 403) return "You do not have permission to perform this action.";
    if (status === 404) return "The requested resource was not found.";
    if (status === 409) return "The request conflicts with existing data.";
    if (status === 503) return "The service is temporarily unavailable.";
    return "An unexpected server error occurred.";
  }

  // Simple error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err && ["EAI_AGAIN", "ECONNREFUSED", "ENOTFOUND"].includes(err.code)) {
      return res.status(503).json({
        status: 503,
        error: "Database unavailable",
        message: "The database connection is currently unavailable. Please try again shortly.",
        details: err.message,
      });
    }

    const status = err.statusCode || 500;
    const message = err.message || getDefaultErrorMessage(status);

    res.status(status).json({
      status,
      error: message,
      message,
    });
  });

  return app;
}

module.exports = { createServer };
