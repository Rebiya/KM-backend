const express = require("express");
const bcrypt = require("bcrypt");

const { create_access_token } = require("../core/security");
const { parseLoginBody, parseRegisterBody } = require("../schemas/user");
const { get_current_user } = require("./middleware");

function createAuthRouter({ pool }) {
  const router = express.Router();

  router.post("/register", async (req, res, next) => {
    try {
      const { name, email, password, role } = parseRegisterBody(req.body);
      const passwordHash = await bcrypt.hash(password, 10);

      const result = await pool.query(
        `INSERT INTO users (name, email, role, password_hash, points)
         VALUES ($1, $2, $3, $4, 0)
         RETURNING id, name, email, role, points`,
        [name, email, role, passwordHash]
      );

      const user = result.rows[0];
      const token = create_access_token({ user_id: user.id, role: user.role });

      return res.status(201).json({
        user,
        access_token: token,
        token_type: "bearer",
      });
    } catch (e) {
      if (e && e.code === "23505") {
        const err = new Error("An account with this email already exists.");
        err.statusCode = 409;
        return next(err);
      }

      return next(e);
    }
  });

  router.post("/login", async (req, res, next) => {
    try {
      const { email, password } = parseLoginBody(req.body);

      const result = await pool.query(
        `SELECT id, email, role, password_hash
         FROM users
         WHERE email = $1`,
        [email]
      );

      if (result.rowCount === 0) {
        const err = new Error("Invalid email or password");
        err.statusCode = 401;
        throw err;
      }

      const user = result.rows[0];
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        const err = new Error("Invalid email or password");
        err.statusCode = 401;
        throw err;
      }

      const token = create_access_token({ user_id: user.id, role: user.role });

      return res.json({
        access_token: token,
        token_type: "bearer",
      });
    } catch (e) {
      return next(e);
    }
  });

  // Optional helper endpoint for the client; not required by spec.
  router.get("/me", get_current_user, async (req, res, next) => {
    try {
      const userId = req.user.user_id;
      const result = await pool.query(
        `SELECT id, name, email, role, points FROM users WHERE id = $1`,
        [userId]
      );
      if (result.rowCount === 0) {
        const err = new Error("User not found");
        err.statusCode = 404;
        throw err;
      }
      return res.json(result.rows[0]);
    } catch (e) {
      return next(e);
    }
  });

  return router;
}

module.exports = { createAuthRouter };
