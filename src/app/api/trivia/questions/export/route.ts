import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { triviaQuestions, users } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Node runtime — jspdf depends on Buffer.
export const runtime = "nodejs";

type ExportRow = {
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  active: boolean;
  createdByName: string | null;
};

function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function letterForIndex(i: number): string {
  return String.fromCharCode(65 + i);
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildCsv(rows: ExportRow[]): string {
  const header = [
    "Question",
    "Option A",
    "Option B",
    "Option C",
    "Option D",
    "Correct Answer",
    "Category",
    "Difficulty",
    "Status",
    "Created By",
  ];
  const lines = [header.map(csvEscape).join(",")];
  for (const r of rows) {
    const opts = (r.options ?? []) as string[];
    lines.push(
      [
        r.question,
        opts[0] ?? "",
        opts[1] ?? "",
        opts[2] ?? "",
        opts[3] ?? "",
        letterForIndex(r.correctAnswer),
        r.category,
        r.difficulty,
        r.active ? "Active" : "Inactive",
        r.createdByName ?? "System",
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  return lines.join("\r\n") + "\r\n";
}

function buildJson(rows: ExportRow[]): string {
  return JSON.stringify(
    rows.map((r) => {
      const opts = (r.options ?? []) as string[];
      return {
        question: r.question,
        optionA: opts[0] ?? "",
        optionB: opts[1] ?? "",
        optionC: opts[2] ?? "",
        optionD: opts[3] ?? "",
        correctAnswer: letterForIndex(r.correctAnswer),
        category: r.category,
        difficulty: r.difficulty,
        active: r.active,
        createdBy: r.createdByName ?? "System",
      };
    }),
    null,
    2
  );
}

function buildPdf(
  rows: ExportRow[],
  meta: { categoryLabel: string; difficultyLabel: string }
): Uint8Array {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Draft Day Challenge — Trivia Question Export", 40, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  const subtitle = `Generated ${todayIsoDate()} · ${rows.length} question${rows.length === 1 ? "" : "s"} · Categories: ${meta.categoryLabel} · Difficulty: ${meta.difficultyLabel}`;
  doc.text(subtitle, 40, 58, { maxWidth: pageWidth - 80 });
  doc.setTextColor(0);

  // Category → deterministic color (stable across runs for the same string).
  const categoryColor = (cat: string): [number, number, number] => {
    let h = 0;
    for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) >>> 0;
    const palette: [number, number, number][] = [
      [79, 70, 229],   // indigo
      [16, 185, 129],  // emerald
      [245, 158, 11],  // amber
      [239, 68, 68],   // red
      [14, 165, 233],  // sky
      [168, 85, 247],  // violet
      [236, 72, 153],  // pink
      [20, 184, 166],  // teal
    ];
    return palette[h % palette.length];
  };

  const diffColor = (d: string): [number, number, number] => {
    if (d === "easy") return [21, 128, 61];    // green-700
    if (d === "medium") return [161, 98, 7];   // amber-700
    return [185, 28, 28];                      // red-700
  };

  type Row = [string, string, string, string, string, string];
  const body: Row[] = rows.map((r, i) => {
    const opts = (r.options ?? []) as string[];
    const optsCell = opts
      .map((o, idx) => `${letterForIndex(idx)}. ${o}`)
      .join("\n");
    return [
      String(i + 1),
      r.question,
      optsCell,
      letterForIndex(r.correctAnswer),
      r.category,
      r.difficulty,
    ];
  });

  autoTable(doc, {
    head: [["#", "Question", "Options", "Answer", "Category", "Difficulty"]],
    body,
    startY: 76,
    margin: { left: 40, right: 40 },
    styles: { fontSize: 8, cellPadding: 5, valign: "top", overflow: "linebreak" },
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: 255,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 24, halign: "center" },
      1: { cellWidth: 280 },
      2: { cellWidth: 280 },
      3: { cellWidth: 50, halign: "center", fontStyle: "bold" },
      4: { cellWidth: 80 },
      5: { cellWidth: 60 },
    },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      if (data.column.index === 4) {
        const [r, g, b] = categoryColor(String(data.cell.raw ?? ""));
        data.cell.styles.fillColor = [r, g, b];
        data.cell.styles.textColor = 255;
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.halign = "center";
      } else if (data.column.index === 5) {
        const [r, g, b] = diffColor(String(data.cell.raw ?? ""));
        data.cell.styles.textColor = [r, g, b];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.halign = "center";
      }
    },
    didDrawPage: () => {
      const footerY = pageHeight - 20;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(130);
      doc.text(
        "Exported from Draft Day Challenge — slidey-draft.vercel.app",
        40,
        footerY
      );
      const pageNum = doc.getCurrentPageInfo().pageNumber;
      doc.text(`Page ${pageNum}`, pageWidth - 40, footerY, { align: "right" });
      doc.setTextColor(0);
    },
  });

  return new Uint8Array(doc.output("arraybuffer"));
}

