const TRAIT_RULES: { keywords: string[]; label: string; color: string }[] = [
  { keywords: ["speed", "burst", "explosiveness", "explosive", "blazing"], label: "Elite Speed", color: "bg-red-500/20 text-red-300" },
  { keywords: ["pro-ready", "plug-and-play", "day-one starter", "nfl-ready", "pro ready", "day one"], label: "Pro-Ready", color: "bg-green-500/20 text-green-300" },
  { keywords: ["raw", "developing", "still learning", "upside", "ceiling"], label: "High Upside", color: "bg-purple-500/20 text-purple-300" },
  { keywords: ["physical", "tough", "mauler", "nasty", "punishing"], label: "Physical", color: "bg-orange-500/20 text-orange-300" },
  { keywords: ["coverage", "ball skills", "instincts", "ball hawk", "interception"], label: "Ball Hawk", color: "bg-cyan-500/20 text-cyan-300" },
  { keywords: ["pass rush", "get-off", "edge rush", "sack", "pressure"], label: "Pass Rusher", color: "bg-rose-500/20 text-rose-300" },
  { keywords: ["route runner", "route running", "separation", "crisp routes"], label: "Route Runner", color: "bg-amber-500/20 text-amber-300" },
  { keywords: ["size", "length", "catch radius", "big frame", "wingspan"], label: "Big Target", color: "bg-blue-500/20 text-blue-300" },
  { keywords: ["versatile", "multiple positions", "position flex", "move around"], label: "Versatile", color: "bg-teal-500/20 text-teal-300" },
  { keywords: ["accuracy", "poise", "decision-making", "accurate", "touch", "placement"], label: "Accurate", color: "bg-indigo-500/20 text-indigo-300" },
];

export type TraitTag = { label: string; color: string };

export function extractTraitTags(notes: string | null, max = 3): TraitTag[] {
  if (!notes) return [];
  const lower = notes.toLowerCase();
  const tags: TraitTag[] = [];
  for (const rule of TRAIT_RULES) {
    if (tags.length >= max) break;
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      tags.push({ label: rule.label, color: rule.color });
    }
  }
  return tags;
}
