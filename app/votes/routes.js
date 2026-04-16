const express = require("express");

const { requireAuth } = require("../auth/middleware");
const { isUuid } = require("../utils/validation");
const {
  createVote,
  getApprovedInsightForVote,
  getApprovedAnswerForVote,
  applyVotePoints,
} = require("./service");

function createVotesRouter({ pool }) {
  const router = express.Router();

  router.post("/", requireAuth, async (req, res, next) => {
    const client = await pool.connect();
    try {
      const insightId = req.body && req.body.insight_id ? String(req.body.insight_id).trim() : null;
      const answerId = req.body && req.body.answer_id ? String(req.body.answer_id).trim() : null;
      const value = Number(req.body && req.body.value);
      const hasInsight = Boolean(insightId);
      const hasAnswer = Boolean(answerId);
      if (hasInsight && hasAnswer) {
        const err = new Error("Only one target allowed");
        err.statusCode = 400;
        throw err;
      }
      if (!hasInsight && !hasAnswer) {
        const err = new Error("Either insight_id or answer_id is required");
        err.statusCode = 400;
        throw err;
      }
      if (![1, -1].includes(value)) {
        const err = new Error("value must be 1 or -1");
        err.statusCode = 400;
        throw err;
      }
      if (insightId && !isUuid(insightId)) {
        const err = new Error("Invalid insight_id");
        err.statusCode = 400;
        throw err;
      }
      if (answerId && !isUuid(answerId)) {
        const err = new Error("Invalid answer_id");
        err.statusCode = 400;
        throw err;
      }

      await client.query("BEGIN");
      let authorUserId;
      if (insightId) {
        const insight = await getApprovedInsightForVote(client, insightId);
        if (!insight) {
          const err = new Error("Content not approved");
          err.statusCode = 403;
          throw err;
        }
        authorUserId = insight.user_id;
      } else {
        const answer = await getApprovedAnswerForVote(client, answerId);
        if (!answer) {
          const err = new Error("Content not approved");
          err.statusCode = 403;
          throw err;
        }
        authorUserId = answer.user_id;
      }

      await createVote(client, {
        userId: req.user.user_id,
        insightId,
        answerId,
        value,
      });
      await applyVotePoints(client, { authorUserId, value });
      await client.query("COMMIT");

      return res.status(201).json({ message: "Vote recorded" });
    } catch (e) {
      await client.query("ROLLBACK");
      if (e && e.code === "23505") {
        const err = new Error("Duplicate vote not allowed");
        err.statusCode = 409;
        return next(err);
      }
      return next(e);
    } finally {
      client.release();
    }
  });

  return router;
}

module.exports = { createVotesRouter };

