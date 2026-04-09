import { db } from "./index";
import { players } from "./schema";
import { eq, sql } from "drizzle-orm";

const SCHOOL_ESPN_IDS: Record<string, number> = {
  "Alabama": 333, "Arizona": 12, "Arizona State": 9, "Arkansas": 8,
  "Auburn": 2, "Baylor": 239, "Boise State": 68, "Boston College": 103,
  "BYU": 252, "California": 25, "Cincinnati": 2132, "Clemson": 228,
  "Colorado": 38, "Duke": 150, "East Carolina": 151, "Florida": 57,
  "Florida State": 52, "Georgia": 61, "Georgia State": 2247, "Georgia Tech": 59,
  "Houston": 248, "Illinois": 356, "Indiana": 84, "Iowa": 2294,
  "Iowa State": 66, "John Carroll": 2314, "Kansas State": 2306,
  "Kentucky": 96, "Louisville": 97, "LSU": 99, "Maryland": 120,
  "Miami": 2390, "Michigan": 130, "Michigan State": 127, "Minnesota": 135,
  "Mississippi State": 344, "Missouri": 142, "Navy": 2426,
  "NC State": 152, "Nebraska": 158, "North Carolina": 153,
  "North Dakota State": 2449, "Northwestern": 77, "Notre Dame": 87,
  "Ohio State": 194, "Oklahoma": 201, "Ole Miss": 145, "Oregon": 2483,
  "Penn State": 213, "Pittsburgh": 221, "San Diego State": 21,
  "SE Louisiana": 2545, "SMU": 2567, "South Carolina": 2579,
  "Stanford": 24, "Stephen F. Austin": 2617, "TCU": 2628,
  "Tennessee": 2633, "Texas": 251, "Texas A&M": 245, "Texas Tech": 2641,
  "Toledo": 2649, "UCF": 2116, "UConn": 41, "USC": 30,
  "UTSA": 2636, "Utah": 254, "Vanderbilt": 238, "Virginia": 258,
  "Wake Forest": 154, "Washington": 264, "Wyoming": 2751,
};

