export interface TeamTheme {
  name: string;
  city: string;
  abbreviation: string;
  primary: string;
  secondary: string;
  textOnPrimary: "white" | "black";
  stadium: string;
  division: string;
  tagline: string;
  /** Optional team logo PNG served from public/team-images. */
  logo?: string;
  /** Optional alternate logo (wordmark, monogram, helmet variant, etc.). */
  altLogo?: string;
  /** Optional current-roster action shot for the hero banner. */
  heroPlayer?: string;
  /** Optional franchise legend image for the franchise highlights card. */
  legendPlayer?: string;
  /** Optional historic / founding photo. */
  historyImage?: string;
}

export const NFL_TEAMS: Record<string, TeamTheme> = {
  ARI: { name: "Arizona Cardinals", city: "Phoenix", abbreviation: "ARI", primary: "#97233F", secondary: "#7A1B32", textOnPrimary: "white", stadium: "State Farm Stadium", division: "NFC West", tagline: "State Farm Stadium · NFC West" },
  ATL: { name: "Atlanta Falcons", city: "Atlanta", abbreviation: "ATL", primary: "#A71930", secondary: "#8B1528", textOnPrimary: "white", stadium: "Mercedes-Benz Stadium", division: "NFC South", tagline: "Mercedes-Benz Stadium · NFC South" },
  BAL: { name: "Baltimore Ravens", city: "Baltimore", abbreviation: "BAL", primary: "#241773", secondary: "#1D1260", textOnPrimary: "white", stadium: "M&T Bank Stadium", division: "AFC North", tagline: "M&T Bank Stadium · AFC North" },
  BUF: { name: "Buffalo Bills", city: "Buffalo", abbreviation: "BUF", primary: "#00338D", secondary: "#C60C30", textOnPrimary: "white", stadium: "Highmark Stadium", division: "AFC East", tagline: "Highmark Stadium · AFC East", logo: "/team-images/BUF-logo.png", altLogo: "/team-images/BUF-wordmark.png", heroPlayer: "/team-images/BUF-allen.png" },
  CAR: { name: "Carolina Panthers", city: "Charlotte", abbreviation: "CAR", primary: "#0085CA", secondary: "#006BA1", textOnPrimary: "white", stadium: "Bank of America Stadium", division: "NFC South", tagline: "Bank of America Stadium · NFC South" },
  CHI: { name: "Chicago Bears", city: "Chicago", abbreviation: "CHI", primary: "#0B162A", secondary: "#C83803", textOnPrimary: "white", stadium: "Soldier Field", division: "NFC North", tagline: "Soldier Field · NFC North", logo: "/team-images/CHI-logo.png", altLogo: "/team-images/CHI-C-logo.png", heroPlayer: "/team-images/CHI-caleb.png", legendPlayer: "/team-images/CHI-urlacher.png", historyImage: "/team-images/CHI-founding.png" },
  CIN: { name: "Cincinnati Bengals", city: "Cincinnati", abbreviation: "CIN", primary: "#FB4F14", secondary: "#D44210", textOnPrimary: "white", stadium: "Paycor Stadium", division: "AFC North", tagline: "Paycor Stadium · AFC North" },
  CLE: { name: "Cleveland Browns", city: "Cleveland", abbreviation: "CLE", primary: "#FF3C00", secondary: "#D43300", textOnPrimary: "white", stadium: "Cleveland Browns Stadium", division: "AFC North", tagline: "Cleveland Browns Stadium · AFC North" },
  DAL: { name: "Dallas Cowboys", city: "Dallas", abbreviation: "DAL", primary: "#041E42", secondary: "#869397", textOnPrimary: "white", stadium: "AT&T Stadium", division: "NFC East", tagline: "AT&T Stadium · NFC East" },
  DEN: { name: "Denver Broncos", city: "Denver", abbreviation: "DEN", primary: "#FB4F14", secondary: "#002244", textOnPrimary: "white", stadium: "Empower Field", division: "AFC West", tagline: "Empower Field · AFC West" },
  DET: { name: "Detroit Lions", city: "Detroit", abbreviation: "DET", primary: "#0076B6", secondary: "#005a8c", textOnPrimary: "white", stadium: "Ford Field", division: "NFC North", tagline: "Ford Field · NFC North", logo: "/team-images/DET-logo.png", heroPlayer: "/team-images/DET-hutch.png", legendPlayer: "/team-images/DET-sanders.png" },
  GB:  { name: "Green Bay Packers", city: "Green Bay", abbreviation: "GB", primary: "#203731", secondary: "#FFB612", textOnPrimary: "white", stadium: "Lambeau Field", division: "NFC North", tagline: "Lambeau Field · NFC North" },
  HOU: { name: "Houston Texans", city: "Houston", abbreviation: "HOU", primary: "#03202F", secondary: "#A71930", textOnPrimary: "white", stadium: "NRG Stadium", division: "AFC South", tagline: "NRG Stadium · AFC South" },
  IND: { name: "Indianapolis Colts", city: "Indianapolis", abbreviation: "IND", primary: "#002C5F", secondary: "#A2AAAD", textOnPrimary: "white", stadium: "Lucas Oil Stadium", division: "AFC South", tagline: "Lucas Oil Stadium · AFC South" },
  JAX: { name: "Jacksonville Jaguars", city: "Jacksonville", abbreviation: "JAX", primary: "#006778", secondary: "#D7A22A", textOnPrimary: "white", stadium: "EverBank Stadium", division: "AFC South", tagline: "EverBank Stadium · AFC South" },
  KC:  { name: "Kansas City Chiefs", city: "Kansas City", abbreviation: "KC", primary: "#E31837", secondary: "#FFB81C", textOnPrimary: "white", stadium: "GEHA Field at Arrowhead", division: "AFC West", tagline: "GEHA Field at Arrowhead · AFC West" },
  LV:  { name: "Las Vegas Raiders", city: "Las Vegas", abbreviation: "LV", primary: "#A5ACAF", secondary: "#000000", textOnPrimary: "black", stadium: "Allegiant Stadium", division: "AFC West", tagline: "Allegiant Stadium · AFC West" },
  LAC: { name: "Los Angeles Chargers", city: "Los Angeles", abbreviation: "LAC", primary: "#0080C6", secondary: "#FFC20E", textOnPrimary: "white", stadium: "SoFi Stadium", division: "AFC West", tagline: "SoFi Stadium · AFC West" },
  LAR: { name: "Los Angeles Rams", city: "Los Angeles", abbreviation: "LAR", primary: "#003594", secondary: "#FFA300", textOnPrimary: "white", stadium: "SoFi Stadium", division: "NFC West", tagline: "SoFi Stadium · NFC West" },
  MIA: { name: "Miami Dolphins", city: "Miami", abbreviation: "MIA", primary: "#008E97", secondary: "#FC4C02", textOnPrimary: "white", stadium: "Hard Rock Stadium", division: "AFC East", tagline: "Hard Rock Stadium · AFC East" },
  MIN: { name: "Minnesota Vikings", city: "Minneapolis", abbreviation: "MIN", primary: "#4F2683", secondary: "#FFC62F", textOnPrimary: "white", stadium: "U.S. Bank Stadium", division: "NFC North", tagline: "U.S. Bank Stadium · NFC North" },
  NE:  { name: "New England Patriots", city: "Boston", abbreviation: "NE", primary: "#002244", secondary: "#C60C30", textOnPrimary: "white", stadium: "Gillette Stadium", division: "AFC East", tagline: "Gillette Stadium · AFC East", logo: "/team-images/NE-logo.png", altLogo: "/team-images/NE-circle-logo.png", heroPlayer: "/team-images/NE-huddle.png", legendPlayer: "/team-images/NE-grogan.png" },
  NO:  { name: "New Orleans Saints", city: "New Orleans", abbreviation: "NO", primary: "#D3BC8D", secondary: "#101820", textOnPrimary: "black", stadium: "Caesars Superdome", division: "NFC South", tagline: "Caesars Superdome · NFC South", logo: "/team-images/NO-logo.png", heroPlayer: "/team-images/NO-kamara-breeze.png", legendPlayer: "/team-images/NO-shaughnessy.png" },
  NYG: { name: "New York Giants", city: "New York", abbreviation: "NYG", primary: "#0B2265", secondary: "#A71930", textOnPrimary: "white", stadium: "MetLife Stadium", division: "NFC East", tagline: "MetLife Stadium · NFC East" },
  NYJ: { name: "New York Jets", city: "New York", abbreviation: "NYJ", primary: "#125740", secondary: "#000000", textOnPrimary: "white", stadium: "MetLife Stadium", division: "AFC East", tagline: "MetLife Stadium · AFC East" },
  PHI: { name: "Philadelphia Eagles", city: "Philadelphia", abbreviation: "PHI", primary: "#004C54", secondary: "#A5ACAF", textOnPrimary: "white", stadium: "Lincoln Financial Field", division: "NFC East", tagline: "Lincoln Financial Field · NFC East" },
  PIT: { name: "Pittsburgh Steelers", city: "Pittsburgh", abbreviation: "PIT", primary: "#FFB612", secondary: "#CC9200", textOnPrimary: "black", stadium: "Acrisure Stadium", division: "AFC North", tagline: "Acrisure Stadium · AFC North" },
  SF:  { name: "San Francisco 49ers", city: "San Francisco", abbreviation: "SF", primary: "#AA0000", secondary: "#B3995D", textOnPrimary: "white", stadium: "Levi's Stadium", division: "NFC West", tagline: "Levi's Stadium · NFC West" },
  SEA: { name: "Seattle Seahawks", city: "Seattle", abbreviation: "SEA", primary: "#002244", secondary: "#69BE28", textOnPrimary: "white", stadium: "Lumen Field", division: "NFC West", tagline: "Lumen Field · NFC West" },
  TB:  { name: "Tampa Bay Buccaneers", city: "Tampa", abbreviation: "TB", primary: "#D50A0A", secondary: "#FF7900", textOnPrimary: "white", stadium: "Raymond James Stadium", division: "NFC South", tagline: "Raymond James Stadium · NFC South" },
  TEN: { name: "Tennessee Titans", city: "Nashville", abbreviation: "TEN", primary: "#0C2340", secondary: "#4B92DB", textOnPrimary: "white", stadium: "Nissan Stadium", division: "AFC South", tagline: "Nissan Stadium · AFC South" },
  WAS: { name: "Washington Commanders", city: "Washington", abbreviation: "WAS", primary: "#5A1414", secondary: "#FFB612", textOnPrimary: "white", stadium: "Northwest Stadium", division: "NFC East", tagline: "Northwest Stadium · NFC East", logo: "/team-images/WAS-helmet.png", altLogo: "/team-images/WAS-arrow-helmet.png", heroPlayer: "/team-images/WAS-riggins.png", legendPlayer: "/team-images/WAS-hogs.png" },
};

export const DEFAULT_TEAM = "PIT";
export type TeamCode = keyof typeof NFL_TEAMS;

export function getTeamTheme(code: TeamCode | string | null | undefined): TeamTheme {
  const key = (code ?? DEFAULT_TEAM).toString().toUpperCase();
  return NFL_TEAMS[key as TeamCode] ?? NFL_TEAMS[DEFAULT_TEAM];
}
