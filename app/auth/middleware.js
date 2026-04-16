const { verify_token } = require("../core/security");

function get_current_user(req, _res, next) {
  try {
    const authHeader = req.header("authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      const err = new Error("Authentication required. Provide a valid Bearer token.");
      err.statusCode = 401;
      throw err;
    }

    const token = match[1];
    const payload = verify_token(token);

    // Token payload:
    // - sub: user_id
    // - role: role
    req.user = {
      user_id: payload.sub,
      role: payload.role,
    };

    return next();
  } catch (e) {
    const err = e instanceof Error ? e : new Error("Unauthorized");
    err.statusCode = err.statusCode || 401;
    return next(err);
  }
}

function require_role(requiredRole) {
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

  return function roleGuard(req, _res, next) {
    const userRole = req.user && req.user.role;
    if (!userRole || !roles.includes(userRole)) {
      const err = new Error("You do not have permission to perform this action.");
      err.statusCode = 403;
      return next(err);
    }
    return next();
  };
}

const requireAuth = get_current_user;
const requireAdmin = require_role("admin");

module.exports = { get_current_user, require_role, requireAuth, requireAdmin };
