const bcrypt = require("bcrypt");

const { makePool } = require("./db");
const { initDb } = require("./db/init");
const { config } = require("./core/config");

async function seedUser({ pool, name, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (name, email, role, password_hash, points)
     VALUES ($1, $2, $3, $4, 0)
     ON CONFLICT (email) DO NOTHING`,
    [name, email, role, passwordHash]
  );
}

async function main() {
  if (!config.SEED_DEMO) return;

  const pool = makePool();
  await initDb(pool);

  // Demo accounts (only inserted if missing by email).
  await seedUser({
    pool,
    name: process.env.SEED_ADMIN_NAME,
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
    role: "admin",
  });
  await seedUser({
    pool,
    name: process.env.SEED_MENTOR_NAME,
    email: process.env.SEED_MENTOR_EMAIL,
    password: process.env.SEED_MENTOR_PASSWORD,
    role: "mentor",
  });
  await seedUser({
    pool,
    name: process.env.SEED_INTERN_NAME,
    email: process.env.SEED_INTERN_EMAIL,
    password: process.env.SEED_INTERN_PASSWORD,
    role: "intern",
  });

  await pool.end();
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

