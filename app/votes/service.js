async function createVote(pool, { userId, insightId, answerId, value }) {
  const result = await pool.query(
    `INSERT INTO votes (user_id, insight_id, answer_id, value)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, insight_id, answer_id, value, created_at`,
    [userId, insightId, answerId, value]
  );
  return result.rows[0];
}

async function getApprovedInsightForVote(pool, insightId) {
  const result = await pool.query(
    `SELECT id, user_id
     FROM insights
     WHERE id = $1
       AND status = 'approved'`,
    [insightId]
  );
  return result.rows[0] || null;
}

async function getApprovedAnswerForVote(pool, answerId) {
  const result = await pool.query(
    `SELECT id, user_id
     FROM answers
     WHERE id = $1
       AND status = 'approved'`,
    [answerId]
  );
  return result.rows[0] || null;
}

async function applyVotePoints(pool, { authorUserId, value }) {
  await pool.query(
    `UPDATE users
     SET points = points + $2
     WHERE id = $1`,
    [authorUserId, value]
  );
}

module.exports = {
  createVote,
  getApprovedInsightForVote,
  getApprovedAnswerForVote,
  applyVotePoints,
};

