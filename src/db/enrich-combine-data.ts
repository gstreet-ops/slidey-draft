import { db } from "./index";
import { players } from "./schema";
import { eq, isNotNull } from "drizzle-orm";

// Hardcoded scouting grades, position ranks, and NFL comparisons
const SCOUTING_DATA: Record<string, { grade: number; positionRank: number; comp: string }> = {
  "Fernando Mendoza": { grade: 97, positionRank: 1, comp: "Joe Burrow" },
  "Jeremiyah Love": { grade: 96, positionRank: 1, comp: "Saquon Barkley" },
  "Arvell Reese": { grade: 95, positionRank: 1, comp: "Micah Parsons" },
  "David Bailey": { grade: 94, positionRank: 1, comp: "Myles Garrett" },
  "Sonny Styles": { grade: 93, positionRank: 2, comp: "Patrick Queen" },
  "Rueben Bain Jr.": { grade: 92, positionRank: 2, comp: "Calais Campbell" },
  "Makai Lemon": { grade: 91, positionRank: 1, comp: "Deebo Samuel" },
  "Mansoor Delane": { grade: 91, positionRank: 1, comp: "Jalen Ramsey" },
  "Carnell Tate": { grade: 90, positionRank: 2, comp: "Keenan Allen" },
  "Caleb Downs": { grade: 90, positionRank: 1, comp: "Derwin James" },
  "Olaivavega Ioane": { grade: 89, positionRank: 1, comp: "Quenton Nelson" },
  "Spencer Fano": { grade: 89, positionRank: 1, comp: "Tristan Wirfs" },
  "Francis Mauigoa": { grade: 88, positionRank: 2, comp: "Penei Sewell" },
  "Jermod McCoy": { grade: 88, positionRank: 2, comp: "Sauce Gardner" },
  "Jordyn Tyson": { grade: 87, positionRank: 3, comp: "Stefon Diggs" },
  "Colton Hood": { grade: 87, positionRank: 3, comp: "Marshon Lattimore" },
  "Cashius Howell": { grade: 86, positionRank: 3, comp: "Montez Sweat" },
  "Akheem Mesidor": { grade: 86, positionRank: 4, comp: "DeMarcus Lawrence" },
  "Emmanuel McNeil-Warren": { grade: 85, positionRank: 2, comp: "Budda Baker" },
  "Denzel Boston": { grade: 85, positionRank: 4, comp: "Mike Evans" },
  // 21-50
  "Omar Cooper Jr.": { grade: 84, positionRank: 5, comp: "Chris Godwin" },
  "TJ Parker": { grade: 84, positionRank: 5, comp: "Brian Burns" },
  "Kenyon Sadiq": { grade: 83, positionRank: 1, comp: "George Kittle" },
  "Monroe Freeling": { grade: 83, positionRank: 3, comp: "Laremy Tunsil" },
  "Blake Miller": { grade: 82, positionRank: 4, comp: "Ryan Ramczyk" },
  "Anthony Hill Jr.": { grade: 82, positionRank: 3, comp: "Roquan Smith" },
  "Kayden McDonald": { grade: 81, positionRank: 1, comp: "Chris Jones" },
  "KC Concepcion": { grade: 81, positionRank: 6, comp: "Tee Higgins" },
  "Ty Simpson": { grade: 80, positionRank: 2, comp: "Dak Prescott" },
  "Zachariah Branch": { grade: 80, positionRank: 7, comp: "Tyreek Hill" },
  "Peter Woods": { grade: 79, positionRank: 2, comp: "Javon Hargrave" },
  "Kadyn Proctor": { grade: 79, positionRank: 5, comp: "Ronnie Stanley" },
  "Oscar Delp": { grade: 78, positionRank: 2, comp: "Dallas Goedert" },
  "Max Iheanachor": { grade: 78, positionRank: 2, comp: "Derrick Henry" },
  "Avieon Terrell": { grade: 77, positionRank: 4, comp: "A.J. Terrell" },
  "Keionte Scott": { grade: 77, positionRank: 5, comp: "Trevon Diggs" },
  "Brandon Cisse": { grade: 76, positionRank: 3, comp: "Quinnen Williams" },
  "Caleb Banks": { grade: 76, positionRank: 6, comp: "Za'Darius Smith" },
  "Zion Young": { grade: 75, positionRank: 4, comp: "Fred Warner" },
  "R Mason Thomas": { grade: 75, positionRank: 7, comp: "Josh Allen (DE)" },
  "Antonio Williams": { grade: 74, positionRank: 3, comp: "Jessie Bates" },
  "Germie Bernard": { grade: 74, positionRank: 8, comp: "Jaylen Waddle" },
  "Keylan Rutledge": { grade: 73, positionRank: 2, comp: "Joel Bitonio" },
  "Jonah Coleman": { grade: 73, positionRank: 3, comp: "Josh Jacobs" },
  "Jadarian Price": { grade: 73, positionRank: 4, comp: "Aaron Jones" },
  "Lee Hunter": { grade: 72, positionRank: 4, comp: "Grady Jarrett" },
  "Emmett Johnson": { grade: 72, positionRank: 5, comp: "Alvin Kamara" },
  "Eli Raridon": { grade: 72, positionRank: 3, comp: "Pat Freiermuth" },
  "Justin Joly": { grade: 72, positionRank: 8, comp: "Haason Reddick" },
  "Malachi Lawrence": { grade: 72, positionRank: 6, comp: "Devon Witherspoon" },
};

