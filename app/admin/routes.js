const express = require("express");

const { get_current_user, require_role } = require("../auth/middleware");
const { approveInsight, rejectInsight, approveByType, rejectByType } = require("./service");
const { isUuid } = require("../utils/validation");

function createAdminRouter({ pool }) {
  const router = express.Router();

  router.post(
    "/approve/:type/:id",
    get_current_user,
    require_role("admin"),
    async (req, res, next) => {
      try {
        const id = String(req.params.id || "").trim();
        if (!isUuid(id)) {
          const err = new Error("Invalid id");
          err.statusCode = 400;
          throw err;
        }
        await approveByType(pool, {
          adminId: req.user.user_id,
          type: String(req.params.type || "").trim().toLowerCase(),
          id,
        });
        return res.json({ message: "Approved" });
      } catch (e) {
        return next(e);
      }
    }
  );

  router.post(
    "/reject/:type/:id",
    get_current_user,
    require_role("admin"),
    async (req, res, next) => {
      try {
        const id = String(req.params.id || "").trim();
        if (!isUuid(id)) {
          const err = new Error("Invalid id");
          err.statusCode = 400;
          throw err;
        }
        await rejectByType(pool, {
          adminId: req.user.user_id,
          type: String(req.params.type || "").trim().toLowerCase(),
          id,
        });
        return res.json({ message: "Rejected" });
      } catch (e) {
        return next(e);
      }
    }
  );

  router.post(
    "/insights/:id/approve",
    get_current_user,
    require_role("admin"),
    async (req, res, next) => {
      try {
        const adminId = req.user.user_id;
        const insightId = req.params.id;

        const updated = await approveInsight(pool, { adminId, insightId });
        return res.json(updated);
      } catch (e) {
        return next(e);
      }
    }
  );

  router.post(
    "/insights/:id/reject",
    get_current_user,
    require_role("admin"),
    async (req, res, next) => {
      try {
        const adminId = req.user.user_id;
        const insightId = req.params.id;

        const updated = await rejectInsight(pool, { adminId, insightId });
        return res.json(updated);
      } catch (e) {
        return next(e);
      }
    }
  );

  return router;
}

module.exports = { createAdminRouter };

