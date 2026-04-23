import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaCategories, triviaQuestions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "admin" && session.user.role !== "commissioner") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

// PUT /api/trivia/categories/[categoryId] — update name/color/sortOrder
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const { categoryId } = await params;

  const [existing] = await db
    .select()
    .from(triviaCategories)
    .where(eq(triviaCategories.id, categoryId));

  if (!existing) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const updates: {
    name?: string;
    slug?: string;
    color?: string;
    sortOrder?: number;
  } = {};
  let nameChanged = false;
  const previousName = existing.name;

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (name !== existing.name) {
      const slug = slugify(name);
      if (!slug) {
        return NextResponse.json({ error: "Name must contain letters or numbers" }, { status: 400 });
      }
      const [conflict] = await db
        .select({ id: triviaCategories.id })
        .from(triviaCategories)
        .where(
          sql`(lower(${triviaCategories.name}) = lower(${name}) OR ${triviaCategories.slug} = ${slug}) AND ${triviaCategories.id} <> ${categoryId}`
        )
        .limit(1);
      if (conflict) {
        return NextResponse.json({ error: "Another category already uses that name" }, { status: 409 });
      }
      updates.name = name;
      updates.slug = slug;
      nameChanged = true;
    }
  }

  if (body.color !== undefined) {
    const color = typeof body.color === "string" ? body.color.trim() : "";
    if (!HEX_COLOR.test(color)) {
      return NextResponse.json({ error: "Color must be a 6-digit hex" }, { status: 400 });
    }
    updates.color = color;
  }

  if (body.sortOrder !== undefined) {
    const sortOrder = Number(body.sortOrder);
    if (!Number.isFinite(sortOrder)) {
      return NextResponse.json({ error: "sortOrder must be a number" }, { status: 400 });
    }
    updates.sortOrder = sortOrder;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const [updated] = await db
    .update(triviaCategories)
    .set(updates)
    .where(eq(triviaCategories.id, categoryId))
    .returning();

  // If the name changed, propagate to all questions that used the old name so
  // the denormalized trivia_questions.category stays in sync.
  if (nameChanged && updates.name) {
    await db
      .update(triviaQuestions)
      .set({ category: updates.name })
      .where(eq(triviaQuestions.category, previousName));
  }

  return NextResponse.json({ category: updated });
}

// DELETE /api/trivia/categories/[categoryId] — delete a category (only if 0 questions use it)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;

  const { categoryId } = await params;

  const [existing] = await db
    .select()
    .from(triviaCategories)
    .where(eq(triviaCategories.id, categoryId));

  if (!existing) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(triviaQuestions)
    .where(eq(triviaQuestions.category, existing.name));

  const count = Number(countRow?.count ?? 0);
  if (count > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${count} question${count === 1 ? "" : "s"} still use this category. Merge or reassign them first.` },
      { status: 409 }
    );
  }

  await db.delete(triviaCategories).where(eq(triviaCategories.id, categoryId));
  return NextResponse.json({ ok: true });
}
