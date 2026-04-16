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

async function getAllUsersCategoriesAnswers(pool) {
  const [usersResult, categoriesResult, answersResult] = await Promise.all([
    pool.query(
      `SELECT id, name, email, role, points, created_at
       FROM users
       ORDER BY created_at DESC`
    ),
    pool.query(
      `SELECT id, name
       FROM category
       ORDER BY name ASC`
    ),
    pool.query(
      `SELECT a.id, a.question_id, a.user_id, u.name AS author, a.content, a.status, a.approved_by, a.created_at
       FROM answers a
       JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC`
    ),
  ]);

  return {
    users: usersResult.rows,
    categories: categoriesResult.rows,
    answers: answersResult.rows,
  };
}

async function getAllInsights(pool) {
  const result = await pool.query(
    `SELECT i.id,
            i.user_id,
            u.name AS author,
            i.category_id,
            c.name AS category,
            i.title,
            i.content,
            i.link,
            i.status,
            i.approved_by,
            i.created_at
     FROM insights i
     JOIN users u ON u.id = i.user_id
     LEFT JOIN category c ON c.id = i.category_id
     ORDER BY i.created_at DESC`
  );
  return result.rows;
}

async function getAllQuestions(pool) {
  const result = await pool.query(
    `SELECT q.id,
            q.user_id,
            u.name AS author,
            q.category_id,
            c.name AS category,
            q.title,
            q.content,
            q.type,
            q.status,
            q.approved_by,
            q.created_at
     FROM questions q
     JOIN users u ON u.id = q.user_id
     LEFT JOIN category c ON c.id = q.category_id
     ORDER BY q.created_at DESC`
  );
  return result.rows;
}

module.exports = {
  approveInsight,
  rejectInsight,
  approveByType,
  rejectByType,
  getAllUsersCategoriesAnswers,
  getAllInsights,
  getAllQuestions,
};
