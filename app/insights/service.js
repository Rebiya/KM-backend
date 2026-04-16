async function createInsight(pool, { userId, categoryId, title, content, link }) {
  const result = await pool.query(
    `INSERT INTO insights (user_id, category_id, title, content, link, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING id, user_id, category_id, title, content, link, status, created_at, approved_by`,
    [userId, categoryId, title, content, link]
  );
  return result.rows[0];
}

async function getApprovedInsights(pool) {
  const result = await pool.query(
    `SELECT i.id, i.title, i.content, i.link, c.name AS category, u.name AS author, i.created_at
     FROM insights i
     LEFT JOIN category c ON c.id = i.category_id
     JOIN users u ON u.id = i.user_id
     WHERE status = 'approved'
     ORDER BY i.created_at DESC`
  );
  return result.rows;
}

async function getApprovedInsightById(pool, insightId) {
  const result = await pool.query(
    `SELECT id, user_id, title, content, link, status, created_at, approved_by
     FROM insights
     WHERE id = $1 AND status = 'approved'`,
    [insightId]
  );
  return result.rows[0] || null;
}

async function getMyInsights(pool, userId) {
  const result = await pool.query(
    `SELECT id, user_id, category_id, title, content, link, status, created_at, approved_by
     FROM insights
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

module.exports = {
  createInsight,
  getApprovedInsights,
  getApprovedInsightById,
  getMyInsights,
};
