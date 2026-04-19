import type { PoolSettings } from "./pool-settings";

export type FeatureKey = "mockDraft" | "livePredictions" | "trivia" | "propBets" | "watchParty" | "teams";

export type FeatureConfig = {
  key: FeatureKey;
  label: string;
  description: string;
  icon: string;
  settingsKey: keyof PoolSettings;
  navItem?: { href: string; label: string };
  quickAction?: { href: string; title: string; desc: string; icon: string };
};

export const FEATURES: FeatureConfig[] = [
  {
    key: "mockDraft",
    label: "Mock Drafts",
    description: "Members build pre-draft mock boards and get graded on accuracy",
    icon: "\uD83D\uDCCB",
    settingsKey: "mockDraftBonus",
    navItem: { href: "/mock-drafts", label: "Mock Drafts" },
    quickAction: { href: "/mock-drafts", title: "Mock Drafts", desc: "Build your board, browse the pool", icon: "\uD83D\uDCCB" },
  },
  {
    key: "livePredictions",
    label: "Live Predictions",
    description: "Predict each pick in real-time as teams go on the clock",
    icon: "\u26A1",
    settingsKey: "livePredictions",
    navItem: { href: "/live", label: "Live" },
  },
  {
    key: "trivia",
    label: "Draft Trivia",
    description: "NFL trivia questions during commercial breaks",
    icon: "\uD83E\uDDE0",
    settingsKey: "trivia",
  },
  {
    key: "propBets",
    label: "Prop Bets",
    description: "Side predictions for bonus points \u2014 who goes first, trade props, fun bets",
    icon: "\uD83C\uDFB2",
    settingsKey: "propBets",
    navItem: { href: "/props", label: "Props" },
    quickAction: { href: "/props", title: "Prop Bets", desc: "Side predictions for bonus points", icon: "\uD83C\uDFB2" },
  },
  {
    key: "watchParty",
    label: "Watch Party",
    description: "Video call so your pool can watch the draft together",
    icon: "\uD83C\uDFA5",
    settingsKey: "watchParty",
  },
  {
    key: "teams",
    label: "Team Draft",
    description: "Assign members to NFL teams — each team has a captain who owns that team's picks",
    icon: "\uD83C\uDFC8",
    settingsKey: "teams",
  },
];

export function getEnabledFeatures(settings: PoolSettings): Set<FeatureKey> {
  const enabled = new Set<FeatureKey>();
  for (const f of FEATURES) {
    if (settings[f.settingsKey]) enabled.add(f.key);
  }
  return enabled;
}

export function isFeatureEnabled(settings: PoolSettings, key: FeatureKey): boolean {
  const feature = FEATURES.find((f) => f.key === key);
  if (!feature) return false;
  return !!settings[feature.settingsKey];
}
