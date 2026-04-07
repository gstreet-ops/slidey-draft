import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Use a dummy URL at build time so neon() returns a valid (unused) client.
// At runtime, DATABASE_URL is always set via Vercel env vars.
const sql = neon(process.env.DATABASE_URL || "postgresql://build:build@localhost/build");

export const db = drizzle(sql, { schema });
