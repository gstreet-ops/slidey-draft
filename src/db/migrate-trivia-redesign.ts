import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log("Starting trivia redesign migration...");

  // Step 1: Create new enums
  console.log("Creating enums...");
  await sql`CREATE TYPE trivia_difficulty AS ENUM ('easy', 'medium', 'hard')`;
  await sql`CREATE TYPE trivia_queue_status AS ENUM ('pending', 'active', 'completed')`;

  // Step 2: Drop old trivia_responses (FK depends on trivia_questions)
  console.log("Dropping old trivia_responses...");
  await sql`DROP TABLE IF EXISTS trivia_responses CASCADE`;

  // Step 3: Drop old trivia_questions
  console.log("Dropping old trivia_questions...");
  await sql`DROP TABLE IF EXISTS trivia_questions CASCADE`;

  // Step 4: Create new trivia_questions
  console.log("Creating new trivia_questions...");
  await sql`
    CREATE TABLE trivia_questions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      question text NOT NULL,
      options jsonb NOT NULL,
      correct_answer integer NOT NULL,
      category text NOT NULL,
      difficulty trivia_difficulty NOT NULL DEFAULT 'medium',
      active boolean NOT NULL DEFAULT true,
      created_by uuid REFERENCES users(id),
      created_at timestamp NOT NULL DEFAULT now()
    )
  `;

  // Step 5: Create pool_trivia_queue
  console.log("Creating pool_trivia_queue...");
  await sql`
    CREATE TABLE pool_trivia_queue (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      pool_id uuid NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
      question_id uuid NOT NULL REFERENCES trivia_questions(id),
      sort_order integer NOT NULL,
      status trivia_queue_status NOT NULL DEFAULT 'pending',
      activated_at timestamp,
      completed_at timestamp,
      pick_number integer
    )
  `;
  await sql`CREATE UNIQUE INDEX pool_trivia_queue_question_idx ON pool_trivia_queue (pool_id, question_id)`;
  await sql`CREATE UNIQUE INDEX pool_trivia_queue_order_idx ON pool_trivia_queue (pool_id, sort_order)`;

  // Step 6: Create new trivia_responses
  console.log("Creating new trivia_responses...");
  await sql`
    CREATE TABLE trivia_responses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      pool_id uuid NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id),
      question_id uuid NOT NULL REFERENCES trivia_questions(id),
      pick_number integer NOT NULL,
      selected_answer integer NOT NULL,
      is_correct boolean NOT NULL,
      points_awarded integer NOT NULL DEFAULT 0,
      submitted_at timestamp NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE UNIQUE INDEX trivia_response_unique_idx ON trivia_responses (pool_id, user_id, question_id)`;

  console.log("Migration complete!");
}

migrate().catch(console.error);
