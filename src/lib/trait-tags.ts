// Position-aware trait tag extraction from scouting reports

export type TraitTag = { label: string; color: string };

const POSITION_GROUPS: Record<string, string[]> = {
  QB: ["QB"],
  RB: ["RB", "FB"],
  WR_TE: ["WR", "TE"],
  OL: ["OT", "OG", "OL", "C", "G", "T"],
  DL: ["DT", "DE", "DL", "NT", "EDGE"],
  LB: ["LB", "ILB", "OLB"],
  DB: ["CB", "S", "FS", "SS", "DB"],
  SPEC: ["K", "P", "LS"],
};

function positionIn(position: string, ...groups: string[]): boolean {
  const upper = position.toUpperCase();
  return groups.some((g) => POSITION_GROUPS[g]?.includes(upper));
}

const BIG_TARGET_NEGATIVES = ["undersized", "small", "slight", "compact", "diminutive"];

type TraitRule = {
  label: string;
  color: string;
  keywords: string[];
  negativeKeywords?: string[];
  allowedPositions?: string[]; // position group keys; omit = universal
};

const TRAIT_RULES: TraitRule[] = [
  // Position-restricted tags
  {
    label: "Elite Speed",
    color: "bg-red-500/20 text-red-300",
    keywords: ["speed", "burst", "explosiveness", "explosive", "blazing"],
    allowedPositions: ["RB", "WR_TE", "DB"],
    // Also allow EDGE/DE specifically
  },
  {
    label: "Accurate",
    color: "bg-indigo-500/20 text-indigo-300",
    keywords: ["accuracy", "poise", "decision-making", "accurate", "touch", "placement"],
    allowedPositions: ["QB"],
  },
  {
    label: "Ball Hawk",
    color: "bg-cyan-500/20 text-cyan-300",
    keywords: ["coverage", "ball skills", "instincts", "ball hawk", "interception"],
    allowedPositions: ["DB"],
  },
  {
    label: "Big Target",
    color: "bg-blue-500/20 text-blue-300",
    keywords: ["size", "catch radius", "big frame", "wingspan"],
    negativeKeywords: BIG_TARGET_NEGATIVES,
    allowedPositions: ["WR_TE"],
  },
  {
    label: "Route Runner",
    color: "bg-amber-500/20 text-amber-300",
    keywords: ["route runner", "route running", "separation", "crisp routes"],
    allowedPositions: ["WR_TE"],
  },
  {
    label: "Pass Rusher",
    color: "bg-rose-500/20 text-rose-300",
    keywords: ["pass rush", "get-off", "edge rush", "sack", "pressure"],
    allowedPositions: ["DL", "LB"],
  },
  {
    label: "Field General",
    color: "bg-indigo-500/20 text-indigo-300",
    keywords: ["leader", "command", "audible", "reads", "pre-snap", "field general"],
    allowedPositions: ["QB"],
  },
  {
    label: "Mauler",
    color: "bg-orange-500/20 text-orange-300",
    keywords: ["mauling", "mauler", "dominant blocker", "road-grading", "pancake"],
    allowedPositions: ["OL"],
  },
  {
    label: "Anchor",
    color: "bg-orange-500/20 text-orange-300",
    keywords: ["anchor", "stout", "immovable", "push the pocket"],
    allowedPositions: ["OL", "DL"],
  },
  {
    label: "Playmaker",
    color: "bg-pink-500/20 text-pink-300",
    keywords: ["playmaker", "big plays", "game-changer", "difference-maker"],
    allowedPositions: ["WR_TE", "RB", "DB", "LB"],
  },
  {
    label: "Run Stuffer",
    color: "bg-stone-500/20 text-stone-300",
    keywords: ["run defense", "gap control", "two-gap", "nose tackle", "plugger"],
    allowedPositions: ["DL", "LB"],
  },
  // Universal tags
  {
    label: "Pro-Ready",
    color: "bg-green-500/20 text-green-300",
    keywords: ["pro-ready", "plug-and-play", "day-one starter", "nfl-ready", "pro ready", "day one"],
  },
  {
    label: "High Upside",
    color: "bg-purple-500/20 text-purple-300",
    keywords: ["raw", "developing", "still learning", "upside", "ceiling"],
  },
  {
    label: "Physical",
    color: "bg-orange-500/20 text-orange-300",
    keywords: ["physical", "tough", "nasty", "punishing"],
  },
  {
    label: "Versatile",
    color: "bg-teal-500/20 text-teal-300",
    keywords: ["versatile", "multiple positions", "position flex", "move around"],
  },
];

function isPositionAllowed(position: string, rule: TraitRule): boolean {
  if (!rule.allowedPositions) return true; // universal
  const upper = position.toUpperCase();
  // Special case: EDGE/DE are allowed for Elite Speed
  if (rule.label === "Elite Speed" && (upper === "EDGE" || upper === "DE")) return true;
  return rule.allowedPositions.some((g) => POSITION_GROUPS[g]?.includes(upper));
}

export function extractTraitTags(notes: string | null, position: string, max = 3): TraitTag[] {
  if (!notes) return [];
  const lower = notes.toLowerCase();
  const tags: TraitTag[] = [];

  for (const rule of TRAIT_RULES) {
    if (tags.length >= max) break;
    if (!isPositionAllowed(position, rule)) continue;
    if (rule.negativeKeywords?.some((neg) => lower.includes(neg))) continue;
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      tags.push({ label: rule.label, color: rule.color });
    }
  }
  return tags;
}
