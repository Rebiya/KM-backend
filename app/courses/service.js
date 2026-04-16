async function createCourse(pool, { name, categoryId, link }) {
  const result = await pool.query(
    `INSERT INTO courses (name, category_id, link)
     VALUES ($1, $2, $3)
     RETURNING id, name, category_id, link`,
    [name, categoryId, link]
  );
  return result.rows[0];
}

async function getCourses(pool, { categoryId }) {
  const params = [];
  let whereSql = "";
  if (categoryId) {
    params.push(categoryId);
    whereSql = `WHERE c.category_id = $${params.length}`;
  }
  const result = await pool.query(
    `SELECT c.id, c.name, c.link, ct.name AS category
     FROM courses c
     LEFT JOIN category ct ON ct.id = c.category_id
     ${whereSql}
     ORDER BY c.name ASC`,
    params
  );
  return result.rows;
}

module.exports = {
  createCourse,
  getCourses,
};

