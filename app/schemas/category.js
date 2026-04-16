function parseCreateCategoryBody(body) {
  const name = body && body.name;

  if (typeof name !== "string" || !name.trim()) {
    const err = new Error("Category name is required.");
    err.statusCode = 400;
    throw err;
  }

  return {
    name: name.trim(),
  };
}

module.exports = { parseCreateCategoryBody };
