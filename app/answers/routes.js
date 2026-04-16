const express = require("express");

const { requireAuth } = require("../auth/middleware");
const { getQuestionById } = require("../questions/service");
const { isUuid, requireNonEmptyString } = require("../utils/validation");
const { createAnswer, getApprovedAnswersByQuestion } = require("./service");

function createAnswersRouter({ pool }) {
  const router = express.Router();

  router.post("/", requireAuth, async (req, res, next) => {
    try {
      const questionId = String((req.body && req.body.question_id) || "").trim();
      const content = requireNonEmptyString(req.body && req.body.content, "content");
      if (!isUuid(questionId)) {
        const err = new Error("Invalid question_id");
        err.statusCode = 400;
        throw err;
      }

      const question = await getQuestionById(pool, questionId);
      if (!question) {
        const err = new Error("Question not found");
        err.statusCode = 404;
        throw err;
      }
      if (question.status !== "approved") {
        const err = new Error("Question not approved");
        err.statusCode = 403;
        throw err;
      }

      await createAnswer(pool, {
        questionId,
        userId: req.user.user_id,
        content,
      });
      return res.status(201).json({ message: "Answer submitted for approval" });
    } catch (e) {
      return next(e);
    }
  });

  router.get("/", requireAuth, async (req, res, next) => {
    try {
      const questionId = String(req.query.question_id || "").trim();
      if (!isUuid(questionId)) {
        const err = new Error("Invalid question_id");
        err.statusCode = 400;
        throw err;
      }
      const rows = await getApprovedAnswersByQuestion(pool, questionId);
      return res.json(rows);
    } catch (e) {
      return next(e);
    }
  });

  return router;
}

module.exports = { createAnswersRouter };

