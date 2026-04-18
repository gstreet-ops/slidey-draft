export const NFL_TEAMS = {
  ARI: { name: "Arizona Cardinals", primary: "#97233F", secondary: "#7A1B32", textOnPrimary: "white" },
  ATL: { name: "Atlanta Falcons", primary: "#A71930", secondary: "#8B1528", textOnPrimary: "white" },
  BAL: { name: "Baltimore Ravens", primary: "#241773", secondary: "#1D1260", textOnPrimary: "white" },
  BUF: { name: "Buffalo Bills", primary: "#00338D", secondary: "#002A73", textOnPrimary: "white" },
  CAR: { name: "Carolina Panthers", primary: "#0085CA", secondary: "#006BA1", textOnPrimary: "white" },
  CHI: { name: "Chicago Bears", primary: "#0B162A", secondary: "#C83803", textOnPrimary: "white" },
  CIN: { name: "Cincinnati Bengals", primary: "#FB4F14", secondary: "#D44210", textOnPrimary: "white" },
  CLE: { name: "Cleveland Browns", primary: "#FF3C00", secondary: "#D43300", textOnPrimary: "white" },
  DAL: { name: "Dallas Cowboys", primary: "#041E42", secondary: "#869397", textOnPrimary: "white" },
  DEN: { name: "Denver Broncos", primary: "#FB4F14", secondary: "#002244", textOnPrimary: "white" },
  DET: { name: "Detroit Lions", primary: "#0076B6", secondary: "#B0B7BC", textOnPrimary: "white" },
  GB:  { name: "Green Bay Packers", primary: "#203731", secondary: "#FFB612", textOnPrimary: "white" },
  HOU: { name: "Houston Texans", primary: "#03202F", secondary: "#A71930", textOnPrimary: "white" },
  IND: { name: "Indianapolis Colts", primary: "#002C5F", secondary: "#A2AAAD", textOnPrimary: "white" },
  JAX: { name: "Jacksonville Jaguars", primary: "#006778", secondary: "#D7A22A", textOnPrimary: "white" },
  KC:  { name: "Kansas City Chiefs", primary: "#E31837", secondary: "#FFB81C", textOnPrimary: "white" },
  LV:  { name: "Las Vegas Raiders", primary: "#A5ACAF", secondary: "#000000", textOnPrimary: "black" },
  LAC: { name: "Los Angeles Chargers", primary: "#0080C6", secondary: "#FFC20E", textOnPrimary: "white" },
  LAR: { name: "Los Angeles Rams", primary: "#003594", secondary: "#FFA300", textOnPrimary: "white" },
  MIA: { name: "Miami Dolphins", primary: "#008E97", secondary: "#FC4C02", textOnPrimary: "white" },
  MIN: { name: "Minnesota Vikings", primary: "#4F2683", secondary: "#FFC62F", textOnPrimary: "white" },
  NE:  { name: "New England Patriots", primary: "#002244", secondary: "#C60C30", textOnPrimary: "white" },
  NO:  { name: "New Orleans Saints", primary: "#D3BC8D", secondary: "#101820", textOnPrimary: "black" },
  NYG: { name: "New York Giants", primary: "#0B2265", secondary: "#A71930", textOnPrimary: "white" },
  NYJ: { name: "New York Jets", primary: "#125740", secondary: "#000000", textOnPrimary: "white" },
  PHI: { name: "Philadelphia Eagles", primary: "#004C54", secondary: "#A5ACAF", textOnPrimary: "white" },
  PIT: { name: "Pittsburgh Steelers", primary: "#FFB612", secondary: "#CC9200", textOnPrimary: "black" },
  SF:  { name: "San Francisco 49ers", primary: "#AA0000", secondary: "#B3995D", textOnPrimary: "white" },
  SEA: { name: "Seattle Seahawks", primary: "#002244", secondary: "#69BE28", textOnPrimary: "white" },
  TB:  { name: "Tampa Bay Buccaneers", primary: "#D50A0A", secondary: "#FF7900", textOnPrimary: "white" },
  TEN: { name: "Tennessee Titans", primary: "#0C2340", secondary: "#4B92DB", textOnPrimary: "white" },
  WAS: { name: "Washington Commanders", primary: "#5A1414", secondary: "#FFB612", textOnPrimary: "white" },
} as const;

export const DEFAULT_TEAM = "PIT";

export type TeamCode = keyof typeof NFL_TEAMS;

export function getTeamTheme(code: TeamCode | string | null | undefined) {
  if (code && code in NFL_TEAMS) {
    return NFL_TEAMS[code as TeamCode];
  }
  return NFL_TEAMS[DEFAULT_TEAM];
}
