import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL!;
const sqlClient = neon(DATABASE_URL);
const db = drizzle(sqlClient, { schema });

// ── 2026 NFL Draft Prospect Pool (Updated April 2026) ──────────────
// Sources: Daniel Jeremiah Top 50 (NFL.com 4.0), ESPN Scouts Inc.,
// PFF Big Board, CBS Sports, Bleacher Report
//
// This replaces the old 2025 prospect data.

const PROSPECTS_2026 = [
  {
    name: "Fernando Mendoza",
    position: "QB",
    school: "Indiana",
    height: "6-3",
    weight: 220,
    notes: "Consensus #1 overall pick. Heisman Trophy winner. Transferred from Cal to Indiana in 2025 and led Hoosiers to a national championship. Exceptional anticipation, accuracy and poise. Good but not elite arm — wins with timing and decision-making. Limited under-center experience. Projects as a longtime high-level NFL starter.",
  },
  {
    name: "Jeremiyah Love",
    position: "RB",
    school: "Notre Dame",
    height: "5-11",
    weight: 210,
    notes: "Highest NGS overall draft score (96) of any player in this class and the top mark among RBs in 24 years. Elite speed, vision, and burst through the hole. Dynamic in open space. Reliable pass catcher out of the backfield. Projected top-5 pick — rare value for a running back.",
  },
  {
    name: "Arvell Reese",
    position: "LB",
    school: "Ohio State",
    height: "6-3",
    weight: 240,
    notes: "Arguably the best prospect in the class. Drew Micah Parsons comparisons for his athleticism, versatility and career trajectory. Starred as an off-ball LB at Ohio State but has the twitch to rush the edge. Elite athlete with exceptional strength. Still developing in coverage but has All-Pro tools.",
  },
  {
    name: "David Bailey",
    position: "EDGE",
    school: "Texas Tech",
    height: "6-3",
    weight: 250,
    notes: "Best pure pass rusher in the class. Terrific blend of burst, lateral agility and core flexibility. Wins with elite get-off and a devastating dip/rip move, complemented by a sudden inside spin. At 250 lbs, lacks size for run defense but his pass-rush ability is special.",
  },
  {
    name: "Sonny Styles",
    position: "LB",
    school: "Ohio State",
    height: "6-4",
    weight: 230,
    notes: "Tall, long and rangy LB who transitioned smoothly from safety. Quick to key, read and fill against the run. Uses length to press off blocks with outstanding lateral range. Excellent in coverage — carries slot receivers down the seam, mirrors tight ends, explosive as a blitzer. Projected top-5 pick.",
  },
  {
    name: "Rueben Bain Jr.",
    position: "EDGE",
    school: "Miami",
    height: "6-2",
    weight: 255,
    notes: "Thick, square edge rusher whose tape is littered with disruption and dominance. Wins with leverage, power and polish — nasty chop/rip, violent hump move and nifty Euro step. Ragdolls TEs against the run with a relentless motor. Short arms but it hasn't slowed him down.",
  },
  {
    name: "Makai Lemon",
    position: "WR",
    school: "USC",
    height: "5-11",
    weight: 195,
    notes: "First-round WR talent with the characteristics teams covet: toughness, strong hands, and elite YAC ability. Wins contested catches despite being under 6 feet. Physical player who fights for extra yards. Reportedly interviewed poorly at the combine but the tape speaks for itself.",
  },
  {
    name: "Mansoor Delane",
    position: "CB",
    school: "LSU",
    height: "6-1",
    weight: 190,
    notes: "One of the most consistent players on tape in this class. Extremely loose and fluid in his change of direction. Adept at press coverage — re-routes and mirrors receivers all over the field. In zone, plays with elite instincts. Physical and reliable tackler in run support. Racing Jermod McCoy for CB1.",
  },
  {
    name: "Carnell Tate",
    position: "WR",
    school: "Ohio State",
    height: "6-2",
    weight: 195,
    notes: "The #1 WR in the class. One of the highest floors among true juniors thanks to strong hands and a consistently reliable track record. Route running and releases are already NFL-caliber. Dependable blocker. Complete receiver who should contribute immediately at the next level.",
  },
  {
    name: "Caleb Downs",
    position: "S",
    school: "Ohio State",
    height: "6-0",
    weight: 200,
    notes: "Shined at both Alabama and Ohio State. Elite instincts, closing speed and reliable open-field tackling. Football IQ is exceptional — gives him a high floor and ceiling with All-Pro potential. Lacks elite size or athletic traits but his processing speed more than compensates. Foundational defensive piece.",
  },
  {
    name: "Olaivavega Ioane",
    position: "IOL",
    school: "Penn State",
    height: "6-4",
    weight: 330,
    notes: "The best offensive lineman in the draft regardless of position. Only guard with a true first-round grade. Pro-ready interior OL who should be a plug-and-play starter on either side. As a pure guard, he won't be the first OL drafted but he's the most complete.",
  },
  {
    name: "Spencer Fano",
    position: "OT",
    school: "Utah",
    height: "6-5",
    weight: 305,
    notes: "The 'positionless' lineman NFL teams covet. Has played tackle at Utah but his best position may be guard at the next level. Extremely versatile — can line up anywhere on the OL. Physical mauler in the run game with quick feet in pass pro. Top-20 overall prospect.",
  },
  {
    name: "Francis Mauigoa",
    position: "OT",
    school: "Miami",
    height: "6-5",
    weight: 320,
    notes: "Decade-long anchor at right tackle. Well-built, well-rounded with a high floor as a projected starter. Brings power in the run game and quick feet in pass protection. Faced elite Miami pass rush daily in practice. Ceiling may be limited by average length and kick-slide ability.",
  },
  {
    name: "Jermod McCoy",
    position: "CB",
    school: "Tennessee",
    height: "6-1",
    weight: 190,
    notes: "Racing Mansoor Delane for CB1 honors in this class. Top-15 prospect with elite ball skills and coverage ability. Physical in press, fluid in transition, and a playmaker on the ball. One of the most buzzed-about prospects heading into draft week.",
  },
  {
    name: "Jordyn Tyson",
    position: "WR",
    school: "Arizona State",
    height: "6-0",
    weight: 195,
    notes: "Smooth and nuanced route runner who understands how to manipulate defensive leverage. Excels at using tempo to get DBs off balance and create separation. Can struggle against physical coverage and injury history is a concern, but likely one of the first WRs selected.",
  },
  {
    name: "Colton Hood",
    position: "CB",
    school: "Tennessee",
    height: "6-1",
    weight: 195,
    notes: "Big riser in recent rankings. Tennessee's second CB prospect in the first round alongside McCoy. Physical, long corner with press-man skills. Combine performance boosted his stock significantly. Projects as an early starter with scheme versatility.",
  },
  {
    name: "Cashius Howell",
    position: "EDGE",
    school: "Texas A&M",
    height: "6-4",
    weight: 260,
    notes: "Likely first-round edge rusher with an explosive first step and powerful bull rush. Uses his length to keep offensive tackles at bay. Effective in the run game as a run-and-chase defender. Combines size, speed and motor in a complete edge package.",
  },
  {
    name: "Akheem Mesidor",
    position: "EDGE",
    school: "Miami",
    height: "6-3",
    weight: 260,
    notes: "Versatile defensive end who can line up inside or outside. Explosive off the snap with a violent hands-first approach. Strong against the run and provides pass-rush upside from multiple alignments. Miami's defensive line factory continues to produce NFL talent.",
  },
  {
    name: "Emmanuel McNeil-Warren",
    position: "S",
    school: "Toledo",
    height: "6-2",
    weight: 210,
    notes: "Best run-stopping safety in the class. Rising star from a smaller program — increasing first-round buzz. Physical enforcer who plays bigger than his frame. Ball hawk with excellent instincts in zone coverage. Small-school prospect with big-time tools.",
  },
  {
    name: "Denzel Boston",
    position: "WR",
    school: "Washington",
    height: "6-3",
    weight: 210,
    notes: "Big, physical boundary receiver with a wide catch radius. Uses his size advantage to win contested catches and box out defenders. Smooth athlete for his frame. Developing as a route runner but his contested-catch ability and red zone presence are already elite.",
  },
  {
    name: "Omar Cooper Jr.",
    position: "WR",
    school: "Indiana",
    height: "6-0",
    weight: 190,
    notes: "Mendoza's favorite target at Indiana. Quick-twitch slot receiver with elite separation ability. Excellent route runner who eats up cushion. One of the best YAC receivers in the class. Rising stock — could be a top-25 pick after a dominant 2025 season.",
  },
  {
    name: "Kenyon Sadiq",
    position: "TE",
    school: "Oregon",
    height: "6-5",
    weight: 250,
    notes: "Consensus TE1 in the class. Rare combination of size, athleticism and receiving ability at the tight end position. Dangerous seam threat who can stretch the field vertically. Improving as a blocker. Should be an immediate mismatch weapon at the next level.",
  },
  {
    name: "Monroe Freeling",
    position: "OT",
    school: "Georgia",
    height: "6-6",
    weight: 315,
    notes: "Elite offensive tackle prospect with prototypical size and length. Smooth mover in pass protection with strong anchor. Georgia's pipeline of NFL tackles continues. Projects as a day-one starter at left or right tackle. Top-20 overall prospect.",
  },
  {
    name: "Blake Miller",
    position: "OT",
    school: "Clemson",
    height: "6-6",
    weight: 310,
    notes: "Considered the 'most pro-ready' tackle in the class. Technically sound with consistent hand placement and footwork. May not have the highest ceiling but his floor is very high — projects as a reliable starter from day one. 3rd-ranked OT.",
  },
  {
    name: "Ty Simpson",
    position: "QB",
    school: "Alabama",
    height: "6-2",
    weight: 215,
    notes: "QB2 in the class behind Mendoza. Athletic quarterback with a live arm and dual-threat ability. Improved dramatically in 2025 under new Alabama coaching staff. Projected in the 20-40 pick range. Has the arm talent and mobility that NFL teams covet in modern QBs.",
  },
  {
    name: "Kadyn Proctor",
    position: "OT",
    school: "Alabama",
    height: "6-7",
    weight: 330,
    notes: "Massive tackle with rare size and length. Former 5-star recruit who has developed into a mauling run blocker. Still refining pass-pro technique but his physical tools are elite. Projects as a high-upside right tackle prospect.",
  },
  {
    name: "Oscar Delp",
    position: "TE",
    school: "Georgia",
    height: "6-5",
    weight: 245,
    notes: "Georgia's latest tight end weapon. Versatile receiver who can line up inline, in the slot or out wide. Fluid athlete with strong hands. Developing as a blocker but his receiving skills are polished. Could go Day 1 or early Day 2.",
  },
  {
    name: "Zachariah Branch",
    position: "WR",
    school: "Georgia",
    height: "5-10",
    weight: 180,
    notes: "Transferred from USC to Georgia. Electric playmaker with game-breaking speed and return ability. Dynamic after the catch with elite agility. Undersized but plays bigger than his frame. Potential top-20 pick as a speed/slot weapon.",
  },
  {
    name: "Jadarian Price",
    position: "RB",
    school: "Notre Dame",
    height: "5-10",
    weight: 205,
    notes: "Notre Dame's other elite back alongside Jeremiyah Love. Patient runner with excellent vision and cutback ability. Reliable pass catcher and blocker in pass protection. Complete back who projects as a Day 2 pick with starter upside.",
  },
  {
    name: "Anthony Hill Jr.",
    position: "LB",
    school: "Texas",
    height: "6-2",
    weight: 235,
    notes: "Physical, instinctive linebacker from Texas. Downhill run-stuffer with impressive closing speed. Improving in coverage and as a blitzer. Projects as a first-round pick and three-down linebacker at the next level.",
  },
  {
    name: "Kayden McDonald",
    position: "DT",
    school: "Ohio State",
    height: "6-3",
    weight: 310,
    notes: "Disruptive interior defender with a quick first step for his size. Collapses the pocket from the inside. Ohio State's defensive line development on full display. Rising prospect who has climbed into first-round territory after a dominant 2025.",
  },
  {
    name: "Peter Woods",
    position: "DT",
    school: "Clemson",
    height: "6-3",
    weight: 300,
    notes: "Explosive interior defensive lineman with rare athletic traits. Wins with quickness and leverage rather than sheer size. Versatile — can play 3-tech or nose. Disruptive against both the run and pass. First-round talent.",
  },
  {
    name: "Lee Hunter",
    position: "DT",
    school: "Texas Tech",
    height: "6-4",
    weight: 320,
    notes: "Massive, powerful nose tackle who commands double teams. Eats up blocks and frees up linebackers. Improving as a pass rusher with surprising quickness for his size. Transferred to Texas Tech and had a breakout season.",
  },
  {
    name: "Max Iheanachor",
    position: "OT",
    school: "Arizona State",
    height: "6-5",
    weight: 310,
    notes: "Athletic tackle prospect who has risen up boards after a strong combine. Quick feet and good lateral agility in pass pro. Still developing consistency but the physical tools project well. Late first-round to early second-round prospect.",
  },
  {
    name: "Avieon Terrell",
    position: "CB",
    school: "Clemson",
    height: "6-0",
    weight: 185,
    notes: "Smooth, technically sound corner from Clemson's talent factory. Excellent in man coverage with quick feet and fluid hips. Ball production is strong. Projects as a reliable outside corner at the next level.",
  },
  {
    name: "Caleb Banks",
    position: "DT",
    school: "Florida",
    height: "6-4",
    weight: 305,
    notes: "Long, athletic interior lineman with high upside. Disruptive at the point of attack with natural leverage. Still raw but the physical tools are impressive. Development pick with starter potential.",
  },
  {
    name: "Brandon Cisse",
    position: "CB",
    school: "South Carolina",
    height: "6-0",
    weight: 190,
    notes: "Instinctive corner with excellent ball skills. Playmaker in zone coverage who jumps routes and creates turnovers. Physical in run support. South Carolina's top defensive back prospect.",
  },
  {
    name: "Keionte Scott",
    position: "CB",
    school: "Miami",
    height: "6-1",
    weight: 190,
    notes: "Long, physical corner from Miami who thrives in press coverage. Uses his length to disrupt receivers at the line. Improving in off-man and zone concepts. Athletic traits project well to the NFL.",
  },
  {
    name: "Zion Young",
    position: "EDGE",
    school: "Missouri",
    height: "6-3",
    weight: 250,
    notes: "Explosive edge rusher with a motor that doesn't stop. Quick off the snap with developing pass-rush moves. Active against the run and pursues sideline to sideline. Day 2 prospect with starting upside.",
  },
  {
    name: "Malachi Lawrence",
    position: "EDGE",
    school: "UCF",
    height: "6-4",
    weight: 255,
    notes: "Long, athletic edge defender who has risen up boards. Uses his length and speed to threaten the edge. Developing power moves to complement his speed rush. Intriguing upside for a team looking for edge depth.",
  },
  {
    name: "Keylan Rutledge",
    position: "IOL",
    school: "Georgia Tech",
    height: "6-3",
    weight: 315,
    notes: "Physical interior lineman who anchors well against power. Tough, smart player who brings toughness in the run game. Projects as a starting guard at the next level. Solid fundamentals and technique.",
  },
  {
    name: "Antonio Williams",
    position: "WR",
    school: "Clemson",
    height: "6-1",
    weight: 200,
    notes: "Smooth route runner with reliable hands. Clemson's go-to receiver in critical moments. Good contested-catch ability and enough speed to threaten vertically. Complete receiver who should contribute early.",
  },
  {
    name: "R Mason Thomas",
    position: "EDGE",
    school: "Oklahoma",
    height: "6-3",
    weight: 250,
    notes: "Athletic edge rusher with explosive get-off. Speed-to-power conversion is improving. Active effort player who creates pressure consistently. Projects as a Day 2 edge with significant upside.",
  },
  {
    name: "Germie Bernard",
    position: "WR",
    school: "Alabama",
    height: "6-1",
    weight: 200,
    notes: "Alabama's top receiving threat. Physical downfield presence with strong hands and body control. Tracks the ball well and makes acrobatic catches. Projects as a reliable WR2/3 at the next level with WR1 upside.",
  },
  {
    name: "Jonah Coleman",
    position: "RB",
    school: "Washington",
    height: "5-10",
    weight: 215,
    notes: "Compact, powerful runner with excellent contact balance. Breaks tackles at a high rate and falls forward. Good short-area quickness. Reliable option on early downs with pass-catching upside.",
  },
  {
    name: "Emmett Johnson",
    position: "RB",
    school: "Nebraska",
    height: "5-11",
    weight: 210,
    notes: "Nebraska's feature back with a well-rounded skill set. Patient runner with good vision. Solid in pass protection and as a receiver. Consistent, reliable performer who does everything well.",
  },
  {
    name: "Eli Raridon",
    position: "TE",
    school: "Notre Dame",
    height: "6-6",
    weight: 250,
    notes: "Big-bodied tight end with excellent catch radius. Notre Dame's red zone weapon. Improving blocker who uses his size well at the point of attack. Could develop into a complete TE at the next level.",
  },
  {
    name: "Justin Joly",
    position: "TE",
    school: "NC State",
    height: "6-5",
    weight: 245,
    notes: "Athletic tight end prospect with receiving upside. Fluid mover who can stretch the seam and work the middle of the field. Developing as a blocker. Day 2 TE prospect with starting potential.",
  },
  {
    name: "Makai Lemon",
    position: "WR",
    school: "USC",
    height: "5-11",
    weight: 195,
    notes: "DUPLICATE — see primary entry above.",
  },
  {
    name: "KC Concepcion",
    position: "WR",
    school: "NC State",
    height: "6-0",
    weight: 195,
    notes: "Explosive playmaker with electric speed and after-the-catch ability. Big riser in recent rankings after combine performance. Can line up inside or outside. Game-breaking potential as a deep threat and gadget player.",
  },
  {
    name: "TJ Parker",
    position: "EDGE",
    school: "Clemson",
    height: "6-5",
    weight: 260,
    notes: "Long, athletic edge rusher from Clemson. Uses his length and explosiveness to win on the outside. Combine performance helped his stock. Projects as a versatile edge defender who can stand up or put his hand in the dirt.",
  },
];

