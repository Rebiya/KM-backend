const jwt = require("jsonwebtoken");
const { config } = require("./config");

function create_access_token(data) {
  const userId = data.user_id;
  const role = data.role;
  if (!userId || !role) {
    throw new Error("create_access_token requires { user_id, role }");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = {
    sub: String(userId),
    role,
    iat: nowSeconds,
  };

  return jwt.sign(payload, config.JWT_SECRET, {
    algorithm: config.JWT_ALGORITHM,
    expiresIn: `${config.JWT_EXPIRE_MINUTES}m`,
  });
}

function verify_token(token) {
  return jwt.verify(token, config.JWT_SECRET, {
    algorithms: [config.JWT_ALGORITHM],
  });
}

module.exports = {
  create_access_token,
  verify_token,
};

