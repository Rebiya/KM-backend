function parseLoginBody(body) {
  const email = body && body.email;
  const password = body && body.password;
  if (typeof email !== "string" || typeof password !== "string") {
    const err = new Error("email and password are required");
    err.statusCode = 400;
    throw err;
  }
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail) {
    const err = new Error("email is required");
    err.statusCode = 400;
    throw err;
  }
  if (!password) {
    const err = new Error("password is required");
    err.statusCode = 400;
    throw err;
  }
  return { email: trimmedEmail, password };
}

function parseRegisterBody(body) {
  const name = body && body.name;
  const email = body && body.email;
  const password = body && body.password;
  const role = body && body.role ? String(body.role).trim().toLowerCase() : "intern";

  if (typeof name !== "string" || !name.trim()) {
    const err = new Error("name is required");
    err.statusCode = 400;
    throw err;
  }

  if (typeof email !== "string" || typeof password !== "string") {
    const err = new Error("name, email, and password are required");
    err.statusCode = 400;
    throw err;
  }

  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail) {
    const err = new Error("email is required");
    err.statusCode = 400;
    throw err;
  }

  if (!password) {
    const err = new Error("password is required");
    err.statusCode = 400;
    throw err;
  }

  if (!["intern", "mentor", "admin"].includes(role)) {
    const err = new Error("Invalid role. Use one of: intern, mentor, admin.");
    err.statusCode = 400;
    throw err;
  }

  return {
    name: name.trim(),
    email: trimmedEmail,
    password,
    role,
  };
}

module.exports = { parseLoginBody, parseRegisterBody };
