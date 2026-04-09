import { db } from "./index";
import { triviaQuestions, triviaResponses } from "./schema";

const questions = [
  // ── EASY (5) — well-known draft facts ───────────────────────────────────────
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
    question: "Which team held the #1 overall pick in the 2021 NFL Draft and selected Trevor Lawrence?",
    optionA: "New York Jets",
    optionB: "Jacksonville Jaguars",
    optionC: "Cincinnati Bengals",
    optionD: "Atlanta Falcons",
    correctOption: "b",
    category: "draft_history",
    difficulty: "easy",
  },
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
    question: "What is the standard distance of the 40-yard dash measured at the NFL Combine?",
    optionA: "36 yards",
    optionB: "40 yards",
    optionC: "44 yards",
    optionD: "50 yards",
    correctOption: "b",
    category: "combine",
    difficulty: "easy",
  },

  // ── MEDIUM (5) — requires some draft knowledge ───────────────────────────────
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
    question: "At the 2024 NFL Combine, which receiver ran a 4.21 40-yard dash, setting a new combine record?",
    optionA: "Malik Nabers",
    optionB: "Brian Thomas Jr.",
    optionC: "Xavier Worthy",
    optionD: "Marvin Harrison Jr.",
    correctOption: "c",
    category: "combine",
    difficulty: "medium",
  },

  // ── HARD (5) — deep draft trivia ─────────────────────────────────────────────
  {
    question: "Bo Jackson was famously drafted first overall in 1986 by which team, but refused to play for them?",
    optionA: "Houston Oilers",
    optionB: "Dallas Cowboys",
    optionC: "Tampa Bay Buccaneers",
    optionD: "Los Angeles Rams",
    correctOption: "c",
    category: "draft_history",
    difficulty: "hard",
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
  {
    question: "In 2021, the San Francisco 49ers traded three first-round picks to move up to #3 overall to eventually select Trey Lance. Which team traded down?",
    optionA: "Atlanta Falcons",
    optionB: "Jacksonville Jaguars",
    optionC: "Miami Dolphins",
    optionD: "New York Jets",
    correctOption: "a",
    category: "trades",
    difficulty: "hard",
  },
  {
    question: "Which team famously traded away multiple first-round picks in 1999 — including picks the Cleveland Browns used to re-enter the league — in exchange for the right to select Ricky Williams?",
    optionA: "Washington Redskins",
    optionB: "Dallas Cowboys",
    optionC: "New Orleans Saints",
    optionD: "Minnesota Vikings",
    correctOption: "c",
    category: "trades",
    difficulty: "hard",
  },
  {
    question: "John Ross set the NFL Combine 40-yard dash record in 2017 with a time of 4.22 seconds. Which position did he play?",
    optionA: "Running Back",
    optionB: "Cornerback",
    optionC: "Wide Receiver",
    optionD: "Safety",
    correctOption: "c",
    category: "combine",
    difficulty: "hard",
  },
];

async function main() {
  console.log("Deleting existing trivia responses...");
  await db.delete(triviaResponses);
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
