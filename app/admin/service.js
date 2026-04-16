async function approveInsight(pool, { adminId, insightId }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const selected = await client.query(
      `SELECT id, user_id, status
       FROM insights
       WHERE id = $1
       FOR UPDATE`,
      [insightId]
    );

    if (selected.rowCount === 0) {
      const err = new Error("Insight not found");
      err.statusCode = 404;
      throw err;
    }

    const insight = selected.rows[0];

    // Idempotency guard: do not award points twice.
    const shouldAward = insight.status !== "approved";

    await client.query(
      `UPDATE insights
       SET status = 'approved',
           approved_by = $2
       WHERE id = $1`,
      [insightId, adminId]
    );

    if (shouldAward) {
      await client.query(
        `UPDATE users
         SET points = points + 10
         WHERE id = $1`,
        [insight.user_id]
      );
    }

    const result = await client.query(
      `SELECT id, user_id, title, content, link, status, approved_by, created_at
       FROM insights
       WHERE id = $1`,
      [insightId]
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function rejectInsight(pool, { adminId, insightId }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const selected = await client.query(
      `SELECT id
       FROM insights
       WHERE id = $1
       FOR UPDATE`,
      [insightId]
    );

    if (selected.rowCount === 0) {
      const err = new Error("Insight not found");
      err.statusCode = 404;
      throw err;
    }

    // Per spec: rejection does not award points.
    await client.query(
      `UPDATE insights
       SET status = 'rejected',
           approved_by = $2
       WHERE id = $1`,
      [insightId, adminId]
    );

    const result = await client.query(
      `SELECT id, user_id, title, content, link, status, approved_by, created_at
       FROM insights
       WHERE id = $1`,
      [insightId]
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

const TYPE_CONFIG = {
  insight: { table: "insights", points: 10 },
  question: { table: "questions", points: 0 },
  answer: { table: "answers", points: 5 },
};

function getTypeConfig(type) {
  const config = TYPE_CONFIG[type];
  if (!config) {
    const err = new Error("Invalid type");
    err.statusCode = 400;
    throw err;
  }
  return config;
}

async function approveByType(pool, { adminId, type, id }) {
  const client = await pool.connect();
  try {
    const { table, points } = getTypeConfig(type);
    await client.query("BEGIN");
    const selected = await client.query(
      `SELECT id, user_id, status
       FROM ${table}
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );
    if (selected.rowCount === 0) {
      const err = new Error("Item not found");
      err.statusCode = 404;
      throw err;
    }
    const row = selected.rows[0];
    const shouldAward = points > 0 && row.status !== "approved";

    await client.query(
      `UPDATE ${table}
       SET status = 'approved', approved_by = $2
       WHERE id = $1`,
      [id, adminId]
    );
    if (shouldAward) {
      await client.query(
        `UPDATE users
         SET points = points + $2
         WHERE id = $1`,
        [row.user_id, points]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function rejectByType(pool, { adminId, type, id }) {
  const client = await pool.connect();
  try {
    const { table } = getTypeConfig(type);
    await client.query("BEGIN");
    const selected = await client.query(
      `SELECT id
       FROM ${table}
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );
    if (selected.rowCount === 0) {
      const err = new Error("Item not found");
      err.statusCode = 404;
      throw err;
    }
    await client.query(
      `UPDATE ${table}
       SET status = 'rejected', approved_by = $2
       WHERE id = $1`,
      [id, adminId]
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { approveInsight, rejectInsight, approveByType, rejectByType };