function parseCsvList(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin" && session.user.role !== "commissioner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const categories = parseCsvList(searchParams.get("categories"));
  const difficultiesRaw = parseCsvList(searchParams.get("difficulties"));
  const difficulties = difficultiesRaw.filter((d): d is "easy" | "medium" | "hard" =>
    d === "easy" || d === "medium" || d === "hard"
  );
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw == null || limitRaw === "" ? null : Math.max(1, parseInt(limitRaw, 10));
  const includeInactive = searchParams.get("includeInactive") === "true";
  const format = (searchParams.get("format") || "csv").toLowerCase();
  const countOnly = searchParams.get("countOnly") === "true";

  const conditions = [];
  if (!includeInactive) conditions.push(eq(triviaQuestions.active, true));
  if (categories.length > 0) conditions.push(inArray(triviaQuestions.category, categories));
  if (difficulties.length > 0) conditions.push(inArray(triviaQuestions.difficulty, difficulties));
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Count-only lightweight mode for the modal's live preview.
  if (countOnly) {
    const [matchRow, distinctCats] = await Promise.all([
      db
        .select({ c: sql<number>`count(*)` })
        .from(triviaQuestions)
        .where(where),
      db
        .selectDistinct({ category: triviaQuestions.category })
        .from(triviaQuestions)
        .orderBy(triviaQuestions.category),
    ]);
    return NextResponse.json({
      count: Number(matchRow[0]?.c ?? 0),
      categories: distinctCats.map((c) => c.category),
    });
  }

  if (!["csv", "json", "pdf"].includes(format)) {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }

  // Pull rows, joined to users for display name.
  const rowsQuery = db
    .select({
      id: triviaQuestions.id,
      question: triviaQuestions.question,
      options: triviaQuestions.options,
      correctAnswer: triviaQuestions.correctAnswer,
      category: triviaQuestions.category,
      difficulty: triviaQuestions.difficulty,
      active: triviaQuestions.active,
      createdBy: triviaQuestions.createdBy,
      createdByName: users.name,
      createdByEmail: users.email,
    })
    .from(triviaQuestions)
    .leftJoin(users, eq(triviaQuestions.createdBy, users.id))
    .where(where)
    .orderBy(limit != null ? sql`RANDOM()` : sql`${triviaQuestions.createdAt} DESC`);

  const raw = limit != null ? await rowsQuery.limit(limit) : await rowsQuery;

  const rows: ExportRow[] = raw.map((r) => ({
    question: r.question,
    options: (r.options as string[]) ?? [],
    correctAnswer: r.correctAnswer,
    category: r.category,
    difficulty: r.difficulty,
    active: r.active,
    createdByName: r.createdByName ?? r.createdByEmail ?? (r.createdBy ? "Commissioner" : null),
  }));

  const dateStr = todayIsoDate();

  if (format === "json") {
    const body = buildJson(rows);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="trivia-export-${dateStr}.json"`,
      },
    });
  }

  if (format === "csv") {
    const body = buildCsv(rows);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="trivia-export-${dateStr}.csv"`,
      },
    });
  }

  // PDF
  const categoryLabel = categories.length === 0 ? "All" : categories.join(", ");
  const difficultyLabel =
    difficulties.length === 0
      ? "All"
      : difficulties.map((d) => d[0].toUpperCase() + d.slice(1)).join(", ");

  const bytes = buildPdf(rows, { categoryLabel, difficultyLabel });
  // Copy to a plain ArrayBuffer so TS happily accepts the BodyInit type.
  const body = new Uint8Array(bytes).buffer;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="trivia-export-${dateStr}.pdf"`,
      "Content-Length": String(bytes.byteLength),
    },
  });
}
