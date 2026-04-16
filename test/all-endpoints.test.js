const test = require("node:test");
const assert = require("node:assert/strict");

const { makePool } = require("../app/db");
const { initDb } = require("../app/db/init");
const { createServer } = require("../app/server");

let pool;
let app;
let server;
let baseUrl;

const cleanup = {
  users: [],
  categories: [],
  insights: [],
  questions: [],
  answers: [],
  courses: [],
  exits: [],
};

async function request(path, options = {}) {
  const { headers, ...rest } = options;
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      ...(rest.body ? { "content-type": "application/json" } : {}),
      ...(headers || {}),
    },
    ...rest,
  });
  const text = await response.text();
  return { response, body: text ? JSON.parse(text) : null };
}

test.before(async () => {
  pool = makePool();
  await initDb(pool);
  app = await createServer({ pool, skipInit: true });
  server = await new Promise((resolve, reject) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
    s.on("error", reject);
  });
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  if (pool) {
    if (cleanup.answers.length) {
      await pool.query("DELETE FROM answers WHERE id = ANY($1::uuid[])", [cleanup.answers]);
    }
    if (cleanup.questions.length) {
      await pool.query("DELETE FROM questions WHERE id = ANY($1::uuid[])", [cleanup.questions]);
    }
    if (cleanup.insights.length) {
      await pool.query("DELETE FROM insights WHERE id = ANY($1::uuid[])", [cleanup.insights]);
    }
    if (cleanup.courses.length) {
      await pool.query("DELETE FROM courses WHERE id = ANY($1::uuid[])", [cleanup.courses]);
    }
    if (cleanup.exits.length) {
      await pool.query("DELETE FROM exit_interviews WHERE id = ANY($1::uuid[])", [cleanup.exits]);
    }
    if (cleanup.categories.length) {
      await pool.query("DELETE FROM category WHERE id = ANY($1::uuid[])", [cleanup.categories]);
    }
    if (cleanup.users.length) {
      await pool.query("DELETE FROM users WHERE email = ANY($1::text[])", [cleanup.users]);
    }
    await pool.end();
  }
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});

