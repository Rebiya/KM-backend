async function initDb(pool) {
  // UUID generation requires pgcrypto in older defaults.
  await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      email text UNIQUE NOT NULL,
      role text NOT NULL,
      password_hash text NOT NULL,
      points integer NOT NULL DEFAULT 0,
      created_at timestamp NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now();
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS category (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text UNIQUE NOT NULL
    );
  `);

  await pool.query(
    `INSERT INTO category (name)
     VALUES ('Transformer')
     ON CONFLICT (name) DO NOTHING`
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS insights (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id uuid REFERENCES category(id) ON DELETE SET NULL,
      title text NOT NULL,
      content text,
      link text,
      status text NOT NULL DEFAULT 'pending',
      approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamp NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    ALTER TABLE insights
    ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES category(id) ON DELETE SET NULL;
  `);

  await pool.query(`
    ALTER TABLE insights
    ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now();
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id uuid REFERENCES category(id) ON DELETE SET NULL,
      title text NOT NULL,
      content text NOT NULL,
      type text NOT NULL CHECK (type IN ('general', 'bug')),
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamp NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES category(id) ON DELETE SET NULL;
  `);

  await pool.query(`
    ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users(id) ON DELETE SET NULL;
  `);

  await pool.query(`
    ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now();
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS answers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content text NOT NULL,
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamp NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    ALTER TABLE answers
    ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES users(id) ON DELETE SET NULL;
  `);

  await pool.query(`
    ALTER TABLE answers
    ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now();
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS votes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      insight_id uuid REFERENCES insights(id) ON DELETE CASCADE,
      answer_id uuid REFERENCES answers(id) ON DELETE CASCADE,
      value integer NOT NULL CHECK (value IN (1, -1)),
      created_at timestamp NOT NULL DEFAULT now(),
      CHECK (
        (insight_id IS NOT NULL AND answer_id IS NULL) OR
        (insight_id IS NULL AND answer_id IS NOT NULL)
      )
    );
  `);

  await pool.query(`
    ALTER TABLE votes
    ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now();
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS courses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      category_id uuid REFERENCES category(id) ON DELETE SET NULL,
      link text NOT NULL
    );
  `);

  await pool.query(`
    ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES category(id) ON DELETE SET NULL;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS exit_interviews (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_name text NOT NULL,
      category_id uuid REFERENCES category(id) ON DELETE SET NULL,
      youtube_link text NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`
    ALTER TABLE exit_interviews
    ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now();
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS insights_user_id_idx ON insights(user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS insights_status_idx ON insights(status);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS insights_category_id_idx ON insights(category_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS questions_user_id_idx ON questions(user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS questions_category_id_idx ON questions(category_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS questions_status_idx ON questions(status);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS answers_question_id_idx ON answers(question_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS answers_user_id_idx ON answers(user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS answers_status_idx ON answers(status);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS votes_user_id_idx ON votes(user_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS votes_insight_id_idx ON votes(insight_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS votes_answer_id_idx ON votes(answer_id);`);
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS votes_user_insight_unique_idx
     ON votes(user_id, insight_id)
     WHERE insight_id IS NOT NULL`
  );
  await pool.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS votes_user_answer_unique_idx
     ON votes(user_id, answer_id)
     WHERE answer_id IS NOT NULL`
  );
  await pool.query(`CREATE INDEX IF NOT EXISTS courses_category_id_idx ON courses(category_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS exit_interviews_category_id_idx ON exit_interviews(category_id);`);
}

module.exports = { initDb };
