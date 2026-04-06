import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  // Alter users table: make name nullable, add email_verified and image columns, drop avatar_url
  await sql`ALTER TABLE "users" ALTER COLUMN "name" DROP NOT NULL`;
  await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" timestamp`;
  await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "image" text`;

  // Drop avatar_url if it exists (replaced by image)
  try {
    await sql`ALTER TABLE "users" DROP COLUMN IF EXISTS "avatar_url"`;
  } catch {
    // column may not exist
  }

  // Create accounts table
  await sql`
    CREATE TABLE IF NOT EXISTS "accounts" (
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "type" text NOT NULL,
      "provider" text NOT NULL,
      "provider_account_id" text NOT NULL,
      "refresh_token" text,
      "access_token" text,
      "expires_at" integer,
      "token_type" text,
      "scope" text,
      "id_token" text,
      "session_state" text,
      PRIMARY KEY ("provider", "provider_account_id")
    )
  `;

  // Create sessions table
  await sql`
    CREATE TABLE IF NOT EXISTS "sessions" (
      "session_token" text PRIMARY KEY NOT NULL,
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "expires" timestamp NOT NULL
    )
  `;

  // Create verification_tokens table
  await sql`
    CREATE TABLE IF NOT EXISTS "verification_tokens" (
      "identifier" text NOT NULL,
      "token" text NOT NULL,
      "expires" timestamp NOT NULL,
      PRIMARY KEY ("identifier", "token")
    )
  `;

  // Create groups table
  await sql`
    CREATE TABLE IF NOT EXISTS "groups" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "name" text NOT NULL,
      "invite_code" text NOT NULL UNIQUE,
      "created_by" uuid NOT NULL REFERENCES "users"("id"),
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `;

  // Create group_members table
  await sql`
    CREATE TABLE IF NOT EXISTS "group_members" (
      "group_id" uuid NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE,
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "joined_at" timestamp DEFAULT now() NOT NULL,
      PRIMARY KEY ("group_id", "user_id")
    )
  `;

  console.log("Phase 2 migration complete!");
}

migrate().catch(console.error);
