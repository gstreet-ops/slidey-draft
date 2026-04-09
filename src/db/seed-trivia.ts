import { db } from "./index";
import { triviaQuestions } from "./schema";

const questions = [
  // ── draft_history (8) ────────────────────────────
  {
    question: "Who was the #1 overall pick in the 2024 NFL Draft?",
    optionA: "Caleb Williams",
    optionB: "Jayden Daniels",
    optionC: "Drake Maye",
    optionD: "Marvin Harrison Jr.",
    correctOption: "a",
    category: "draft_history",
    difficulty: "easy",
  },
  {
    question: "Which player was selected #1 overall in the 2023 NFL Draft?",
    optionA: "C.J. Stroud",
    optionB: "Bryce Young",
    optionC: "Anthony Richardson",
    optionD: "Will Anderson Jr.",
    correctOption: "b",
    category: "draft_history",
    difficulty: "easy",
  },
  {
    question: "Bo Jackson was famously drafted first overall in 1986 by which team, but refused to play for them?",
    optionA: "Houston Oilers",
    optionB: "Dallas Cowboys",
    optionC: "Tampa Bay Buccaneers",
    optionD: "Los Angeles Rams",
    correctOption: "c",
    category: "draft_history",
    difficulty: "medium",
  },
  {
    question: "Tom Brady was selected in which round of the 2000 NFL Draft?",
    optionA: "4th round",
    optionB: "5th round",
    optionC: "6th round",
    optionD: "7th round",
    correctOption: "c",
    category: "draft_history",
    difficulty: "medium",
  },
  {
    question: "Which quarterback was selected #1 overall in the 1998 NFL Draft, ahead of Peyton Manning?",
    optionA: "Ryan Leaf",
    optionB: "Peyton Manning",
    optionC: "Tim Couch",
    optionD: "Akili Smith",
    correctOption: "b",
    category: "draft_history",
    difficulty: "hard",
  },
  {
    question: "Who holds the record for most NFL Draft picks selected from a single college in one draft class (13 players, 1979)?",
    optionA: "Alabama",
    optionB: "USC",
    optionC: "Ohio State",
    optionD: "Oklahoma",
    correctOption: "b",
    category: "draft_history",
    difficulty: "hard",
  },
  {
    question: "Patrick Mahomes was drafted by the Kansas City Chiefs in the 2017 NFL Draft with which pick number?",
    optionA: "7th overall",
    optionB: "10th overall",
    optionC: "14th overall",
    optionD: "20th overall",
    correctOption: "b",
    category: "draft_history",
    difficulty: "medium",
  },
  {
    question: "Which team held the #1 overall pick in the 2021 NFL Draft and selected Trevor Lawrence?",
    optionA: "New York Jets",
    optionB: "Jacksonville Jaguars",
    optionC: "Cincinnati Bengals",
    optionD: "Atlanta Falcons",
    correctOption: "b",
    category: "draft_history",
    difficulty: "easy",
  },

  // ── combine (4) ──────────────────────────────────
  {
    question: "Who holds the NFL Combine record for the fastest 40-yard dash time, running a 4.22 seconds in 2023?",
    optionA: "Tyreek Hill",
    optionB: "John Ross",
    optionC: "Bo Jackson",
    optionD: "Jerome Mathis",
    correctOption: "b",
    category: "combine",
    difficulty: "hard",
  },
  {
    question: "At the 2024 NFL Combine, which receiver ran a 4.24 40-yard dash, the fastest time at the event that year?",
    optionA: "Malik Nabers",
    optionB: "Brian Thomas Jr.",
    optionC: "Xavier Worthy",
    optionD: "Marvin Harrison Jr.",
    correctOption: "c",
    category: "combine",
    difficulty: "medium",
  },
  {
    question: "What is the standard distance of the 40-yard dash measured at the NFL Combine?",
    optionA: "36 yards",
    optionB: "40 yards",
    optionC: "44 yards",
    optionD: "50 yards",
    correctOption: "b",
    category: "combine",
    difficulty: "easy",
  },
  {
    question: "The broad jump at the NFL Combine measures which athletic attribute?",
    optionA: "Vertical leap height",
    optionB: "Horizontal explosive power",
    optionC: "Sprint acceleration",
    optionD: "Change-of-direction speed",
    correctOption: "b",
    category: "combine",
    difficulty: "medium",
  },

  // ── trades (4) ───────────────────────────────────
  {
    question: "In 2016, the Los Angeles Rams traded up to #1 overall to draft Jared Goff, giving up multiple picks to which team?",
    optionA: "Cleveland Browns",
    optionB: "Tennessee Titans",
    optionC: "San Francisco 49ers",
    optionD: "Philadelphia Eagles",
    correctOption: "b",
    category: "trades",
    difficulty: "medium",
  },
  {
    question: "The Philadelphia Eagles traded up to #2 overall in 2016 to select Carson Wentz, acquiring the pick from which team?",
    optionA: "Cleveland Browns",
    optionB: "San Francisco 49ers",
    optionC: "Tennessee Titans",
    optionD: "Chicago Bears",
    correctOption: "a",
    category: "trades",
    difficulty: "medium",
  },
  {
    question: "In 2021, the San Francisco 49ers traded three first-round picks to move up to #3 overall, eventually selecting Trey Lance. Which team traded down?",
    optionA: "Atlanta Falcons",
    optionB: "Jacksonville Jaguars",
    optionC: "Miami Dolphins",
    optionD: "New York Jets",
    correctOption: "a",
    category: "trades",
    difficulty: "hard",
  },
  {
    question: "Which team famously traded the #1 overall pick in 1999 to Cleveland — a deal that helped the Browns re-enter the league — allowing them to select Ricky Williams?",
    optionA: "New Orleans Saints",
    optionB: "Cleveland Browns",
    optionC: "Washington Redskins",
    optionD: "Dallas Cowboys",
    correctOption: "a",
    category: "trades",
    difficulty: "hard",
  },

  // ── general (4) ──────────────────────────────────
  {
    question: "How many rounds are in the modern NFL Draft?",
    optionA: "5",
    optionB: "6",
    optionC: "7",
    optionD: "8",
    correctOption: "c",
    category: "general",
    difficulty: "easy",
  },
  {
    question: "How many minutes does each team in the first round have to submit their pick at the NFL Draft?",
    optionA: "5 minutes",
    optionB: "10 minutes",
    optionC: "15 minutes",
    optionD: "20 minutes",
    correctOption: "b",
    category: "general",
    difficulty: "medium",
  },
  {
    question: "What is a 'compensatory pick' in the NFL Draft?",
    optionA: "A pick awarded after a team loses a starter to injury",
    optionB: "A pick awarded to teams that lost more free agents than they signed",
    optionC: "A pick given to expansion franchises",
    optionD: "A pick earned by finishing last in the league",
    correctOption: "b",
    category: "general",
    difficulty: "medium",
  },
  {
    question: "In what year was the first NFL Draft held?",
    optionA: "1930",
    optionB: "1936",
    optionC: "1941",
    optionD: "1945",
    correctOption: "b",
    category: "general",
    difficulty: "hard",
  },
];

async function main() {
  console.log("Deleting existing trivia questions...");
  await db.delete(triviaQuestions);

  console.log(`Inserting ${questions.length} trivia questions...`);
  await db.insert(triviaQuestions).values(questions);

  // Verify
  const rows = await db.select().from(triviaQuestions);
  console.log(`Done. ${rows.length} questions now in database.`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
