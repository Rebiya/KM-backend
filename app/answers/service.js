async function createAnswer(pool, { questionId, userId, content }) {
  const result = await pool.query(
    `INSERT INTO answers (question_id, user_id, content, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING id, question_id, user_id, content, status, approved_by, created_at`,
    [questionId, userId, content]
  );
  return result.rows[0];
}

async function getApprovedAnswersByQuestion(pool, questionId) {
  const result = await pool.query(
    `SELECT a.id, a.content, u.name AS author, a.created_at
     FROM answers a
     JOIN users u ON u.id = a.user_id
     WHERE a.question_id = $1
       AND a.status = 'approved'
     ORDER BY a.created_at ASC`,
    [questionId]
  );
  return result.rows;
}

module.exports = {
  createAnswer,
  getApprovedAnswersByQuestion,
};

