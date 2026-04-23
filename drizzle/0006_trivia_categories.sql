CREATE TABLE "trivia_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"color" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trivia_categories_name_unique" UNIQUE("name"),
	CONSTRAINT "trivia_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
INSERT INTO "trivia_categories" ("name", "slug", "color", "sort_order") VALUES
	('NFL History', 'nfl-history', '#3B82F6', 10),
	('Draft Trivia', 'draft-trivia', '#8B5CF6', 20),
	('Draft History', 'draft-history', '#6366F1', 30),
	('Team Trivia', 'team-trivia', '#EC4899', 40),
	('Prospects', 'prospects', '#10B981', 50),
	('Sports General', 'sports-general', '#F59E0B', 60),
	('Pop Culture', 'pop-culture', '#EF4444', 70),
	('General Knowledge', 'general-knowledge', '#6B7280', 80),
	('Slidey.com Harsh', 'slidey-com-harsh', '#FFB612', 90)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
-- Normalize existing trivia_questions.category values to match the canonical display names.
-- Matching is done case-insensitively on both the raw value and a slugified version so that
-- existing variants like 'nfl_history', 'NFL history', 'general', 'general knowledge' all map cleanly.
UPDATE "trivia_questions"
SET "category" = CASE
	WHEN lower(trim("category")) IN ('nfl history', 'nfl_history', 'nfl-history') THEN 'NFL History'
	WHEN lower(trim("category")) IN ('draft trivia', 'draft_trivia', 'draft-trivia') THEN 'Draft Trivia'
	WHEN lower(trim("category")) IN ('draft history', 'draft_history', 'draft-history') THEN 'Draft History'
	WHEN lower(trim("category")) IN ('team trivia', 'team_trivia', 'team-trivia') THEN 'Team Trivia'
	WHEN lower(trim("category")) IN ('prospects', 'prospect') THEN 'Prospects'
	WHEN lower(trim("category")) IN ('sports general', 'sports_general', 'sports-general') THEN 'Sports General'
	WHEN lower(trim("category")) IN ('pop culture', 'pop_culture', 'pop-culture') THEN 'Pop Culture'
	WHEN lower(trim("category")) IN ('general', 'general knowledge', 'general_knowledge', 'general-knowledge') THEN 'General Knowledge'
	WHEN lower(trim("category")) IN ('slidey.com harsh', 'slidey com harsh', 'slidey_com_harsh', 'slidey-com-harsh', 'slidey harsh') THEN 'Slidey.com Harsh'
	WHEN lower(trim("category")) IN ('combine') THEN 'Draft Trivia'
	WHEN lower(trim("category")) IN ('trades') THEN 'Draft Trivia'
	WHEN lower(trim("category")) IN ('2026_draft', '2026 draft', '2026-draft') THEN 'Draft Trivia'
	ELSE "category"
END;
--> statement-breakpoint
-- For any questions whose category still doesn't match a row in trivia_categories,
-- insert a new category row so the data stays consistent (using a neutral slate color).
INSERT INTO "trivia_categories" ("name", "slug", "color", "sort_order")
SELECT
	DISTINCT tq."category",
	lower(regexp_replace(regexp_replace(tq."category", '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g')),
	'#6B7280',
	100
FROM "trivia_questions" tq
LEFT JOIN "trivia_categories" tc ON tc."name" = tq."category"
WHERE tc."id" IS NULL AND tq."category" IS NOT NULL AND trim(tq."category") <> ''
ON CONFLICT ("slug") DO NOTHING;