// All 250 prospects from ESPN best available board
const ESPN_RANKS: { rank: number; name: string; position: string; school: string }[] = [
{"rank":1,"name":"Arvell Reese","position":"LB","school":"Ohio State"},
{"rank":2,"name":"Fernando Mendoza","position":"QB","school":"Indiana"},
{"rank":3,"name":"David Bailey","position":"EDGE","school":"Texas Tech"},
{"rank":4,"name":"Jeremiyah Love","position":"RB","school":"Notre Dame"},
{"rank":5,"name":"Francis Mauigoa","position":"OT","school":"Miami"},
{"rank":6,"name":"Caleb Downs","position":"S","school":"Ohio State"},
{"rank":7,"name":"Sonny Styles","position":"LB","school":"Ohio State"},
{"rank":8,"name":"Mansoor Delane","position":"CB","school":"LSU"},
{"rank":9,"name":"Rueben Bain Jr.","position":"EDGE","school":"Miami"},
{"rank":10,"name":"Makai Lemon","position":"WR","school":"USC"},
{"rank":11,"name":"Kenyon Sadiq","position":"TE","school":"Oregon"},
{"rank":12,"name":"Jordyn Tyson","position":"WR","school":"Arizona State"},
{"rank":13,"name":"Carnell Tate","position":"WR","school":"Ohio State"},
{"rank":14,"name":"Monroe Freeling","position":"OT","school":"Georgia"},
{"rank":15,"name":"Olaivavega Ioane","position":"OG","school":"Penn State"},
{"rank":16,"name":"Jermod McCoy","position":"CB","school":"Tennessee"},
{"rank":17,"name":"Kadyn Proctor","position":"OT","school":"Alabama"},
{"rank":18,"name":"Akheem Mesidor","position":"EDGE","school":"Miami"},
{"rank":19,"name":"Spencer Fano","position":"OT","school":"Utah"},
{"rank":20,"name":"Dillon Thiemann","position":"S","school":"Oregon"},
{"rank":21,"name":"Emmanuel McNeil-Warren","position":"S","school":"Toledo"},
{"rank":22,"name":"Avieon Terrell","position":"CB","school":"Clemson"},
{"rank":23,"name":"Denzel Boston","position":"WR","school":"Washington"},
{"rank":24,"name":"Omar Cooper Jr.","position":"WR","school":"Indiana"},
{"rank":25,"name":"Keldric Faulk","position":"EDGE","school":"Auburn"},
{"rank":26,"name":"Kayden McDonald","position":"DT","school":"Ohio State"},
{"rank":27,"name":"Peter Woods","position":"DT","school":"Clemson"},
{"rank":28,"name":"Caleb Lomu","position":"OT","school":"Utah"},
{"rank":29,"name":"Zion Young","position":"EDGE","school":"Missouri"},
{"rank":30,"name":"Cashius Howell","position":"EDGE","school":"Texas A&M"},
{"rank":31,"name":"Colton Hood","position":"CB","school":"Tennessee"},
{"rank":32,"name":"KC Concepcion","position":"WR","school":"Texas A&M"},
{"rank":33,"name":"Chase Bisontis","position":"OG","school":"Texas A&M"},
{"rank":34,"name":"Caleb Banks","position":"DT","school":"Florida"},
{"rank":35,"name":"Anthony Hill Jr.","position":"LB","school":"Texas"},
{"rank":36,"name":"Eli Stowers","position":"TE","school":"Vanderbilt"},
{"rank":37,"name":"Ty Simpson","position":"QB","school":"Alabama"},
{"rank":38,"name":"Brandon Cisse","position":"CB","school":"South Carolina"},
{"rank":39,"name":"Chris Johnson","position":"CB","school":"San Diego State"},
{"rank":40,"name":"Zachariah Branch","position":"WR","school":"Georgia"},
{"rank":41,"name":"Max Iheanachor","position":"OT","school":"Arizona State"},
{"rank":42,"name":"Chris Brazzell II","position":"WR","school":"Tennessee"},
{"rank":43,"name":"Germie Bernard","position":"WR","school":"Alabama"},
{"rank":44,"name":"Gabe Jacas","position":"EDGE","school":"Illinois"},
{"rank":45,"name":"CJ Allen","position":"LB","school":"Georgia"},
{"rank":46,"name":"Jacob Rodriguez","position":"LB","school":"Texas Tech"},
{"rank":47,"name":"Emmanuel Pregnon","position":"OG","school":"Oregon"},
{"rank":48,"name":"Keionte Scott","position":"CB","school":"Miami"},
{"rank":49,"name":"Christen Miller","position":"DT","school":"Georgia"},
{"rank":50,"name":"Jadarian Price","position":"RB","school":"Notre Dame"},
{"rank":51,"name":"Gennings Dunker","position":"OT","school":"Iowa"},
{"rank":52,"name":"Blake Miller","position":"OT","school":"Clemson"},
{"rank":53,"name":"T.J. Parker","position":"EDGE","school":"Clemson"},
{"rank":54,"name":"Malachi Lawrence","position":"EDGE","school":"UCF"},
{"rank":55,"name":"Jake Golday","position":"LB","school":"Cincinnati"},
{"rank":56,"name":"A.J. Haulcy","position":"S","school":"LSU"},
{"rank":57,"name":"Antonio Williams","position":"WR","school":"Clemson"},
{"rank":58,"name":"Keylan Rutledge","position":"OG","school":"Georgia Tech"},
{"rank":59,"name":"Malachi Fields","position":"WR","school":"Notre Dame"},
{"rank":60,"name":"Derrick Moore","position":"EDGE","school":"Michigan"},
{"rank":61,"name":"Josiah Trotter","position":"LB","school":"Missouri"},
{"rank":62,"name":"Zxavian Harris","position":"DT","school":"Ole Miss"},
{"rank":63,"name":"Max Klare","position":"TE","school":"Ohio State"},
{"rank":64,"name":"Malik Muhammad","position":"CB","school":"Texas"},
{"rank":65,"name":"D'Angelo Ponds","position":"CB","school":"Indiana"},
{"rank":66,"name":"Bud Clark","position":"S","school":"TCU"},
{"rank":67,"name":"Lee Hunter","position":"DT","school":"Texas Tech"},
{"rank":68,"name":"De'Zhaun Stribling","position":"WR","school":"Ole Miss"},
{"rank":69,"name":"Mike Washington Jr.","position":"RB","school":"Arkansas"},
{"rank":70,"name":"Treydan Stukes","position":"S","school":"Arizona"},
{"rank":71,"name":"Ted Hurst","position":"WR","school":"Georgia State"},
{"rank":72,"name":"Jalon Kilgore","position":"S","school":"South Carolina"},
{"rank":73,"name":"Skyler Bell","position":"WR","school":"UConn"},
{"rank":74,"name":"Elijah Sarrett","position":"WR","school":"Indiana"},
{"rank":75,"name":"R Mason Thomas","position":"EDGE","school":"Oklahoma"},
{"rank":76,"name":"Keyron Crawford","position":"EDGE","school":"Auburn"},
{"rank":77,"name":"Keith Abney II","position":"CB","school":"Arizona State"},
{"rank":78,"name":"Chris Bell","position":"WR","school":"Louisville"},
{"rank":79,"name":"Domonique Orange","position":"DT","school":"Iowa State"},
{"rank":80,"name":"Jake Slaughter","position":"C","school":"Florida"},
{"rank":81,"name":"Sam Hecht","position":"C","school":"Kansas State"},
{"rank":82,"name":"Deion Burks","position":"WR","school":"Oklahoma"},
{"rank":83,"name":"Zakee Wheatley","position":"S","school":"Penn State"},
{"rank":84,"name":"Sam Roush","position":"TE","school":"Stanford"},
{"rank":85,"name":"Caleb Tiernan","position":"OT","school":"Northwestern"},
{"rank":86,"name":"Dametrious Crownover","position":"OT","school":"Texas A&M"},
{"rank":87,"name":"Garrett Nussmeier","position":"QB","school":"LSU"},
{"rank":88,"name":"Jaishawn Barham","position":"EDGE","school":"Michigan"},
{"rank":89,"name":"Kyle Louis","position":"LB","school":"Pittsburgh"},
{"rank":90,"name":"Ja'Kobi Lane","position":"WR","school":"USC"},
{"rank":91,"name":"Davison Igbinosun","position":"CB","school":"Ohio State"},
{"rank":92,"name":"Justin Joly","position":"TE","school":"NC State"},
{"rank":93,"name":"Gracen Halton","position":"DT","school":"Oklahoma"},
{"rank":94,"name":"Joshua Josephs","position":"EDGE","school":"Tennessee"},
{"rank":95,"name":"Bryce Lance","position":"WR","school":"North Dakota State"},
{"rank":96,"name":"Dani Dennis-Sutton","position":"EDGE","school":"Penn State"},
{"rank":97,"name":"VJ Payne","position":"S","school":"Kansas State"},
{"rank":98,"name":"Kamari Ramsey","position":"S","school":"USC"},
{"rank":99,"name":"Albert Regis","position":"DT","school":"Texas A&M"},
{"rank":100,"name":"Logan Jones","position":"C","school":"Iowa"},
{"rank":101,"name":"Romello Height","position":"EDGE","school":"Texas Tech"},
{"rank":102,"name":"Jack Endries","position":"TE","school":"Texas"},
{"rank":103,"name":"LT Overton","position":"EDGE","school":"Alabama"},
{"rank":104,"name":"Brian Parker II","position":"OG","school":"Duke"},
{"rank":105,"name":"Michael Trigg","position":"TE","school":"Baylor"},
{"rank":106,"name":"Jalen Farmer","position":"OG","school":"Kentucky"},
{"rank":107,"name":"Deontae Lawson","position":"LB","school":"Alabama"},
{"rank":108,"name":"Connor Lew","position":"C","school":"Auburn"},
{"rank":109,"name":"Will Lee III","position":"CB","school":"Texas A&M"},
{"rank":110,"name":"Nicholas Singleton","position":"RB","school":"Penn State"},
{"rank":111,"name":"Trey Zuhn III","position":"OT","school":"Texas A&M"},
{"rank":112,"name":"Harold Perkins Jr.","position":"LB","school":"LSU"},
{"rank":113,"name":"Darrell Jackson Jr.","position":"DT","school":"Florida State"},
{"rank":114,"name":"Chris McClellan","position":"DT","school":"Missouri"},
{"rank":115,"name":"Tyler Onyedim","position":"DT","school":"Texas A&M"},
{"rank":116,"name":"Taylen Green","position":"QB","school":"Arkansas"},
{"rank":117,"name":"Daylen Everette","position":"CB","school":"Georgia"},
{"rank":118,"name":"Carson Beck","position":"QB","school":"Miami"},
{"rank":119,"name":"Anez Cooper","position":"OG","school":"Miami"},
{"rank":120,"name":"Tacario Davis","position":"CB","school":"Washington"},
{"rank":121,"name":"Drew Shelton","position":"OT","school":"Penn State"},
{"rank":122,"name":"Josh Cameron","position":"WR","school":"Baylor"},
{"rank":123,"name":"Eli Raridon","position":"TE","school":"Notre Dame"},
{"rank":124,"name":"Devin Moore","position":"CB","school":"Florida"},
{"rank":125,"name":"Austin Barber","position":"OT","school":"Florida"},
{"rank":126,"name":"DeMonte Capehart","position":"DT","school":"Clemson"},
{"rank":127,"name":"Genesis Smith","position":"S","school":"Arizona"},
{"rank":128,"name":"Emmett Johnson","position":"RB","school":"Nebraska"},
{"rank":129,"name":"Jadon Canady","position":"S","school":"Oregon"},
{"rank":130,"name":"Chandler Rivers","position":"CB","school":"Duke"},
{"rank":131,"name":"Drew Allar","position":"QB","school":"Penn State"},
{"rank":132,"name":"George Gumbs Jr.","position":"EDGE","school":"Florida"},
{"rank":133,"name":"Joe Royer","position":"TE","school":"Cincinnati"},
{"rank":134,"name":"Jude Bowry","position":"OT","school":"Boston College"},
{"rank":135,"name":"Rayshaun Benny","position":"DT","school":"Michigan"},
{"rank":136,"name":"Demond Claiborne","position":"RB","school":"Wake Forest"},
{"rank":137,"name":"Adam Randall","position":"RB","school":"Clemson"},
{"rank":138,"name":"J'Mari Taylor","position":"RB","school":"Virginia"},
{"rank":139,"name":"Kevin Coleman Jr.","position":"WR","school":"Missouri"},
{"rank":140,"name":"Kage Casey","position":"OT","school":"Boise State"},
{"rank":141,"name":"Jeremiah Wright","position":"OG","school":"Auburn"},
{"rank":142,"name":"Charles Demmings","position":"CB","school":"Stephen F. Austin"},
{"rank":143,"name":"Jakobe Thomas","position":"S","school":"Miami"},
{"rank":144,"name":"Le'Veon Moss","position":"RB","school":"Texas A&M"},
{"rank":145,"name":"Brenen Thompson","position":"WR","school":"Mississippi State"},
{"rank":146,"name":"Jeff Caldwell","position":"WR","school":"Cincinnati"},
{"rank":147,"name":"Kaytron Allen","position":"RB","school":"Penn State"},
{"rank":148,"name":"Roman Hemby","position":"RB","school":"Indiana"},
{"rank":149,"name":"Zane Durant","position":"DT","school":"Penn State"},
{"rank":150,"name":"Kaleb Elarms-Orr","position":"LB","school":"TCU"},
{"rank":151,"name":"Trey Moore","position":"EDGE","school":"Texas"},
{"rank":152,"name":"Bryce Boettcher","position":"LB","school":"Oregon"},
{"rank":153,"name":"Keagen Trost","position":"OT","school":"Missouri"},
{"rank":154,"name":"Jonah Coleman","position":"RB","school":"Washington"},
{"rank":155,"name":"Cole Payton","position":"QB","school":"North Dakota State"},
{"rank":156,"name":"Josh Cuevas","position":"TE","school":"Alabama"},
{"rank":157,"name":"Parker Brailsford","position":"C","school":"Alabama"},
{"rank":158,"name":"Matt Gulbin","position":"C","school":"Michigan State"},
{"rank":159,"name":"Ephesians Prysock","position":"CB","school":"Washington"},
{"rank":160,"name":"Nate Boerkircher","position":"TE","school":"Texas A&M"},
{"rank":161,"name":"Dontay Corleone","position":"DT","school":"Cincinnati"},
{"rank":162,"name":"Jimmy Rolder","position":"LB","school":"Michigan"},
{"rank":163,"name":"Alex Harkey","position":"OG","school":"Oregon"},
{"rank":164,"name":"Domani Jackson","position":"CB","school":"Alabama"},
{"rank":165,"name":"Lake McRee","position":"TE","school":"USC"},
{"rank":166,"name":"Hezekiah Masses","position":"CB","school":"California"},
{"rank":167,"name":"J. Michael Sturdivant","position":"WR","school":"Florida"},
{"rank":168,"name":"Malik Benson","position":"WR","school":"Oregon"},
{"rank":169,"name":"Caden Curry","position":"EDGE","school":"Ohio State"},
{"rank":170,"name":"Oscar Delp","position":"TE","school":"Georgia"},
{"rank":171,"name":"Billy Schrauth","position":"OG","school":"Notre Dame"},
{"rank":172,"name":"Markel Bell","position":"OT","school":"Miami"},
{"rank":173,"name":"Julian Neal","position":"CB","school":"Arkansas"},
{"rank":174,"name":"Robert Spears-Jennings","position":"S","school":"Oklahoma"},
{"rank":175,"name":"Bryson Eason","position":"DT","school":"Tennessee"},
{"rank":176,"name":"Riley Nowakowski","position":"TE","school":"Indiana"},
{"rank":177,"name":"Michael Taaffe","position":"S","school":"Texas"},
{"rank":178,"name":"Will Kacmarek","position":"TE","school":"Ohio State"},
{"rank":179,"name":"Marlin Klein","position":"TE","school":"Michigan"},
{"rank":180,"name":"Colbie Young","position":"WR","school":"Georgia"},
{"rank":181,"name":"Matthew Hibner","position":"TE","school":"SMU"},
{"rank":182,"name":"Justin Jefferson","position":"LB","school":"Alabama"},
{"rank":183,"name":"Seth McGowan","position":"RB","school":"Kentucky"},
{"rank":184,"name":"Nick Barrett","position":"DT","school":"South Carolina"},
{"rank":185,"name":"Cameron Ball","position":"DT","school":"Arkansas"},
{"rank":186,"name":"Isaiah World","position":"OT","school":"Oregon"},
{"rank":187,"name":"Tim Keenan III","position":"DT","school":"Alabama"},
{"rank":188,"name":"Bishop Fitzgerald","position":"S","school":"USC"},
{"rank":189,"name":"Fernando Carmona","position":"OT","school":"Arkansas"},
{"rank":190,"name":"Toriano Pride Jr.","position":"CB","school":"Missouri"},
{"rank":191,"name":"Luke Altmyer","position":"QB","school":"Illinois"},
{"rank":192,"name":"TJ Hall","position":"CB","school":"Iowa"},
{"rank":193,"name":"Caleb Douglas","position":"WR","school":"Texas Tech"},
{"rank":194,"name":"Pat Coogan","position":"C","school":"Indiana"},
{"rank":195,"name":"Scooby Williams","position":"LB","school":"Texas A&M"},
{"rank":196,"name":"Jaeden Roberts","position":"OG","school":"Alabama"},
{"rank":197,"name":"Diego Pounds","position":"OT","school":"Ole Miss"},
{"rank":198,"name":"Lander Barton","position":"LB","school":"Utah"},
{"rank":199,"name":"Taurean York","position":"LB","school":"Texas A&M"},
{"rank":200,"name":"Aiden Fisher","position":"LB","school":"Indiana"},
{"rank":201,"name":"Dae'Quan Wright","position":"TE","school":"Ole Miss"},
{"rank":202,"name":"Barion Brown","position":"WR","school":"LSU"},
{"rank":203,"name":"Owen Heinecke","position":"LB","school":"Oklahoma"},
{"rank":204,"name":"Behren Morton","position":"QB","school":"Texas Tech"},
{"rank":205,"name":"Aaron Anderson","position":"WR","school":"LSU"},
{"rank":206,"name":"Louis Moore","position":"S","school":"Indiana"},
{"rank":207,"name":"Kaleb Proctor","position":"DT","school":"SE Louisiana"},
{"rank":208,"name":"Brandon Cleveland","position":"DT","school":"NC State"},
{"rank":209,"name":"Jam Miller","position":"RB","school":"Alabama"},
{"rank":210,"name":"Jack Kelly","position":"EDGE","school":"BYU"},
{"rank":211,"name":"Ar'Maj Reed-Adams","position":"OG","school":"Texas A&M"},
{"rank":212,"name":"Harrison Wallace III","position":"WR","school":"Ole Miss"},
{"rank":213,"name":"Tanner Koziol","position":"TE","school":"Houston"},
{"rank":214,"name":"Patrick Payton","position":"EDGE","school":"LSU"},
{"rank":215,"name":"Reggie Virgil","position":"WR","school":"Texas Tech"},
{"rank":216,"name":"Kaelon Black","position":"RB","school":"Indiana"},
{"rank":217,"name":"Skyler Gill-Howard","position":"DT","school":"Texas Tech"},
{"rank":218,"name":"John Michael Gyllenborg","position":"TE","school":"Wyoming"},
{"rank":219,"name":"Namdi Obiazor","position":"LB","school":"TCU"},
{"rank":220,"name":"Eric Gentry","position":"LB","school":"USC"},
{"rank":221,"name":"Logan Taylor","position":"OG","school":"Boston College"},
{"rank":222,"name":"Sawyer Robertson","position":"QB","school":"Baylor"},
{"rank":223,"name":"Zavion Thomas","position":"WR","school":"LSU"},
{"rank":224,"name":"Dalton Johnson","position":"S","school":"Arizona"},
{"rank":225,"name":"DJ Rogers","position":"TE","school":"TCU"},
{"rank":226,"name":"Lorenzo Styles Jr.","position":"S","school":"Ohio State"},
{"rank":227,"name":"Thaddeus Dixon","position":"CB","school":"North Carolina"},
{"rank":228,"name":"Jalen Huskey","position":"CB","school":"Maryland"},
{"rank":229,"name":"Robert Henry Jr.","position":"RB","school":"UTSA"},
{"rank":230,"name":"Wesley Bissainthe","position":"LB","school":"Miami"},
{"rank":231,"name":"DeShon Singleton","position":"S","school":"Nebraska"},
{"rank":232,"name":"Cade Klubnik","position":"QB","school":"Clemson"},
{"rank":233,"name":"Collin Wright","position":"CB","school":"Stanford"},
{"rank":234,"name":"Dallen Bentley","position":"TE","school":"Utah"},
{"rank":235,"name":"Wade Woodaz","position":"LB","school":"Clemson"},
{"rank":236,"name":"James Brockermeyer","position":"C","school":"Miami"},
{"rank":237,"name":"Eli Heidenreich","position":"RB","school":"Navy"},
{"rank":238,"name":"Joey Aguilar","position":"QB","school":"Tennessee"},
{"rank":239,"name":"Cole Wisniewski","position":"S","school":"Texas Tech"},
{"rank":240,"name":"Haynes King","position":"QB","school":"Georgia Tech"},
{"rank":241,"name":"Quintayvious Hutchins","position":"EDGE","school":"Boston College"},
{"rank":242,"name":"Aamil Wagner","position":"OT","school":"Notre Dame"},
{"rank":243,"name":"David Blay Jr.","position":"DT","school":"Miami"},
{"rank":244,"name":"RJ Maryland","position":"TE","school":"SMU"},
{"rank":245,"name":"Vincent Anthony Jr.","position":"EDGE","school":"Duke"},
{"rank":246,"name":"Kam Dewberry","position":"OG","school":"Alabama"},
{"rank":247,"name":"Jack Pyburn","position":"EDGE","school":"LSU"},
{"rank":248,"name":"Jacobian Guillory II","position":"DT","school":"LSU"},
{"rank":249,"name":"Joe Fagnano","position":"QB","school":"UConn"},
{"rank":250,"name":"Tyren Montgomery","position":"WR","school":"John Carroll"},
];

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║  UPDATE ESPN RANKS (250 PROSPECTS)          ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  // Step 1: Clear all existing ranks
  console.log("1. Clearing existing ranks...");
  await db.update(players).set({ rank: null });

  // Step 2: Delete 2025 players (not used in any picks and not in 2026 list)
  console.log("2. Removing 2025 draft class players not in picks...");
  const espnNames = new Set(ESPN_RANKS.map(p => p.name));

  // Get all players not in ESPN list and not used in picks
  const allPlayers = await db.select({ id: players.id, name: players.name }).from(players);
  const { picks: picksTable } = await import("./schema");
  const usedInPicks = await db.select({ playerId: picksTable.playerId }).from(picksTable);
  const pickedIds = new Set(usedInPicks.map(p => p.playerId));

  let removed = 0;
  for (const p of allPlayers) {
    if (!espnNames.has(p.name) && !pickedIds.has(p.id)) {
      await db.delete(players).where(eq(players.id, p.id));
      removed++;
    }
  }
  console.log(`   Removed ${removed} old players\n`);

  // Step 3: Upsert all 250 prospects with ranks
  console.log("3. Upserting 250 prospects...");
  let inserted = 0, updated = 0;

  for (const p of ESPN_RANKS) {
    const schoolEspnId = SCHOOL_ESPN_IDS[p.school];
    const schoolLogoUrl = schoolEspnId
      ? `https://a.espncdn.com/i/teamlogos/ncaa/500/${schoolEspnId}.png`
      : null;

    // Try to match by name
    const [existing] = await db.select({ id: players.id }).from(players).where(eq(players.name, p.name));

    // Also handle TJ Parker vs T.J. Parker
    let altExisting = null;
    if (!existing) {
      const altName = p.name.replace(/\./g, "").replace(/  /g, " ");
      if (altName !== p.name) {
        const [alt] = await db.select({ id: players.id }).from(players).where(eq(players.name, altName));
        altExisting = alt;
      }
    }

    const match = existing || altExisting;

    if (match) {
      await db.update(players).set({
        rank: p.rank,
        position: p.position,
        school: p.school,
        schoolLogoUrl,
      }).where(eq(players.id, match.id));
      updated++;
    } else {
      await db.insert(players).values({
        name: p.name,
        position: p.position,
        school: p.school,
        rank: p.rank,
        schoolLogoUrl,
      });
      inserted++;
    }
  }

  console.log(`   Updated: ${updated}, Inserted: ${inserted}\n`);

  // Step 4: Fetch headshots for new players missing them
  console.log("4. Fetching headshots for players missing them...");
  const missingImages = await db.select({ id: players.id, name: players.name })
    .from(players).where(sql`${players.imageUrl} IS NULL AND ${players.rank} IS NOT NULL`);

  console.log(`   ${missingImages.length} players need headshots`);

  const SEARCH_URL = "https://site.api.espn.com/apis/common/v3/search?type=player&sport=football&limit=5&query=";
  let headshots = 0;

  for (const p of missingImages) {
    try {
      const res = await fetch(SEARCH_URL + encodeURIComponent(p.name));
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        if (items.length > 0) {
          const espnId = items[0].id;
          const league = items[0].league || "college-football";
          const base = league === "nfl" ? "nfl" : "college-football";
          const imageUrl = `https://a.espncdn.com/i/headshots/${base}/players/full/${espnId}.png`;
          await db.update(players).set({ imageUrl }).where(eq(players.id, p.id));
          headshots++;
        }
      }
      await new Promise(r => setTimeout(r, 150));
    } catch {}
  }
  console.log(`   Fetched ${headshots} headshots\n`);

  // Summary
  const total = await db.select({ count: sql<number>`count(*)` }).from(players);
  const ranked = await db.select({ count: sql<number>`count(*)` }).from(players).where(sql`rank IS NOT NULL`);
  const withImage = await db.select({ count: sql<number>`count(*)` }).from(players).where(sql`image_url IS NOT NULL`);
  const withSchoolLogo = await db.select({ count: sql<number>`count(*)` }).from(players).where(sql`school_logo_url IS NOT NULL`);

  console.log("Summary:");
  console.log(`  Total players: ${total[0].count}`);
  console.log(`  Ranked: ${ranked[0].count}`);
  console.log(`  With headshot: ${withImage[0].count}`);
  console.log(`  With school logo: ${withSchoolLogo[0].count}`);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