test("covers all endpoints end-to-end", async () => {
  const stamp = Date.now();
  const adminEmail = `admin-${stamp}@example.com`;
  const mentorEmail = `mentor-${stamp}@example.com`;
  const internEmail = `intern-${stamp}@example.com`;
  cleanup.users.push(adminEmail, mentorEmail, internEmail);

  const registerAdmin = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Admin",
      email: adminEmail,
      password: "pass123",
      role: "admin",
    }),
  });
  assert.equal(registerAdmin.response.status, 201);

  const registerMentor = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Mentor",
      email: mentorEmail,
      password: "pass123",
      role: "mentor",
    }),
  });
  assert.equal(registerMentor.response.status, 201);

  const registerIntern = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "Intern",
      email: internEmail,
      password: "pass123",
      role: "intern",
    }),
  });
  assert.equal(registerIntern.response.status, 201);

  const adminLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: adminEmail, password: "pass123" }),
  });
  const mentorLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: mentorEmail, password: "pass123" }),
  });
  const internLogin = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: internEmail, password: "pass123" }),
  });
  assert.equal(adminLogin.response.status, 200);
  assert.equal(mentorLogin.response.status, 200);
  assert.equal(internLogin.response.status, 200);

  const adminAuth = { authorization: `Bearer ${adminLogin.body.access_token}` };
  const mentorAuth = { authorization: `Bearer ${mentorLogin.body.access_token}` };
  const internAuth = { authorization: `Bearer ${internLogin.body.access_token}` };

  const createdCategory = await request("/category", {
    method: "POST",
    body: JSON.stringify({ name: `Test Category ${stamp}` }),
  });
  assert.equal(createdCategory.response.status, 201);
  cleanup.categories.push(createdCategory.body.id);
  const categoryId = createdCategory.body.id;

  const listCategory = await request("/category");
  assert.equal(listCategory.response.status, 200);

  const invalidInsight = await request("/insights", {
    method: "POST",
    headers: internAuth,
    body: JSON.stringify({ title: "bad", category_id: categoryId }),
  });
  assert.equal(invalidInsight.response.status, 400);

  const insightCreate = await request("/insights", {
    method: "POST",
    headers: internAuth,
    body: JSON.stringify({
      title: `Insight ${stamp}`,
      content: "Insight content",
      category_id: categoryId,
    }),
  });
  assert.equal(insightCreate.response.status, 201);
  assert.equal(insightCreate.body.message, "Insight submitted for approval");
  const insightId = insightCreate.body.data.insight.id;
  cleanup.insights.push(insightId);

  const pendingPublic = await request("/insights");
  assert.equal(pendingPublic.response.status, 200);
  assert.equal(Array.isArray(pendingPublic.body), true);

  const insightApproveForbidden = await request(`/admin/approve/insight/${insightId}`, {
    method: "POST",
    headers: mentorAuth,
  });
  assert.equal(insightApproveForbidden.response.status, 403);

  const insightApproved = await request(`/admin/approve/insight/${insightId}`, {
    method: "POST",
    headers: adminAuth,
  });
  assert.equal(insightApproved.response.status, 200);

  const publicInsights = await request("/insights");
  assert.equal(publicInsights.response.status, 200);
  assert.equal(publicInsights.body.some((r) => r.id === insightId), true);

  const questionCreate = await request("/questions", {
    method: "POST",
    headers: mentorAuth,
    body: JSON.stringify({
      title: `Question ${stamp}`,
      content: "Need help",
      category_id: categoryId,
      type: "general",
    }),
  });
  assert.equal(questionCreate.response.status, 201);

  const dbQuestion = await pool.query(
    `SELECT id FROM questions WHERE title = $1 ORDER BY created_at DESC LIMIT 1`,
    [`Question ${stamp}`]
  );
  const questionId = dbQuestion.rows[0].id;
  cleanup.questions.push(questionId);

  const questionApprove = await request(`/admin/approve/question/${questionId}`, {
    method: "POST",
    headers: adminAuth,
  });
  assert.equal(questionApprove.response.status, 200);

  const questionsList = await request("/questions", { headers: internAuth });
  assert.equal(questionsList.response.status, 200);

  const answerCreate = await request("/answers", {
    method: "POST",
    headers: internAuth,
    body: JSON.stringify({ question_id: questionId, content: "Try this fix" }),
  });
  assert.equal(answerCreate.response.status, 201);

  const dbAnswer = await pool.query(
    `SELECT id FROM answers WHERE question_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [questionId]
  );
  const answerId = dbAnswer.rows[0].id;
  cleanup.answers.push(answerId);

  const answerApprove = await request(`/admin/approve/answer/${answerId}`, {
    method: "POST",
    headers: adminAuth,
  });
  assert.equal(answerApprove.response.status, 200);

  const answersList = await request(`/answers?question_id=${questionId}`, { headers: mentorAuth });
  assert.equal(answersList.response.status, 200);
  assert.equal(answersList.body.some((r) => r.id === answerId), true);

  const voteInsight = await request("/votes", {
    method: "POST",
    headers: mentorAuth,
    body: JSON.stringify({ insight_id: insightId, value: 1 }),
  });
  assert.equal(voteInsight.response.status, 201);

  const voteDuplicate = await request("/votes", {
    method: "POST",
    headers: mentorAuth,
    body: JSON.stringify({ insight_id: insightId, value: 1 }),
  });
  assert.equal(voteDuplicate.response.status, 409);

  const voteAnswer = await request("/votes", {
    method: "POST",
    headers: adminAuth,
    body: JSON.stringify({ answer_id: answerId, value: -1 }),
  });
  assert.equal(voteAnswer.response.status, 201);

  const courseCreate = await request("/courses", {
    method: "POST",
    headers: mentorAuth,
    body: JSON.stringify({
      name: `Course ${stamp}`,
      category_id: categoryId,
      link: "https://example.com/course",
    }),
  });
  assert.equal(courseCreate.response.status, 201);
  cleanup.courses.push(courseCreate.body.id);

  const coursesList = await request(`/courses?category_id=${categoryId}`, { headers: internAuth });
  assert.equal(coursesList.response.status, 200);
  assert.equal(coursesList.body.some((r) => r.name === `Course ${stamp}`), true);

  const exitCreate = await request("/exit-interviews", {
    method: "POST",
    headers: internAuth,
    body: JSON.stringify({
      user_name: "Intern User",
      category_id: categoryId,
      youtube_link: "https://youtube.com/watch?v=testvideo",
    }),
  });
  assert.equal(exitCreate.response.status, 201);
  cleanup.exits.push(exitCreate.body.id);

  const exitList = await request("/exit-interviews", { headers: adminAuth });
  assert.equal(exitList.response.status, 200);
  assert.equal(exitList.body.some((r) => r.id === exitCreate.body.id), true);

  const search = await request(`/search?q=${encodeURIComponent(`Question ${stamp}`)}`, {
    headers: mentorAuth,
  });
  assert.equal(search.response.status, 200);
  assert.equal(Array.isArray(search.body), true);

  const legacyReject = await request(`/admin/insights/${insightId}/reject`, {
    method: "POST",
    headers: adminAuth,
  });
  assert.equal(legacyReject.response.status, 200);
});