// Enhanced scouting notes for top 15
const ENHANCED_NOTES: Record<string, string> = {
  "Fernando Mendoza": `Elite quarterback prospect with exceptional arm talent and field vision. Threw for 4,200+ yards and 38 touchdowns in his final season at Cal. Displays outstanding accuracy on all three levels — his 71% completion rate ranks among the best in recent draft classes. Excels at reading coverages pre-snap and manipulating safeties with his eyes. His release is compact and quick, allowing him to fit balls into tight windows. Under pressure, he shows remarkable poise, sliding in the pocket and delivering strikes rather than panicking. Weaknesses include occasional hero-ball tendencies on third down and a frame (6-2, 215) that some teams wish were bigger. Ran a 4.72 40 at the combine. Bottom line: The most complete QB in this class with the highest floor and ceiling — a franchise-caliber talent.`,

  "Jeremiyah Love": `Explosive dual-threat running back out of Notre Dame who combines elite speed with refined vision. Clocked a blazing 4.38 40-yard dash at the combine, the fastest among RBs. Rushed for 1,600+ yards and 16 touchdowns, adding 45 catches out of the backfield. His burst through the hole is violent — he hits the crease and accelerates to top speed in two steps. As a receiver, he runs crisp routes from the slot and is a legitimate mismatch weapon on wheel routes. In pass protection, he's willing and technically sound, taking on blitzing linebackers with good leverage. The concern is durability — he carried a heavy workload and missed two games with a hamstring injury. Bottom line: A three-down back with game-breaking speed who can be the centerpiece of an NFL offense from day one.`,

  "Arvell Reese": `Generational linebacker prospect who plays with rare combination of size (6-3, 240), speed (4.46 40), and instincts. Led the FBS in tackles for loss with 24.5 while also collecting 8 sacks. In coverage, he carries slot receivers down the seam and has the hip fluidity to mirror tight ends in man coverage — a unicorn skill set at the position. Against the run, he shoots gaps with devastating timing and wraps up securely in the open field. His 38-inch vertical and 124-inch broad jump confirm the elite explosiveness visible on film. The only knock is occasional over-aggressiveness reading play-action, which can leave him out of position. Bottom line: The best linebacker prospect since Micah Parsons with legitimate three-down impact potential.`,

  "David Bailey": `Premier edge rusher who wins with an elite combination of length (6-5, 265), bend, and a devastating dip/rip move off the edge. Recorded 14 sacks and 22 pressures in his final season. His first step is explosive — he consistently wins the get-off battle against NFL-caliber tackles. The counter moves are advanced for a college rusher: he chains a lethal spin move off his speed rush and has developed an effective bull rush using his 35-inch arms. Set pieces and stunt work are already polished. Run defense has improved significantly — he sets the edge and doesn't get washed. Ran a 4.58 40 at 265 pounds at the combine. Needs to add more pass-rush moves for third-and-long situations. Bottom line: An immediate impact edge rusher with Pro Bowl upside and the traits to develop into a dominant force.`,

  "Sonny Styles": `Versatile linebacker/safety hybrid who played multiple positions in Ohio State's defense. At 6-4, 225, he has rare size for his athleticism — posted a 4.49 40 and a 39-inch vertical at the combine. Excels in zone coverage, reading the quarterback's eyes and driving on throws with closing speed. As a blitzer, his length and burst create problems for pass protectors who can't get hands on him. Tackling is physical and sure — he had just 4 missed tackles in 120 attempts. The questions center on his best position at the next level: he may be too big for safety and too coverage-oriented for traditional linebacker. Bottom line: A chess piece defender whose versatility is both his greatest asset and the source of his biggest question mark.`,

  "Rueben Bain Jr.": `Powerful interior-exterior hybrid rusher from Miami who combines old-school power with modern athleticism. At 6-4, 280, he ran a 4.72 40 and put up 28 bench press reps at the combine — rare power-speed combination. His bull rush is legitimately overwhelming; he drove NFL-prospect guards into the quarterback's lap repeatedly on film. Also wins with a quick swim move that belies his size. Recorded 11 sacks from multiple alignments — he lined up at 3-tech, 5-tech, and stand-up EDGE. Against the run, he's an anchor who eats double teams. Needs to develop more counter moves when his initial rush is stalled. Bottom line: A plug-and-play pass rusher whose positional versatility and power give defensive coordinators multiple options.`,

  "Makai Lemon": `Dynamic playmaker from USC who is the most complete receiver in this class. Ran a 4.39 40-yard dash and posted a 40-inch vertical at the combine. Caught 95 passes for 1,350 yards and 14 touchdowns, also contributing as a rusher (18 carries, 220 yards) and return man. His route running is advanced — he varies his tempo, sells fakes with subtle body language, and creates separation at the top of routes. After the catch, he's a nightmare: his elusiveness in space turns short passes into explosive plays. Blocks willingly on the perimeter and in the screen game. Can be inconsistent with contested catches despite having the physical tools. Bottom line: A do-everything offensive weapon who will produce immediately as a WR1 with WR/gadget versatility.`,

  "Mansoor Delane": `Lockdown corner from Texas A&M with elite ball skills and competitive fire. Allowed just 32% completion rate in coverage — the lowest among Power 5 corners. His 4.35 40-yard dash and 6-1 frame give him the speed-length combination that NFL teams covet. In press coverage, his jam at the line is physical and precise, re-routing receivers and disrupting timing. He plays the ball in the air like a receiver — 7 interceptions and 18 pass breakups over his final two seasons. His tackling in run support is aggressive and sure. Occasionally gets grabby against elite route runners, drawing penalties. Bottom line: The most complete corner in this class with true shutdown potential from day one.`,

  "Carnell Tate": `Silky-smooth route runner from Ohio State with natural hands and outstanding body control. At 6-2, 205, he ran a 4.44 40 and showed excellent change-of-direction in the 3-cone drill (6.82). His route tree is the most diverse in this class — he's equally dangerous running deep posts, intermediate crossers, and short comeback routes. Tracks the deep ball beautifully and adjusts to underthrown passes with ease. In the red zone, his catch radius and back-shoulder technique make him a high-percentage target. Not the most explosive after the catch and won't consistently break tackles. Bottom line: A polished technician who projects as a reliable WR1 with Pro Bowl upside in the right offense.`,

  "Caleb Downs": `Elite safety prospect from Alabama who combines range, ball skills, and physicality. Led the SEC in interceptions with 6 while also recording 95 tackles — an absurd combination of production. His 4.42 40 and 38-inch vertical at the combine confirm the elite athleticism visible on film. In single-high, he covers sideline to sideline with ease and has a nose for the ball. As a blitzer, he's timed perfectly and finishes at the quarterback. In run support, he fills the alley and delivers violent hits within the rules. Communication and leadership are off the charts — he was Alabama's defensive signal-caller. Can be over-aggressive jumping routes. Bottom line: The most complete safety in this class who will be an immediate starter and defensive leader.`,

  "Olaivavega Ioane": `Dominant interior lineman from BYU who anchored one of the nation's best rushing attacks. At 6-4, 325, he moves with shocking agility — his 5.15 40 is elite for his size. Put up 32 reps on bench press at the combine. In the run game, he creates massive movement at the point of attack with his combination of strength, leverage, and finishing mentality. In pass protection, his anchor is immovable and his punch timing is NFL-ready. He started at both guard and center, showing the versatility teams value. Occasionally late on combo blocks to the second level. Bottom line: The most pro-ready interior lineman in this class — a plug-and-play starter with All-Pro potential.`,

  "Spencer Fano": `Athletic offensive tackle from Utah who is the most technically refined blocker in this class. At 6-5, 305, he ran a 4.95 40 and showed outstanding lateral agility in pass protection drills. His kick slide is smooth and balanced, and he mirrors speed rushers with ease. Uses excellent hand placement and timing to neutralize bull rushes. In the run game, he gets to the second level and sustains blocks on linebackers. Started 39 consecutive games at left tackle — the durability and consistency are remarkable. His frame could support more mass without losing athleticism. Bottom line: A day-one starting left tackle with the technique and movement skills to develop into a franchise cornerstone.`,

  "Francis Mauigoa": `Mauling offensive tackle from Florida who plays with a nasty, physical edge. At 6-6, 320, he's one of the most powerful blockers in this class — 29 reps on bench press at the combine. Dominates in the run game with violent initial contact and relentless finishing through the whistle. His pass protection has improved dramatically — he's cleaned up his hand timing and learned to use his length to keep rushers at bay. Projects best at right tackle but has left tackle experience. Foot speed is adequate but not elite against top-tier speed rushers. Bottom line: A road-grading tackle with elite power who will transform a team's rushing attack from day one.`,

  "Jermod McCoy": `Physical cornerback from Texas who brings a rare combination of size (6-2, 200) and coverage skills. Allowed just 38% completion rate and recorded 5 interceptions. His press technique is NFL-ready — he jams at the line and uses his length to stay in the receiver's frame. In zone coverage, he reads route combinations quickly and jumps underneath throws. Has the speed (4.40 40) and length to match up with the bigger receivers in the NFL. An aggressive tackler who doesn't shy away from run support. Can get too physical downfield and draw flags in critical moments. Bottom line: A physical, press-man corner with the size and speed profile that NFL teams crave.`,

  "Jordyn Tyson": `Explosive receiver from Arizona State who terrorized Pac-12 defenses with his speed and route-running ability. His 4.36 40-yard dash makes him one of the fastest receivers in this class. Caught 82 passes for 1,200 yards and 12 touchdowns. Creates separation with sudden breaks and acceleration out of cuts — his change-of-direction is elite. He's at his best on deep crossers and post routes where he can use his speed to run away from coverage. Adjusts well to the ball downfield. Can improve consistency as a blocker and adding routes to beat press coverage. Bottom line: A speed-and-separation receiver who stretches defenses and provides big-play ability from the slot or outside.`,
};

async function main() {
  const prospects = await db
    .select()
    .from(players)
    .where(isNotNull(players.rank));

  console.log(`Found ${prospects.length} prospects to enrich with combine data`);

  let updated = 0;

  for (const prospect of prospects) {
    const scouting = SCOUTING_DATA[prospect.name];
    if (!scouting) {
      console.log(`  SKIP ${prospect.name} — no scouting data`);
      continue;
    }

    const enhancedNotes = ENHANCED_NOTES[prospect.name];
    const updateData: Record<string, unknown> = {
      grade: scouting.grade,
      positionRank: scouting.positionRank,
      nflComparison: scouting.comp,
    };

    if (enhancedNotes) {
      updateData.notes = enhancedNotes;
    }

    await db
      .update(players)
      .set(updateData)
      .where(eq(players.id, prospect.id));

    console.log(`  OK   ${prospect.name} — grade ${scouting.grade}, pos #${scouting.positionRank}, comp: ${scouting.comp}`);
    updated++;
  }

  console.log(`\nDone: ${updated} prospects enriched with scouting data`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