// Remove the duplicate Makai Lemon entry
const UNIQUE_PROSPECTS = PROSPECTS_2026.filter(p => p.notes !== "DUPLICATE — see primary entry above.");

async function seedProspects2026() {
  console.log("🏈 Updating prospect pool to 2026 NFL Draft class...\n");

  // Clear old prospects that aren't referenced by any picks
  // First, get all player IDs that are referenced in picks or actual_results
  const referencedInPicks = await db.execute(sql`SELECT DISTINCT player_id FROM picks WHERE player_id IS NOT NULL`);
  const referencedInResults = await db.execute(sql`SELECT DISTINCT player_id FROM actual_results WHERE player_id IS NOT NULL`);

  const referencedIds = new Set<string>();
  for (const row of referencedInPicks.rows) {
    referencedIds.add(row.player_id as string);
  }
  for (const row of referencedInResults.rows) {
    referencedIds.add(row.player_id as string);
  }

  if (referencedIds.size > 0) {
    console.log(`  ⚠ ${referencedIds.size} players are referenced in existing picks/results — keeping those rows.`);
    console.log(`  Inserting new 2026 prospects alongside existing data.\n`);
  } else {
    console.log("  No existing picks reference old players — safe to clear and replace.\n");
    await db.execute(sql`DELETE FROM players`);
    console.log("  ✓ Old prospects cleared.\n");
  }

  // Insert new prospects
  const inserted = await db
    .insert(schema.players)
    .values(UNIQUE_PROSPECTS)
    .onConflictDoNothing()
    .returning();

  console.log(`  ✓ ${inserted.length} prospects inserted`);
  console.log("\n🎉 2026 prospect pool is ready for draft night!\n");

  // Print summary by position
  const positions: Record<string, number> = {};
  for (const p of UNIQUE_PROSPECTS) {
    positions[p.position] = (positions[p.position] || 0) + 1;
  }
  console.log("  Position breakdown:");
  for (const [pos, count] of Object.entries(positions).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${pos}: ${count}`);
  }
}

seedProspects2026().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
