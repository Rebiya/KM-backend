async function createExitInterview(pool, { userName, categoryId, youtubeLink }) {
  const result = await pool.query(
    `INSERT INTO exit_interviews (user_name, category_id, youtube_link)
     VALUES ($1, $2, $3)
     RETURNING id, user_name, category_id, youtube_link, created_at`,
    [userName, categoryId, youtubeLink]
  );
  return result.rows[0];
}

async function getExitInterviews(pool) {
  const result = await pool.query(
    `SELECT e.id, e.user_name, e.youtube_link, c.name AS category, e.created_at
     FROM exit_interviews e
     LEFT JOIN category c ON c.id = e.category_id
     ORDER BY e.created_at DESC`
  );
  return result.rows;
}

module.exports = {
  createExitInterview,
  getExitInterviews,
};

