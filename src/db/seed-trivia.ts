import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

type SeedQuestion = {
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
  difficulty: "easy" | "medium" | "hard";
};

const questions: SeedQuestion[] = [
  // ── NFL History (12) ──────────────────────────────
  {
    question: "Who was the first overall pick in the 2024 NFL Draft?",
    options: ["Caleb Williams", "Jayden Daniels", "Drake Maye", "JJ McCarthy"],
    correctAnswer: 0,
    category: "nfl_history",
    difficulty: "easy",
  },
  {
    question: "Which team drafted Patrick Mahomes in 2017?",
    options: ["Kansas City Chiefs", "Chicago Bears", "Houston Texans", "Cleveland Browns"],
    correctAnswer: 0,
    category: "nfl_history",
    difficulty: "easy",
  },
  {
    question: "Who holds the record for most career touchdown passes?",
    options: ["Tom Brady", "Peyton Manning", "Drew Brees", "Brett Favre"],
    correctAnswer: 0,
    category: "nfl_history",
    difficulty: "easy",
  },
  {
    question: "Which quarterback was drafted 199th overall in the 2000 NFL Draft?",
    options: ["Tom Brady", "Chad Pennington", "Marc Bulger", "Tee Martin"],
    correctAnswer: 0,
    category: "nfl_history",
    difficulty: "medium",
  },
  {
    question: "What year did the NFL merge with the AFL?",
    options: ["1970", "1966", "1972", "1968"],
    correctAnswer: 0,
    category: "nfl_history",
    difficulty: "hard",
  },
  {
    question: "Who was the first player drafted in NFL history (1936)?",
    options: ["Jay Berwanger", "Riley Smith", "Sam Francis", "Joe Stydahar"],
    correctAnswer: 0,
    category: "nfl_history",
    difficulty: "hard",
  },
  {
    question: "Which team has won the most Super Bowls?",
    options: ["New England Patriots", "Pittsburgh Steelers", "San Francisco 49ers", "Dallas Cowboys"],
    correctAnswer: 0,
    category: "nfl_history",
    difficulty: "easy",
  },
  {
    question: "Who caught the 'Immaculate Reception' in 1972?",
    options: ["Franco Harris", "Lynn Swann", "John Stallworth", "Rocky Bleier"],
    correctAnswer: 0,
    category: "nfl_history",
    difficulty: "medium",
  },
  {
    question: "What is the most points scored in a single NFL game by one team?",
    options: ["73", "72", "66", "62"],
    correctAnswer: 0,
    category: "nfl_history",
    difficulty: "hard",
  },
  {
    question: "Which team went 0-16 in the 2008 season?",
    options: ["Detroit Lions", "Cleveland Browns", "Tampa Bay Buccaneers", "Jacksonville Jaguars"],
    correctAnswer: 0,
    category: "nfl_history",
    difficulty: "medium",
  },
  {
    question: "Who is the NFL's all-time leading rusher?",
    options: ["Emmitt Smith", "Walter Payton", "Barry Sanders", "Frank Gore"],
    correctAnswer: 0,
    category: "nfl_history",
    difficulty: "easy",
  },
  {
    question: "In what year was the first Super Bowl played?",
    options: ["1967", "1966", "1968", "1965"],
    correctAnswer: 0,
    category: "nfl_history",
    difficulty: "medium",
  },

  // ── Draft Trivia (10) ─────────────────────────────
  {
    question: "How many rounds are in the current NFL Draft?",
    options: ["7", "6", "8", "5"],
    correctAnswer: 0,
    category: "draft_trivia",
    difficulty: "easy",
  },
  {
    question: "Which team traded up to draft RG3 second overall in 2012?",
    options: ["Washington Redskins", "Cleveland Browns", "St. Louis Rams", "Minnesota Vikings"],
    correctAnswer: 0,
    category: "draft_trivia",
    difficulty: "medium",
  },
  {
    question: "Who was the last running back taken first overall?",
    options: ["Saquon Barkley (2018)", "Todd Gurley (2015)", "Ezekiel Elliott (2016)", "Leonard Fournette (2017)"],
    correctAnswer: 0,
    category: "draft_trivia",
    difficulty: "medium",
  },
  {
    question: "What position has been drafted first overall the most times?",
    options: ["Quarterback", "Running Back", "Defensive End", "Offensive Tackle"],
    correctAnswer: 0,
    category: "draft_trivia",
    difficulty: "medium",
  },
  {
    question: "Which city hosted the 2024 NFL Draft?",
    options: ["Detroit", "Kansas City", "Nashville", "Las Vegas"],
    correctAnswer: 0,
    category: "draft_trivia",
    difficulty: "easy",
  },
  {
    question: "Ryan Leaf was drafted 2nd overall in 1998. Which team selected him?",
    options: ["San Diego Chargers", "Arizona Cardinals", "Chicago Bears", "Oakland Raiders"],
    correctAnswer: 0,
    category: "draft_trivia",
    difficulty: "medium",
  },
  {
    question: "Which college has produced the most first-overall NFL Draft picks?",
    options: ["USC", "Oklahoma", "Stanford", "Alabama"],
    correctAnswer: 0,
    category: "draft_trivia",
    difficulty: "hard",
  },
  {
    question: "How many quarterbacks were taken in the first round of the 2018 draft?",
    options: ["5", "4", "3", "6"],
    correctAnswer: 0,
    category: "draft_trivia",
    difficulty: "hard",
  },
  {
    question: "What is the NFL Draft's 'Mr. Irrelevant' award given to?",
    options: ["The last player drafted", "The first undrafted free agent signed", "The lowest-graded first-rounder", "The oldest player drafted"],
    correctAnswer: 0,
    category: "draft_trivia",
    difficulty: "easy",
  },
  {
    question: "Which team had the most first-round picks in the 2023 NFL Draft?",
    options: ["Houston Texans", "Detroit Lions", "Chicago Bears", "Philadelphia Eagles"],
    correctAnswer: 0,
    category: "draft_trivia",
    difficulty: "hard",
  },

  // ── Team Trivia (8) ───────────────────────────────
  {
    question: "Which NFL team's home stadium is at the highest elevation?",
    options: ["Denver Broncos", "Arizona Cardinals", "Las Vegas Raiders", "Tennessee Titans"],
    correctAnswer: 0,
    category: "team_trivia",
    difficulty: "medium",
  },
  {
    question: "Which NFL franchise was originally called the 'Decatur Staleys'?",
    options: ["Chicago Bears", "Green Bay Packers", "Arizona Cardinals", "Detroit Lions"],
    correctAnswer: 0,
    category: "team_trivia",
    difficulty: "hard",
  },
  {
    question: "Which team has the longest active playoff drought?",
    options: ["New York Jets", "Denver Broncos", "New Orleans Saints", "Las Vegas Raiders"],
    correctAnswer: 0,
    category: "team_trivia",
    difficulty: "medium",
  },
  {
    question: "What color is the Green Bay Packers' 'G' logo?",
    options: ["White", "Yellow", "Green", "Gold"],
    correctAnswer: 0,
    category: "team_trivia",
    difficulty: "easy",
  },
  {
    question: "Which team plays its home games at SoFi Stadium?",
    options: ["Los Angeles Rams & Chargers", "Las Vegas Raiders", "San Francisco 49ers", "Arizona Cardinals"],
    correctAnswer: 0,
    category: "team_trivia",
    difficulty: "easy",
  },
  {
    question: "The 'Terrible Towel' is associated with which franchise?",
    options: ["Pittsburgh Steelers", "Cleveland Browns", "Baltimore Ravens", "Cincinnati Bengals"],
    correctAnswer: 0,
    category: "team_trivia",
    difficulty: "easy",
  },
  {
    question: "Which NFL team has never appeared in a Super Bowl?",
    options: ["Cleveland Browns", "Houston Texans", "Jacksonville Jaguars", "All of the above"],
    correctAnswer: 3,
    category: "team_trivia",
    difficulty: "medium",
  },
  {
    question: "What year did the Houston Texans join the NFL as an expansion team?",
    options: ["2002", "2000", "2004", "1999"],
    correctAnswer: 0,
    category: "team_trivia",
    difficulty: "medium",
  },

  // ── Prospects (5) ─────────────────────────────────
  {
    question: "What position does the typical NFL Combine's fastest 40-yard dash come from?",
    options: ["Wide Receiver", "Cornerback", "Running Back", "Safety"],
    correctAnswer: 0,
    category: "prospects",
    difficulty: "medium",
  },
  {
    question: "The Wonderlic test given at the NFL Combine has how many questions?",
    options: ["50", "25", "75", "100"],
    correctAnswer: 0,
    category: "prospects",
    difficulty: "hard",
  },
  {
    question: "What does 'RAS' stand for in draft prospect evaluation?",
    options: ["Relative Athletic Score", "Ranked Athletic Stat", "Raw Ability Score", "Recruit Analysis System"],
    correctAnswer: 0,
    category: "prospects",
    difficulty: "hard",
  },
  {
    question: "Chris Johnson's famous 4.24 second 40-yard dash was run at the Combine in what year?",
    options: ["2008", "2007", "2009", "2006"],
    correctAnswer: 0,
    category: "prospects",
    difficulty: "hard",
  },
  {
    question: "Which drill at the NFL Combine tests a player's lateral agility?",
    options: ["3-cone drill", "40-yard dash", "Broad jump", "Bench press"],
    correctAnswer: 0,
    category: "prospects",
    difficulty: "easy",
  },

  // ── Sports General (10) ───────────────────────────
  {
    question: "How many players are on an NFL team's active game-day roster?",
    options: ["48", "46", "53", "45"],
    correctAnswer: 0,
    category: "sports_general",
    difficulty: "medium",
  },
  {
    question: "Which sport's championship trophy is called the 'Larry O'Brien Trophy'?",
    options: ["NBA", "NFL", "NHL", "MLS"],
    correctAnswer: 0,
    category: "sports_general",
    difficulty: "easy",
  },
  {
    question: "How long is an NFL football field (end zone to end zone)?",
    options: ["120 yards", "100 yards", "110 yards", "130 yards"],
    correctAnswer: 0,
    category: "sports_general",
    difficulty: "easy",
  },
  {
    question: "Which country has won the most FIFA World Cup titles?",
    options: ["Brazil", "Germany", "Italy", "Argentina"],
    correctAnswer: 0,
    category: "sports_general",
    difficulty: "easy",
  },
  {
    question: "What is the diameter of a basketball hoop in inches?",
    options: ["18 inches", "16 inches", "20 inches", "17 inches"],
    correctAnswer: 0,
    category: "sports_general",
    difficulty: "medium",
  },
  {
    question: "In baseball, what is a 'perfect game'?",
    options: ["No batter reaches base for the entire game", "A no-hitter with no walks", "A shutout with 10+ strikeouts", "Winning by 10 or more runs"],
    correctAnswer: 0,
    category: "sports_general",
    difficulty: "medium",
  },
  {
    question: "How many periods are in a regulation NHL hockey game?",
    options: ["3", "4", "2", "5"],
    correctAnswer: 0,
    category: "sports_general",
    difficulty: "easy",
  },
  {
    question: "Which boxer was known as 'The Greatest'?",
    options: ["Muhammad Ali", "Mike Tyson", "Sugar Ray Leonard", "Floyd Mayweather"],
    correctAnswer: 0,
    category: "sports_general",
    difficulty: "easy",
  },
  {
    question: "What is the only Grand Slam tennis tournament played on clay?",
    options: ["French Open", "Australian Open", "US Open", "Wimbledon"],
    correctAnswer: 0,
    category: "sports_general",
    difficulty: "medium",
  },
  {
    question: "How many laps are in the Indianapolis 500?",
    options: ["200", "500", "100", "250"],
    correctAnswer: 0,
    category: "sports_general",
    difficulty: "medium",
  },

  // ── Pop Culture (5) ───────────────────────────────
  {
    question: "Which movie features the fictional football team the 'Mud Dogs'?",
    options: ["The Waterboy", "The Longest Yard", "Remember the Titans", "Any Given Sunday"],
    correctAnswer: 0,
    category: "pop_culture",
    difficulty: "medium",
  },
  {
    question: "What TV show follows the fictional Dillon Panthers football team?",
    options: ["Friday Night Lights", "All American", "The Game", "Ballers"],
    correctAnswer: 0,
    category: "pop_culture",
    difficulty: "easy",
  },
  {
    question: "In 'The Blind Side', which real NFL player's life story is depicted?",
    options: ["Michael Oher", "Tim Tebow", "Vince Young", "Reggie Bush"],
    correctAnswer: 0,
    category: "pop_culture",
    difficulty: "easy",
  },
  {
    question: "Which rapper performed at the Super Bowl LVIII halftime show (2024)?",
    options: ["Usher", "Rihanna", "Drake", "Kendrick Lamar"],
    correctAnswer: 0,
    category: "pop_culture",
    difficulty: "easy",
  },
  {
    question: "Which video game franchise features 'Franchise Mode' for managing NFL teams?",
    options: ["Madden NFL", "NFL 2K", "Tecmo Bowl", "Backyard Football"],
    correctAnswer: 0,
    category: "pop_culture",
    difficulty: "easy",
  },

  // ── General Knowledge (5) ─────────────────────────
  {
    question: "What is the most-watched annual television broadcast in the United States?",
    options: ["The Super Bowl", "The Oscars", "The World Series", "New Year's Eve countdown"],
    correctAnswer: 0,
    category: "general_knowledge",
    difficulty: "easy",
  },
  {
    question: "How many time zones does the continental United States span?",
    options: ["4", "3", "5", "6"],
    correctAnswer: 0,
    category: "general_knowledge",
    difficulty: "easy",
  },
  {
    question: "What does 'NFL' stand for?",
    options: ["National Football League", "National Football Lineup", "National Field League", "National Football Leaders"],
    correctAnswer: 0,
    category: "general_knowledge",
    difficulty: "easy",
  },
  {
    question: "In what month does the NFL Draft typically take place?",
    options: ["April", "March", "May", "June"],
    correctAnswer: 0,
    category: "general_knowledge",
    difficulty: "easy",
  },
  {
    question: "What city is known as 'The Big Easy' and has hosted multiple Super Bowls?",
    options: ["New Orleans", "Las Vegas", "Miami", "Los Angeles"],
    correctAnswer: 0,
    category: "general_knowledge",
    difficulty: "easy",
  },
];

async function seed() {
  console.log(`Seeding ${questions.length} trivia questions...`);

  for (const q of questions) {
    await db.insert(schema.triviaQuestions).values({
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      category: q.category,
      difficulty: q.difficulty,
      active: true,
      createdBy: null,
    });
  }

  console.log(`Seeded ${questions.length} questions.`);
}

seed().catch(console.error);
