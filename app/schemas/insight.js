function parseCreateInsightBody(body) {
  const title = body && body.title;
  const content = body ? body.content : undefined;
  const link = body ? body.link : undefined;
  const categoryId = body ? body.category_id : undefined;

  if (typeof title !== "string" || !title.trim()) {
    const err = new Error("title is required");
    err.statusCode = 400;
    throw err;
  }

  const normalizedContent = typeof content === "string" ? content.trim() : "";
  const normalizedLink = typeof link === "string" ? link.trim() : "";
  if (!normalizedContent && !normalizedLink) {
    const err = new Error("Either content or link must be provided");
    err.statusCode = 400;
    throw err;
  }

  return {
    title: title.trim(),
    content: normalizedContent || null,
    link: normalizedLink || null,
    category_id: typeof categoryId === "string" ? categoryId.trim() : "",
  };
}

module.exports = { parseCreateInsightBody };
