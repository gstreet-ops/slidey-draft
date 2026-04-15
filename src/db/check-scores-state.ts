import { db } from "./index";
import { draftBoards, scores } from "./schema";

async function main() {
  const boards = await db.select({ id: draftBoards.id, title: draftBoards.title }).from(draftBoards);
  console.log("Boards:", boards);
  const s = await db.select().from(scores);
  console.log("Scores:", s);
  process.exit(0);
}
main();
