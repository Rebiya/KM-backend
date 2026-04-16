async function createQuestion(pool, { userId, categoryId, title, content, type }) {
  const result = await pool.query(
    `INSERT INTO questions (user_id, category_id, title, content, type, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING id, user_id, category_id, title, content, type, status, approved_by, created_at`,
    [userId, categoryId, title, content, type]
  );
  return result.rows[0];
}

async function getApprovedQuestions(pool) {
  const result = await pool.query(
    `SELECT q.id, q.title, q.content, q.type, c.name AS category, u.name AS author, q.created_at
     FROM questions q
     LEFT JOIN category c ON c.id = q.category_id
     JOIN users u ON u.id = q.user_id
     WHERE q.status = 'approved'
     ORDER BY q.created_at DESC`
  );
  return result.rows;
}

async function getQuestionById(pool, questionId) {
  const result = await pool.query(
    `SELECT id, status
     FROM questions
     WHERE id = $1`,
    [questionId]
  );
  return result.rows[0] || null;
}

module.exports = {
  createQuestion,
  getApprovedQuestions,
  getQuestionById,
};

