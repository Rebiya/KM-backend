const { Pool } = require("pg");
const { config } = require("../core/config");

function resolveSslConfig(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    const isLocalHost =
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1";

    if (isLocalHost) {
      return false;
    }

    return { rejectUnauthorized: false };
  } catch (_err) {
    return false;
  }
}

function makePool() {
  return new Pool({
    connectionString: config.DATABASE_URL,
    ssl: resolveSslConfig(config.DATABASE_URL),
    max: 10,
  });
}

module.exports = { makePool };
