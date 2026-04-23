import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaCategories, triviaQuestions } from "@/db/schema";
import { sql, asc } from "drizzle-orm";

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// GET /api/trivia/categories — list all categories with question counts
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: triviaCategories.id,
      name: triviaCategories.name,
      slug: triviaCategories.slug,
      color: triviaCategories.color,
      sortOrder: triviaCategories.sortOrder,
      createdAt: triviaCategories.createdAt,
      questionCount: sql<number>`(
        SELECT COUNT(*)::int
        FROM ${triviaQuestions}
        WHERE ${triviaQuestions.category} = ${triviaCategories.name}
      )`,
    })
    .from(triviaCategories)
    .orderBy(asc(triviaCategories.sortOrder), asc(triviaCategories.name));

  return NextResponse.json({
    categories: rows.map((r) => ({
      ...r,
      questionCount: Number(r.questionCount),
    })),
  });
}

// POST /api/trivia/categories — create new category (admin or commissioner)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin" && session.user.role !== "commissioner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const color = typeof body.color === "string" ? body.color.trim() : "";
  const sortOrder = Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : null;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!HEX_COLOR.test(color)) {
    return NextResponse.json({ error: "Color must be a 6-digit hex, e.g. #3B82F6" }, { status: 400 });
  }

  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json({ error: "Name must contain letters or numbers" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: triviaCategories.id })
    .from(triviaCategories)
    .where(sql`lower(${triviaCategories.name}) = lower(${name}) OR ${triviaCategories.slug} = ${slug}`)
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: "A category with that name already exists" }, { status: 409 });
  }

  let nextSortOrder = sortOrder;
  if (nextSortOrder === null) {
    const [maxRow] = await db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${triviaCategories.sortOrder}), 0)` })
      .from(triviaCategories);
    nextSortOrder = Number(maxRow?.maxOrder ?? 0) + 10;
  }

  const [created] = await db
    .insert(triviaCategories)
    .values({ name, slug, color, sortOrder: nextSortOrder })
    .returning();

  return NextResponse.json({ category: { ...created, questionCount: 0 } });
}
