async function createCategory(pool, { name }) {
  const result = await pool.query(
    `INSERT INTO category (name)
     VALUES ($1)
     RETURNING id, name`,
    [name]
  );

  return result.rows[0];
}

async function getCategories(pool) {
  const result = await pool.query(
    `SELECT id, name
     FROM category
     ORDER BY name ASC`
  );

  return result.rows;
}

async function getCategoryById(pool, categoryId) {
  const result = await pool.query(
    `SELECT id, name
     FROM category
     WHERE id = $1`,
    [categoryId]
  );

  return result.rows[0] || null;
}

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
};
