const dotenv = require("dotenv");

dotenv.config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const config = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 3000,
  DATABASE_URL: requireEnv("DATABASE_URL"),
  JWT_SECRET: requireEnv("JWT_SECRET"),
  JWT_ALGORITHM: process.env.JWT_ALGORITHM || "HS256",
  JWT_EXPIRE_MINUTES: process.env.JWT_EXPIRE_MINUTES ? Number(process.env.JWT_EXPIRE_MINUTES) : 60,
  AUTO_CREATE_TABLES: process.env.AUTO_CREATE_TABLES === "true",
  SEED_DEMO: process.env.SEED_DEMO === "true",
};

module.exports = { config };

