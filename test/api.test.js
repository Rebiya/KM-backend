const test = require("node:test");
const assert = require("node:assert/strict");

const { makePool } = require("../app/db");
const { initDb } = require("../app/db/init");
const { createServer } = require("../app/server");

test("health endpoint reports service status", async () => {
  const pool = makePool();
  await initDb(pool);
  const app = await createServer({ pool, skipInit: true });
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
    s.on("error", reject);
  });

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
  } finally {
    await pool.end();
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});
