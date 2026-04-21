// Placeholder draft-intel content for /draft-hub. Flavor text only; no real articles.
// TODO: Replace with live ESPN RSS / editorial feed integration.

export type DraftContent = {
  id: string;
  /** Human-readable category chip text (e.g. "DRAFT INTEL", "STEELERS"). */
  category: string;
  /** Optional NFL abbreviation used for team-color chip styling & gradient placeholders. */
  teamAbbr?: string;
  headline: string;
  subtext: string;
  author: string;
  /** Relative timestamp string — display-ready ("2h ago", "1d ago"). */
  timestamp: string;
  /** True means this item is eligible for the hero slot. Exactly one should be featured. */
  featured?: boolean;
};

export const DRAFT_CONTENT: DraftContent[] = [
  {
    id: "featured-mock-50",
    category: "DRAFT INTEL",
    headline: "Mock Draft 5.0: Mendoza rising, Steelers eyeing EDGE help at #14",
    subtext:
      "With two days until Pittsburgh goes on the clock, the final projection has Fernando Mendoza sneaking into the top 5 and a surprise run on edge rushers reshaping the middle of the first.",
    author: "Mel Kiper Jr.",
    timestamp: "2h ago",
    featured: true,
  },
  {
    id: "three-qbs-top10",
    category: "DRAFT INTEL",
    headline:
      "Three quarterbacks could go in the top 10 for the first time since 2021",
    subtext:
      "Mendoza, Simpson, and a late-rising third arm have scouts split on whether demand outpaces grades in a class that isn't supposed to be QB-deep.",
    author: "Daniel Jeremiah",
    timestamp: "5h ago",
  },
  {
    id: "edge-deepest-decade",
    category: "DRAFT INTEL",
    headline:
      "NFL execs ranking the 2026 class: 'Deepest EDGE group in a decade'",
    subtext:
      "David Bailey and Rueben Bain Jr. headline a group that could produce eight first-round picks — with another six ranked inside the top 60.",
    author: "Jordan Reid",
    timestamp: "8h ago",
  },
  {
    id: "steelers-styles",
    category: "STEELERS",
    teamAbbr: "PIT",
    headline:
      "Steelers reportedly high on Sonny Styles — could they trade up for the Ohio State LB?",
    subtext:
      "Multiple sources say Pittsburgh has Styles graded as a top-10 player. Moving up from #14 would cost a 2027 second — a price the war room is weighing.",
    author: "Dianna Russini",
    timestamp: "4h ago",
  },
  {
    id: "steelers-wishlist",
    category: "STEELERS",
    teamAbbr: "PIT",
    headline:
      "Pittsburgh's wish list: Filling the OL and WR2 holes on Day 1",
    subtext:
      "Tomlin hinted Monday that the trenches remain the priority, but don't rule out a pass-catcher if Makai Lemon is on the board at the turn.",
    author: "Gerry Dulac",
    timestamp: "12h ago",
  },
  {
    id: "steelers-hometown",
    category: "STEELERS",
    teamAbbr: "PIT",
    headline:
      "The hometown draft: What it means for the Steelers' board (and their fans)",
    subtext:
      "For the first time since 1988, the NFL Draft returns to Pittsburgh. Inside the war room, the team is preparing for 60,000 fans outside their front door.",
    author: "Dale Lolley",
    timestamp: "1d ago",
  },
  {
    id: "bears-visits",
    category: "BEARS",
    teamAbbr: "CHI",
    headline:
      "Bears' pre-draft visit tracker: corners and edge rushers dominate the 30 visits",
    subtext:
      "Chicago has brought in 18 defensive players in the last three weeks, signaling a clear direction with the 10th overall pick.",
    author: "Jonathan Jones",
    timestamp: "6h ago",
  },
  {
    id: "lions-tate",
    category: "LIONS",
    teamAbbr: "DET",
    headline:
      "Lions could target Carnell Tate to add another gear to their WR room",
    subtext:
      "Detroit likes the Ohio State receiver's contested-catch profile and thinks he complements Amon-Ra St. Brown cleanly as an outside X.",
    author: "Dave Birkett",
    timestamp: "9h ago",
  },
  {
    id: "giants-qb-reach",
    category: "GIANTS",
    teamAbbr: "NYG",
    headline:
      "Giants may reach for a quarterback at #6 if one of the top three slides",
    subtext:
      "Schoen has publicly said they're 'comfortable' but war-room sources describe an aggressive posture if either Mendoza or Ty Simpson falls to them.",
    author: "Ian Rapoport",
    timestamp: "3h ago",
  },
  {
    id: "commanders-bailey",
    category: "COMMANDERS",
    teamAbbr: "WAS",
    headline:
      "Washington loves David Bailey — but is EDGE really the right pick at 13?",
    subtext:
      "The Bailey film is as clean as any defender in the class. Whether the Commanders double down on pass rush or pivot to corner is the draft-day tell.",
    author: "John Keim",
    timestamp: "11h ago",
  },
  {
    id: "bills-trade-down",
    category: "BILLS",
    teamAbbr: "BUF",
    headline:
      "Bills' trade-down options crystallizing in the 20s — two teams already calling",
    subtext:
      "Beane has a short list of partners at #24 and is prioritizing picks over slot. The target: a late first plus a 2027 second.",
    author: "Tyler Dunne",
    timestamp: "14h ago",
  },
  {
    id: "pats-love",
    category: "PATRIOTS",
    teamAbbr: "NE",
    headline:
      "New England eyeing Jeremiyah Love as the perfect fit for Mayo's new offense",
    subtext:
      "The Notre Dame back brings three-down versatility the Patriots have lacked since 2018. Coaching staff reportedly sees him as a Day 1 starter.",
    author: "Mike Reiss",
    timestamp: "7h ago",
  },
  {
    id: "rams-offense",
    category: "RAMS",
    teamAbbr: "LAR",
    headline:
      "McVay's message to the war room: 'Anyone but another DB' at #22",
    subtext:
      "Los Angeles has been loading up on the defensive back end for three drafts. This year, scouts say the mandate has flipped hard back to offense.",
    author: "Jourdan Rodrigue",
    timestamp: "2d ago",
  },
  {
    id: "downs-top10",
    category: "DRAFT INTEL",
    headline:
      "Combine riser Caleb Downs locking in as a top-10 lock — and the first safety off the board",
    subtext:
      "After running a 4.39 and posting elite shuttle times, Downs has cemented himself inside the top 10 on nearly every team's board polled this week.",
    author: "Lance Zierlein",
    timestamp: "1d ago",
  },
  {
    id: "reese-vs-styles",
    category: "DRAFT INTEL",
    headline:
      "Scouts debate: Arvell Reese or Sonny Styles — which Ohio State LB goes first?",
    subtext:
      "The teammates have split the LB1 title at different points this spring. At the top of the board it may come down to scheme fit more than grade.",
    author: "Todd McShay",
    timestamp: "18h ago",
  },
];

export function getFeaturedArticle(): DraftContent {
  return DRAFT_CONTENT.find((c) => c.featured) ?? DRAFT_CONTENT[0];
}

export function getCoverageArticles(count = 6): DraftContent[] {
  return DRAFT_CONTENT.filter((c) => !c.featured).slice(0, count);
}

export function getTeamArticles(teamAbbr: string, count = 3): DraftContent[] {
  return DRAFT_CONTENT.filter((c) => c.teamAbbr === teamAbbr).slice(0, count);
}

export function getHeadlineStrip(count = 6): DraftContent[] {
  return DRAFT_CONTENT.filter((c) => !c.featured).slice(0, count);
}
