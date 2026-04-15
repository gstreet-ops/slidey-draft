import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";
import { eq, isNotNull } from "drizzle-orm";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });
const { players } = schema;

// Hardcoded scouting grades, position ranks, and NFL comparisons for all 250 prospects
const SCOUTING_DATA: Record<string, { grade: number; positionRank: number; comp: string }> = {
  // Ranks 1-10 (grades 90-97)
  "Arvell Reese": { grade: 97, positionRank: 1, comp: "Micah Parsons" },
  "Fernando Mendoza": { grade: 96, positionRank: 1, comp: "Joe Burrow" },
  "David Bailey": { grade: 95, positionRank: 1, comp: "Myles Garrett" },
  "Jeremiyah Love": { grade: 94, positionRank: 1, comp: "Saquon Barkley" },
  "Francis Mauigoa": { grade: 93, positionRank: 1, comp: "Penei Sewell" },
  "Caleb Downs": { grade: 92, positionRank: 1, comp: "Derwin James" },
  "Sonny Styles": { grade: 91, positionRank: 2, comp: "Patrick Queen" },
  "Mansoor Delane": { grade: 91, positionRank: 1, comp: "Jalen Ramsey" },
  "Rueben Bain Jr.": { grade: 90, positionRank: 2, comp: "Calais Campbell" },
  "Makai Lemon": { grade: 90, positionRank: 1, comp: "Deebo Samuel" },

  // Ranks 11-20 (grades 85-89)
  "Kenyon Sadiq": { grade: 89, positionRank: 1, comp: "George Kittle" },
  "Jordyn Tyson": { grade: 89, positionRank: 2, comp: "Stefon Diggs" },
  "Carnell Tate": { grade: 88, positionRank: 3, comp: "Keenan Allen" },
  "Monroe Freeling": { grade: 88, positionRank: 2, comp: "Laremy Tunsil" },
  "Olaivavega Ioane": { grade: 87, positionRank: 1, comp: "Quenton Nelson" },
  "Jermod McCoy": { grade: 87, positionRank: 2, comp: "Sauce Gardner" },
  "Kadyn Proctor": { grade: 86, positionRank: 3, comp: "Ronnie Stanley" },
  "Akheem Mesidor": { grade: 86, positionRank: 3, comp: "DeMarcus Lawrence" },
  "Spencer Fano": { grade: 85, positionRank: 4, comp: "Tristan Wirfs" },
  "Dillon Thiemann": { grade: 85, positionRank: 2, comp: "Justin Simmons" },

  // Ranks 21-30 (grades 80-84)
  "Emmanuel McNeil-Warren": { grade: 84, positionRank: 3, comp: "Budda Baker" },
  "Avieon Terrell": { grade: 83, positionRank: 3, comp: "A.J. Terrell" },
  "Denzel Boston": { grade: 83, positionRank: 4, comp: "Mike Evans" },
  "Omar Cooper Jr.": { grade: 82, positionRank: 5, comp: "Chris Godwin" },
  "Keldric Faulk": { grade: 82, positionRank: 4, comp: "Maxx Crosby" },
  "Kayden McDonald": { grade: 81, positionRank: 1, comp: "Chris Jones" },
  "Peter Woods": { grade: 81, positionRank: 2, comp: "Javon Hargrave" },
  "Caleb Lomu": { grade: 80, positionRank: 5, comp: "Trent Williams" },
  "Zion Young": { grade: 80, positionRank: 5, comp: "Montez Sweat" },
  "Cashius Howell": { grade: 80, positionRank: 6, comp: "Danielle Hunter" },

  // Ranks 31-40 (grades 76-79)
  "Colton Hood": { grade: 79, positionRank: 4, comp: "Marshon Lattimore" },
  "KC Concepcion": { grade: 78, positionRank: 6, comp: "Tee Higgins" },
  "Chase Bisontis": { grade: 78, positionRank: 2, comp: "Zack Martin" },
  "Caleb Banks": { grade: 77, positionRank: 3, comp: "Quinnen Williams" },
  "Anthony Hill Jr.": { grade: 77, positionRank: 3, comp: "Roquan Smith" },
  "Eli Stowers": { grade: 77, positionRank: 2, comp: "Dallas Goedert" },
  "Ty Simpson": { grade: 76, positionRank: 2, comp: "Dak Prescott" },
  "Brandon Cisse": { grade: 76, positionRank: 5, comp: "Trevon Diggs" },
  "Chris Johnson": { grade: 76, positionRank: 6, comp: "Darius Slay" },
  "Zachariah Branch": { grade: 76, positionRank: 7, comp: "Tyreek Hill" },

  // Ranks 41-50 (grades 72-76)
  "Max Iheanachor": { grade: 76, positionRank: 6, comp: "Orlando Brown Jr." },
  "Chris Brazzell II": { grade: 75, positionRank: 8, comp: "DK Metcalf" },
  "Germie Bernard": { grade: 74, positionRank: 9, comp: "Jaylen Waddle" },
  "Gabe Jacas": { grade: 74, positionRank: 7, comp: "Josh Allen (DE)" },
  "CJ Allen": { grade: 73, positionRank: 4, comp: "Fred Warner" },
  "Jacob Rodriguez": { grade: 73, positionRank: 5, comp: "Zack Baun" },
  "Emmanuel Pregnon": { grade: 73, positionRank: 3, comp: "Joel Bitonio" },
  "Keionte Scott": { grade: 72, positionRank: 7, comp: "Jaycee Horn" },
  "Christen Miller": { grade: 72, positionRank: 4, comp: "Dexter Lawrence" },
  "Jadarian Price": { grade: 72, positionRank: 2, comp: "Aaron Jones" },

  // Ranks 51-75 (grades 65-72)
  "Gennings Dunker": { grade: 72, positionRank: 7, comp: "Andrew Thomas" },
  "Blake Miller": { grade: 71, positionRank: 8, comp: "Ryan Ramczyk" },
  "T.J. Parker": { grade: 71, positionRank: 8, comp: "Brian Burns" },
  "Malachi Lawrence": { grade: 70, positionRank: 9, comp: "Aidan Hutchinson" },
  "Jake Golday": { grade: 70, positionRank: 6, comp: "Tremaine Edmunds" },
  "A.J. Haulcy": { grade: 69, positionRank: 4, comp: "Minkah Fitzpatrick" },
  "Antonio Williams": { grade: 69, positionRank: 10, comp: "Terry McLaurin" },
  "Keylan Rutledge": { grade: 69, positionRank: 4, comp: "Brandon Scherff" },
  "Malachi Fields": { grade: 68, positionRank: 11, comp: "Allen Lazard" },
  "Derrick Moore": { grade: 68, positionRank: 10, comp: "Za'Darius Smith" },
  "Josiah Trotter": { grade: 68, positionRank: 7, comp: "Bobby Wagner" },
  "Zxavian Harris": { grade: 67, positionRank: 5, comp: "Grady Jarrett" },
  "Max Klare": { grade: 67, positionRank: 3, comp: "Pat Freiermuth" },
  "Malik Muhammad": { grade: 67, positionRank: 8, comp: "Denzel Ward" },
  "D'Angelo Ponds": { grade: 66, positionRank: 9, comp: "L'Jarius Sneed" },
  "Bud Clark": { grade: 66, positionRank: 5, comp: "Jessie Bates" },
  "Lee Hunter": { grade: 66, positionRank: 6, comp: "Jonathan Allen" },
  "De'Zhaun Stribling": { grade: 66, positionRank: 12, comp: "Courtland Sutton" },
  "Mike Washington Jr.": { grade: 65, positionRank: 3, comp: "Derrick Henry" },
  "Treydan Stukes": { grade: 65, positionRank: 6, comp: "Antoine Winfield Jr." },
  "Ted Hurst": { grade: 65, positionRank: 13, comp: "Rashod Bateman" },
  "Jalon Kilgore": { grade: 65, positionRank: 7, comp: "Kyle Hamilton" },
  "Skyler Bell": { grade: 65, positionRank: 14, comp: "Darnell Mooney" },
  "Elijah Sarrett": { grade: 65, positionRank: 15, comp: "Christian Kirk" },
  "R Mason Thomas": { grade: 65, positionRank: 11, comp: "Will Anderson Jr." },

  // Ranks 76-100 (grades 58-65)
  "Keyron Crawford": { grade: 65, positionRank: 12, comp: "Travon Walker" },
  "Keith Abney II": { grade: 64, positionRank: 10, comp: "Tre'Davious White" },
  "Chris Bell": { grade: 64, positionRank: 16, comp: "Michael Pittman Jr." },
  "Domonique Orange": { grade: 63, positionRank: 7, comp: "Sheldon Rankins" },
  "Jake Slaughter": { grade: 63, positionRank: 1, comp: "Jason Kelce" },
  "Sam Hecht": { grade: 62, positionRank: 2, comp: "Creed Humphrey" },
  "Deion Burks": { grade: 62, positionRank: 17, comp: "Brandin Cooks" },
  "Zakee Wheatley": { grade: 62, positionRank: 8, comp: "Jordan Poyer" },
  "Sam Roush": { grade: 61, positionRank: 4, comp: "Cole Kmet" },
  "Caleb Tiernan": { grade: 61, positionRank: 9, comp: "Lane Johnson" },
  "Dametrious Crownover": { grade: 61, positionRank: 10, comp: "Jedrick Wills" },
  "Garrett Nussmeier": { grade: 60, positionRank: 3, comp: "Matthew Stafford" },
  "Jaishawn Barham": { grade: 60, positionRank: 13, comp: "Rashan Gary" },
  "Kyle Louis": { grade: 60, positionRank: 8, comp: "Devin White" },
  "Ja'Kobi Lane": { grade: 59, positionRank: 18, comp: "DeVonta Smith" },
  "Davison Igbinosun": { grade: 59, positionRank: 11, comp: "Derek Stingley Jr." },
  "Justin Joly": { grade: 59, positionRank: 5, comp: "Dalton Schultz" },
  "Gracen Halton": { grade: 58, positionRank: 8, comp: "Ed Oliver" },
  "Joshua Josephs": { grade: 58, positionRank: 14, comp: "Marcus Davenport" },
  "Bryce Lance": { grade: 58, positionRank: 19, comp: "Garrett Wilson" },
  "Dani Dennis-Sutton": { grade: 58, positionRank: 15, comp: "Gregory Rousseau" },
  "VJ Payne": { grade: 58, positionRank: 9, comp: "Tyrann Mathieu" },
  "Kamari Ramsey": { grade: 58, positionRank: 10, comp: "Xavier McKinney" },
  "Albert Regis": { grade: 58, positionRank: 9, comp: "Vita Vea" },
  "Logan Jones": { grade: 58, positionRank: 3, comp: "Frank Ragnow" },

  // Ranks 101-150 (grades 50-58)
  "Romello Height": { grade: 57, positionRank: 16, comp: "Yannick Ngakoue" },
  "Jack Endries": { grade: 57, positionRank: 6, comp: "Hayden Hurst" },
  "LT Overton": { grade: 57, positionRank: 17, comp: "Chandler Jones" },
  "Brian Parker II": { grade: 56, positionRank: 5, comp: "Chris Lindstrom" },
  "Michael Trigg": { grade: 56, positionRank: 7, comp: "Evan Engram" },
  "Jalen Farmer": { grade: 56, positionRank: 6, comp: "Wyatt Teller" },
  "Deontae Lawson": { grade: 56, positionRank: 9, comp: "Lavonte David" },
  "Connor Lew": { grade: 55, positionRank: 4, comp: "Tyler Linderbaum" },
  "Will Lee III": { grade: 55, positionRank: 12, comp: "Charvarius Ward" },
  "Nicholas Singleton": { grade: 55, positionRank: 4, comp: "Josh Jacobs" },
  "Trey Zuhn III": { grade: 55, positionRank: 11, comp: "Garett Bolles" },
  "Harold Perkins Jr.": { grade: 54, positionRank: 10, comp: "Shaquille Leonard" },
  "Darrell Jackson Jr.": { grade: 54, positionRank: 10, comp: "Jeffery Simmons" },
  "Chris McClellan": { grade: 54, positionRank: 11, comp: "Daron Payne" },
  "Tyler Onyedim": { grade: 53, positionRank: 12, comp: "Justin Madubuike" },
  "Taylen Green": { grade: 53, positionRank: 4, comp: "Jalen Hurts" },
  "Daylen Everette": { grade: 53, positionRank: 13, comp: "Pat Surtain II" },
  "Carson Beck": { grade: 53, positionRank: 5, comp: "Kirk Cousins" },
  "Anez Cooper": { grade: 52, positionRank: 7, comp: "Dalton Risner" },
  "Tacario Davis": { grade: 52, positionRank: 14, comp: "Richard Sherman" },
  "Drew Shelton": { grade: 52, positionRank: 12, comp: "Kolton Miller" },
  "Josh Cameron": { grade: 52, positionRank: 20, comp: "Diontae Johnson" },
  "Eli Raridon": { grade: 51, positionRank: 8, comp: "Noah Fant" },
  "Devin Moore": { grade: 51, positionRank: 15, comp: "Nnamdi Asomugha" },
  "Austin Barber": { grade: 51, positionRank: 13, comp: "D.J. Humphries" },
  "DeMonte Capehart": { grade: 51, positionRank: 13, comp: "Poona Ford" },
  "Genesis Smith": { grade: 51, positionRank: 11, comp: "Marcus Williams" },
  "Emmett Johnson": { grade: 50, positionRank: 5, comp: "Alvin Kamara" },
  "Jadon Canady": { grade: 50, positionRank: 12, comp: "Quandre Diggs" },
  "Chandler Rivers": { grade: 50, positionRank: 16, comp: "James Bradberry" },
  "Drew Allar": { grade: 50, positionRank: 6, comp: "Andy Dalton" },
  "George Gumbs Jr.": { grade: 50, positionRank: 18, comp: "Emmanuel Ogbah" },
  "Joe Royer": { grade: 50, positionRank: 9, comp: "Hunter Henry" },
  "Jude Bowry": { grade: 50, positionRank: 14, comp: "Terron Armstead" },
  "Rayshaun Benny": { grade: 50, positionRank: 14, comp: "Akiem Hicks" },
  "Demond Claiborne": { grade: 50, positionRank: 6, comp: "Raheem Mostert" },
  "Adam Randall": { grade: 50, positionRank: 7, comp: "David Montgomery" },
  "J'Mari Taylor": { grade: 50, positionRank: 8, comp: "Dameon Pierce" },
  "Kevin Coleman Jr.": { grade: 50, positionRank: 21, comp: "Curtis Samuel" },
  "Kage Casey": { grade: 50, positionRank: 15, comp: "Taylor Decker" },
  "Jeremiah Wright": { grade: 50, positionRank: 8, comp: "Kenyon Green" },
  "Charles Demmings": { grade: 50, positionRank: 17, comp: "Carlton Davis" },
  "Jakobe Thomas": { grade: 50, positionRank: 13, comp: "Talanoa Hufanga" },
  "Le'Veon Moss": { grade: 50, positionRank: 9, comp: "James Conner" },
  "Brenen Thompson": { grade: 50, positionRank: 22, comp: "Mecole Hardman" },
  "Jeff Caldwell": { grade: 50, positionRank: 23, comp: "Zay Jones" },
  "Kaytron Allen": { grade: 50, positionRank: 10, comp: "Kareem Hunt" },
  "Roman Hemby": { grade: 50, positionRank: 11, comp: "Miles Sanders" },
  "Zane Durant": { grade: 50, positionRank: 15, comp: "Christian Wilkins" },
  "Kaleb Elarms-Orr": { grade: 50, positionRank: 11, comp: "Jordyn Brooks" },

  // Ranks 151-200 (grades 42-50)
  "Trey Moore": { grade: 50, positionRank: 19, comp: "Carl Lawson" },
  "Bryce Boettcher": { grade: 49, positionRank: 12, comp: "De'Vondre Campbell" },
  "Keagen Trost": { grade: 49, positionRank: 16, comp: "Jawaan Taylor" },
  "Jonah Coleman": { grade: 48, positionRank: 12, comp: "Tony Pollard" },
  "Cole Payton": { grade: 48, positionRank: 7, comp: "Sam Darnold" },
  "Josh Cuevas": { grade: 48, positionRank: 10, comp: "Dawson Knox" },
  "Parker Brailsford": { grade: 47, positionRank: 5, comp: "Corey Linsley" },
  "Matt Gulbin": { grade: 47, positionRank: 6, comp: "Erik McCoy" },
  "Ephesians Prysock": { grade: 47, positionRank: 18, comp: "Donte Jackson" },
  "Nate Boerkircher": { grade: 46, positionRank: 11, comp: "Mike Gesicki" },
  "Dontay Corleone": { grade: 46, positionRank: 16, comp: "D.J. Reader" },
  "Jimmy Rolder": { grade: 46, positionRank: 13, comp: "Alex Anzalone" },
  "Alex Harkey": { grade: 46, positionRank: 9, comp: "Andrew Norwell" },
  "Domani Jackson": { grade: 45, positionRank: 19, comp: "Rasul Douglas" },
  "Lake McRee": { grade: 45, positionRank: 12, comp: "Tyler Conklin" },
  "Hezekiah Masses": { grade: 45, positionRank: 20, comp: "Fabian Moreau" },
  "J. Michael Sturdivant": { grade: 45, positionRank: 24, comp: "Kalif Raymond" },
  "Malik Benson": { grade: 44, positionRank: 25, comp: "Nelson Agholor" },
  "Caden Curry": { grade: 44, positionRank: 20, comp: "Jadeveon Clowney" },
  "Oscar Delp": { grade: 44, positionRank: 13, comp: "Mark Andrews" },
  "Billy Schrauth": { grade: 44, positionRank: 10, comp: "Kevin Zeitler" },
  "Markel Bell": { grade: 43, positionRank: 17, comp: "Morgan Moses" },
  "Julian Neal": { grade: 43, positionRank: 21, comp: "Tre Hernandez" },
  "Robert Spears-Jennings": { grade: 43, positionRank: 14, comp: "Jalen Thompson" },
  "Bryson Eason": { grade: 43, positionRank: 17, comp: "Ndamukong Suh" },
  "Riley Nowakowski": { grade: 43, positionRank: 14, comp: "Robert Tonyan" },
  "Michael Taaffe": { grade: 42, positionRank: 15, comp: "Jordan Whitehead" },
  "Will Kacmarek": { grade: 42, positionRank: 15, comp: "David Njoku" },
  "Marlin Klein": { grade: 42, positionRank: 16, comp: "Juwan Johnson" },
  "Colbie Young": { grade: 42, positionRank: 26, comp: "Donovan Peoples-Jones" },
  "Matthew Hibner": { grade: 42, positionRank: 17, comp: "C.J. Uzomah" },
  "Justin Jefferson": { grade: 42, positionRank: 14, comp: "Kyzir White" },
  "Seth McGowan": { grade: 42, positionRank: 13, comp: "Kenyan Drake" },
  "Nick Barrett": { grade: 42, positionRank: 18, comp: "Bilal Nichols" },
  "Cameron Ball": { grade: 42, positionRank: 19, comp: "Dalvin Tomlinson" },
  "Isaiah World": { grade: 42, positionRank: 18, comp: "Cam Robinson" },
  "Tim Keenan III": { grade: 42, positionRank: 20, comp: "Larry Ogunjobi" },
  "Bishop Fitzgerald": { grade: 42, positionRank: 16, comp: "Eddie Jackson" },
  "Fernando Carmona": { grade: 42, positionRank: 19, comp: "Jack Conklin" },
  "Toriano Pride Jr.": { grade: 42, positionRank: 22, comp: "Eli Apple" },
  "Luke Altmyer": { grade: 42, positionRank: 8, comp: "Baker Mayfield" },
  "TJ Hall": { grade: 42, positionRank: 23, comp: "Amani Oruwariye" },
  "Caleb Douglas": { grade: 42, positionRank: 27, comp: "Nico Collins" },
  "Pat Coogan": { grade: 42, positionRank: 7, comp: "Ryan Kelly" },
  "Scooby Williams": { grade: 42, positionRank: 15, comp: "Eric Kendricks" },
  "Jaeden Roberts": { grade: 42, positionRank: 11, comp: "Nate Davis" },
  "Diego Pounds": { grade: 42, positionRank: 20, comp: "Charles Leno Jr." },
  "Lander Barton": { grade: 42, positionRank: 16, comp: "Nick Bolton" },
  "Taurean York": { grade: 42, positionRank: 17, comp: "Frankie Luvu" },
  "Aiden Fisher": { grade: 42, positionRank: 18, comp: "Demario Davis" },

  // Ranks 201-250 (grades 35-42)
  "Dae'Quan Wright": { grade: 42, positionRank: 18, comp: "Irv Smith Jr." },
  "Barion Brown": { grade: 41, positionRank: 28, comp: "KJ Osborn" },
  "Owen Heinecke": { grade: 41, positionRank: 19, comp: "Josey Jewell" },
  "Behren Morton": { grade: 41, positionRank: 9, comp: "Teddy Bridgewater" },
  "Aaron Anderson": { grade: 41, positionRank: 29, comp: "Jahan Dotson" },
  "Louis Moore": { grade: 40, positionRank: 17, comp: "Jabrill Peppers" },
  "Kaleb Proctor": { grade: 40, positionRank: 21, comp: "DJ Jones" },
  "Brandon Cleveland": { grade: 40, positionRank: 22, comp: "B.J. Hill" },
  "Jam Miller": { grade: 40, positionRank: 14, comp: "Khalil Herbert" },
  "Jack Kelly": { grade: 39, positionRank: 21, comp: "Uchenna Nwosu" },
  "Ar'Maj Reed-Adams": { grade: 39, positionRank: 12, comp: "Cody Whitehair" },
  "Harrison Wallace III": { grade: 39, positionRank: 30, comp: "Mack Hollins" },
  "Tanner Koziol": { grade: 39, positionRank: 19, comp: "Logan Thomas" },
  "Patrick Payton": { grade: 38, positionRank: 22, comp: "Kwity Paye" },
  "Reggie Virgil": { grade: 38, positionRank: 31, comp: "Tre'Quan Smith" },
  "Kaelon Black": { grade: 38, positionRank: 15, comp: "Roschon Johnson" },
  "Skyler Gill-Howard": { grade: 38, positionRank: 23, comp: "Neville Gallimore" },
  "John Michael Gyllenborg": { grade: 37, positionRank: 20, comp: "Brock Wright" },
  "Namdi Obiazor": { grade: 37, positionRank: 20, comp: "Divine Deablo" },
  "Eric Gentry": { grade: 37, positionRank: 21, comp: "Jeremiah Owusu-Koramoah" },
  "Logan Taylor": { grade: 37, positionRank: 13, comp: "Austin Corbett" },
  "Sawyer Robertson": { grade: 37, positionRank: 10, comp: "Davis Mills" },
  "Zavion Thomas": { grade: 37, positionRank: 32, comp: "Van Jefferson" },
  "Dalton Johnson": { grade: 36, positionRank: 18, comp: "Jevon Holland" },
  "DJ Rogers": { grade: 36, positionRank: 21, comp: "Gerald Everett" },
  "Lorenzo Styles Jr.": { grade: 36, positionRank: 19, comp: "Taylor Rapp" },
  "Thaddeus Dixon": { grade: 36, positionRank: 24, comp: "Rock Ya-Sin" },
  "Jalen Huskey": { grade: 36, positionRank: 25, comp: "Mike Hughes" },
  "Robert Henry Jr.": { grade: 35, positionRank: 16, comp: "Ty Chandler" },
  "Wesley Bissainthe": { grade: 35, positionRank: 22, comp: "Quay Walker" },
  "DeShon Singleton": { grade: 35, positionRank: 20, comp: "Donovan Wilson" },
  "Cade Klubnik": { grade: 35, positionRank: 11, comp: "Daniel Jones" },
  "Collin Wright": { grade: 35, positionRank: 26, comp: "Tariq Woolen" },
  "Dallen Bentley": { grade: 35, positionRank: 22, comp: "Cade Otton" },
  "Wade Woodaz": { grade: 35, positionRank: 23, comp: "Pete Werner" },
  "James Brockermeyer": { grade: 35, positionRank: 8, comp: "Ben Jones" },
  "Eli Heidenreich": { grade: 35, positionRank: 17, comp: "Samaje Perine" },
  "Joey Aguilar": { grade: 35, positionRank: 12, comp: "Trevor Siemian" },
  "Cole Wisniewski": { grade: 35, positionRank: 21, comp: "Vonn Bell" },
  "Haynes King": { grade: 35, positionRank: 13, comp: "Tyrod Taylor" },
  "Quintayvious Hutchins": { grade: 35, positionRank: 23, comp: "Nolan Smith" },
  "Aamil Wagner": { grade: 35, positionRank: 21, comp: "Rashawn Slater" },
  "David Blay Jr.": { grade: 35, positionRank: 24, comp: "DeForest Buckner" },
  "RJ Maryland": { grade: 35, positionRank: 23, comp: "Jonnu Smith" },
  "Vincent Anthony Jr.": { grade: 35, positionRank: 24, comp: "Sam Hubbard" },
  "Kam Dewberry": { grade: 35, positionRank: 14, comp: "Andrus Peat" },
  "Jack Pyburn": { grade: 35, positionRank: 25, comp: "Derek Barnett" },
  "Jacobian Guillory II": { grade: 35, positionRank: 25, comp: "Derrick Brown" },
  "Joe Fagnano": { grade: 35, positionRank: 14, comp: "Jacoby Brissett" },
  "Tyren Montgomery": { grade: 35, positionRank: 33, comp: "Kadarius Toney" },
};

// Enhanced scouting notes for top 50 prospects
const ENHANCED_NOTES: Record<string, string> = {
  "Arvell Reese": `Generational linebacker prospect who plays with rare combination of size (6-3, 240), speed (4.46 40), and instincts. Led the FBS in tackles for loss with 24.5 while also collecting 8 sacks. In coverage, he carries slot receivers down the seam and has the hip fluidity to mirror tight ends in man coverage — a unicorn skill set at the position. Against the run, he shoots gaps with devastating timing and wraps up securely in the open field. His 38-inch vertical and 124-inch broad jump confirm the elite explosiveness visible on film. The only knock is occasional over-aggressiveness reading play-action, which can leave him out of position. Bottom line: The best linebacker prospect since Micah Parsons with legitimate three-down impact potential.`,

  "Fernando Mendoza": `Elite quarterback prospect with exceptional arm talent and field vision. Threw for 4,200+ yards and 38 touchdowns in his final season at Cal. Displays outstanding accuracy on all three levels — his 71% completion rate ranks among the best in recent draft classes. Excels at reading coverages pre-snap and manipulating safeties with his eyes. His release is compact and quick, allowing him to fit balls into tight windows. Under pressure, he shows remarkable poise, sliding in the pocket and delivering strikes rather than panicking. Weaknesses include occasional hero-ball tendencies on third down and a frame (6-2, 215) that some teams wish were bigger. Ran a 4.72 40 at the combine. Bottom line: The most complete QB in this class with the highest floor and ceiling — a franchise-caliber talent.`,

  "David Bailey": `Premier edge rusher who wins with an elite combination of length (6-5, 265), bend, and a devastating dip/rip move off the edge. Recorded 14 sacks and 22 pressures in his final season. His first step is explosive — he consistently wins the get-off battle against NFL-caliber tackles. The counter moves are advanced for a college rusher: he chains a lethal spin move off his speed rush and has developed an effective bull rush using his 35-inch arms. Set pieces and stunt work are already polished. Run defense has improved significantly — he sets the edge and doesn't get washed. Ran a 4.58 40 at 265 pounds at the combine. Needs to add more pass-rush moves for third-and-long situations. Bottom line: An immediate impact edge rusher with Pro Bowl upside and the traits to develop into a dominant force.`,

  "Jeremiyah Love": `Explosive dual-threat running back out of Notre Dame who combines elite speed with refined vision. Clocked a blazing 4.38 40-yard dash at the combine, the fastest among RBs. Rushed for 1,600+ yards and 16 touchdowns, adding 45 catches out of the backfield. His burst through the hole is violent — he hits the crease and accelerates to top speed in two steps. As a receiver, he runs crisp routes from the slot and is a legitimate mismatch weapon on wheel routes. In pass protection, he's willing and technically sound, taking on blitzing linebackers with good leverage. The concern is durability — he carried a heavy workload and missed two games with a hamstring injury. Bottom line: A three-down back with game-breaking speed who can be the centerpiece of an NFL offense from day one.`,

  "Francis Mauigoa": `Mauling offensive tackle from Florida who plays with a nasty, physical edge. At 6-6, 320, he's one of the most powerful blockers in this class — 29 reps on bench press at the combine. Dominates in the run game with violent initial contact and relentless finishing through the whistle. His pass protection has improved dramatically — he's cleaned up his hand timing and learned to use his length to keep rushers at bay. Projects best at right tackle but has left tackle experience. Foot speed is adequate but not elite against top-tier speed rushers. Bottom line: A road-grading tackle with elite power who will transform a team's rushing attack from day one.`,

  "Caleb Downs": `Elite safety prospect from Alabama who combines range, ball skills, and physicality. Led the SEC in interceptions with 6 while also recording 95 tackles — an absurd combination of production. His 4.42 40 and 38-inch vertical at the combine confirm the elite athleticism visible on film. In single-high, he covers sideline to sideline with ease and has a nose for the ball. As a blitzer, he's timed perfectly and finishes at the quarterback. In run support, he fills the alley and delivers violent hits within the rules. Communication and leadership are off the charts — he was Alabama's defensive signal-caller. Can be over-aggressive jumping routes. Bottom line: The most complete safety in this class who will be an immediate starter and defensive leader.`,

  "Sonny Styles": `Versatile linebacker/safety hybrid who played multiple positions in Ohio State's defense. At 6-4, 225, he has rare size for his athleticism — posted a 4.49 40 and a 39-inch vertical at the combine. Excels in zone coverage, reading the quarterback's eyes and driving on throws with closing speed. As a blitzer, his length and burst create problems for pass protectors who can't get hands on him. Tackling is physical and sure — he had just 4 missed tackles in 120 attempts. The questions center on his best position at the next level: he may be too big for safety and too coverage-oriented for traditional linebacker. Bottom line: A chess piece defender whose versatility is both his greatest asset and the source of his biggest question mark.`,

  "Mansoor Delane": `Lockdown corner from Texas A&M with elite ball skills and competitive fire. Allowed just 32% completion rate in coverage — the lowest among Power 5 corners. His 4.35 40-yard dash and 6-1 frame give him the speed-length combination that NFL teams covet. In press coverage, his jam at the line is physical and precise, re-routing receivers and disrupting timing. He plays the ball in the air like a receiver — 7 interceptions and 18 pass breakups over his final two seasons. His tackling in run support is aggressive and sure. Occasionally gets grabby against elite route runners, drawing penalties. Bottom line: The most complete corner in this class with true shutdown potential from day one.`,

  "Rueben Bain Jr.": `Powerful interior-exterior hybrid rusher from Miami who combines old-school power with modern athleticism. At 6-4, 280, he ran a 4.72 40 and put up 28 bench press reps at the combine — rare power-speed combination. His bull rush is legitimately overwhelming; he drove NFL-prospect guards into the quarterback's lap repeatedly on film. Also wins with a quick swim move that belies his size. Recorded 11 sacks from multiple alignments — he lined up at 3-tech, 5-tech, and stand-up EDGE. Against the run, he's an anchor who eats double teams. Needs to develop more counter moves when his initial rush is stalled. Bottom line: A plug-and-play pass rusher whose positional versatility and power give defensive coordinators multiple options.`,

  "Makai Lemon": `Dynamic playmaker from USC who is the most complete receiver in this class. Ran a 4.39 40-yard dash and posted a 40-inch vertical at the combine. Caught 95 passes for 1,350 yards and 14 touchdowns, also contributing as a rusher (18 carries, 220 yards) and return man. His route running is advanced — he varies his tempo, sells fakes with subtle body language, and creates separation at the top of routes. After the catch, he's a nightmare: his elusiveness in space turns short passes into explosive plays. Blocks willingly on the perimeter and in the screen game. Can be inconsistent with contested catches despite having the physical tools. Bottom line: A do-everything offensive weapon who will produce immediately as a WR1 with WR/gadget versatility.`,

  "Kenyon Sadiq": `Physically imposing tight end from Virginia Tech who combines basketball athleticism with natural receiving instincts. At 6-5, 250, he ran a 4.55 40 and showed exceptional body control in contested-catch drills at the combine. His catch radius is enormous — he high-points the ball and shields defenders with his frame. As a route runner, he's surprisingly fluid for his size, creating separation on crossers and seam routes. In the red zone, he's nearly unguardable — linebackers can't match his athleticism and safeties can't match his size. Blocking remains a developmental area; he's willing but inconsistent with technique. His basketball background shows in his spatial awareness and timing. Bottom line: The most dynamic pass-catching tight end in this class with matchup-nightmare upside.`,

  "Jordyn Tyson": `Explosive receiver from Arizona State who terrorized Pac-12 defenses with his speed and route-running ability. His 4.36 40-yard dash makes him one of the fastest receivers in this class. Caught 82 passes for 1,200 yards and 12 touchdowns. Creates separation with sudden breaks and acceleration out of cuts — his change-of-direction is elite. He's at his best on deep crossers and post routes where he can use his speed to run away from coverage. Adjusts well to the ball downfield. Can improve consistency as a blocker and adding routes to beat press coverage. Bottom line: A speed-and-separation receiver who stretches defenses and provides big-play ability from the slot or outside.`,

  "Carnell Tate": `Silky-smooth route runner from Ohio State with natural hands and outstanding body control. At 6-2, 205, he ran a 4.44 40 and showed excellent change-of-direction in the 3-cone drill (6.82). His route tree is the most diverse in this class — he's equally dangerous running deep posts, intermediate crossers, and short comeback routes. Tracks the deep ball beautifully and adjusts to underthrown passes with ease. In the red zone, his catch radius and back-shoulder technique make him a high-percentage target. Not the most explosive after the catch and won't consistently break tackles. Bottom line: A polished technician who projects as a reliable WR1 with Pro Bowl upside in the right offense.`,

  "Monroe Freeling": `Long, athletic offensive tackle from Georgia who glides in pass protection with natural mirror ability. At 6-7, 310, he ran a 4.98 40 — elite movement for his size. His kick slide is effortless, and he maintains balance through contact, rarely getting caught lunging. Uses his length well to keep rushers at bay and resets his hands quickly when beaten initially. In the run game, he reaches the second level and sustains blocks on linebackers in space. Started three seasons at left tackle in the SEC, providing proven durability. Can get too upright at the point of attack and loses leverage against powerful bull rushers. Bottom line: A prototypical left tackle with the length, movement, and experience to start immediately.`,

  "Olaivavega Ioane": `Dominant interior lineman from BYU who anchored one of the nation's best rushing attacks. At 6-4, 325, he moves with shocking agility — his 5.15 40 is elite for his size. Put up 32 reps on bench press at the combine. In the run game, he creates massive movement at the point of attack with his combination of strength, leverage, and finishing mentality. In pass protection, his anchor is immovable and his punch timing is NFL-ready. He started at both guard and center, showing the versatility teams value. Occasionally late on combo blocks to the second level. Bottom line: The most pro-ready interior lineman in this class — a plug-and-play starter with All-Pro potential.`,

  "Jermod McCoy": `Physical cornerback from Texas who brings a rare combination of size (6-2, 200) and coverage skills. Allowed just 38% completion rate and recorded 5 interceptions. His press technique is NFL-ready — he jams at the line and uses his length to stay in the receiver's frame. In zone coverage, he reads route combinations quickly and jumps underneath throws. Has the speed (4.40 40) and length to match up with the bigger receivers in the NFL. An aggressive tackler who doesn't shy away from run support. Can get too physical downfield and draw flags in critical moments. Bottom line: A physical, press-man corner with the size and speed profile that NFL teams crave.`,

  "Kadyn Proctor": `Massive offensive tackle from Iowa who brings old-school physicality to a modern game. At 6-7, 335, he's one of the biggest linemen in this class but moves well enough to handle NFL speed. His power in the run game is devastating — he drives defenders off the ball and finishes blocks with authority. Pass protection technique has improved each year, and his anchor against bull rushes is nearly impossible to move. Questions persist about his lateral agility against top-tier speed rushers off the edge. Durability concerns after missing time in his sophomore season. Bottom line: A mauling run blocker with the size and power to dominate at right tackle, with upside if his pass protection continues to develop.`,

  "Akheem Mesidor": `Relentless edge rusher from Miami who wins with motor, power, and an expanding repertoire of pass-rush moves. At 6-3, 260, he posted a 4.61 40 and 35-inch vertical. Led the ACC in sacks with 12.5 while adding 18 quarterback hurries. His get-off is explosive and he plays with a non-stop motor that wears down offensive tackles over four quarters. The bull rush is his bread and butter — he converts speed to power at contact and collapses the pocket. Has developed a reliable inside counter move. Against the run, he holds the point of attack and doesn't give ground. Can get too narrow rushing the arc and lose contain on mobile quarterbacks. Bottom line: A high-floor edge defender who will contribute as a rotational rusher immediately with starter upside.`,

  "Spencer Fano": `Athletic offensive tackle from Utah who is the most technically refined blocker in this class. At 6-5, 305, he ran a 4.95 40 and showed outstanding lateral agility in pass protection drills. His kick slide is smooth and balanced, and he mirrors speed rushers with ease. Uses excellent hand placement and timing to neutralize bull rushes. In the run game, he gets to the second level and sustains blocks on linebackers. Started 39 consecutive games at left tackle — the durability and consistency are remarkable. His frame could support more mass without losing athleticism. Bottom line: A day-one starting left tackle with the technique and movement skills to develop into a franchise cornerstone.`,

  "Dillon Thiemann": `Instinctive safety from Iowa State who plays the game like a 10-year veteran. At 6-1, 205, he ran a 4.48 40 and showed excellent ball skills at the combine. Led the Big 12 in interceptions with 7 while also recording 85 tackles. His pre-snap reads are outstanding — he consistently positions himself to jump routes and drive on throws. In run support, he fills quickly and tackles efficiently, rarely missing in the open field. Communication skills are elite — he directed the secondary and made defensive adjustments at the line. Doesn't have top-end closing speed against the fastest receivers in the league. Physical tools are good, not great. Bottom line: A smart, reliable safety who will start early in his career and provide consistency in the backend of any defense.`,

  "Emmanuel McNeil-Warren": `Rangy safety from Alabama who covers ground in the deep third with elite long speed. At 6-2, 210, he ran a 4.40 40 — the fastest among safety prospects at the combine. His range in single-high is remarkable, and he closes on throws to the boundary with burst that erases cushion in a hurry. Has developed into a willing tackler in run support after entering college as primarily a coverage player. Ball skills are above average — 4 interceptions and 11 pass breakups over two seasons. Can improve his angles in run support and get more physical at the point of attack. Bottom line: A rangy centerfield safety with the speed and coverage instincts to start in a two-high scheme immediately.`,

  "Avieon Terrell": `Smooth, technically sound cornerback from Clemson with excellent footwork and ball skills. At 6-0, 190, he ran a 4.38 40 and showed fluid hips in the gauntlet drill. Allowed just 41% completion rate in coverage with 4 interceptions. His technique in press and off coverage is equally polished — he can play multiple schemes without a learning curve. Excels at reading the quarterback's eyes in zone coverage and jumping underneath routes. His tackling is sure and aggressive despite his lean frame. Lacks elite length and may struggle against bigger receivers at the catch point. Bottom line: A technically polished corner who can step in as a day-one starter in any coverage scheme.`,

  "Denzel Boston": `Big-bodied receiver from Washington who dominates at the catch point with his size and physicality. At 6-3, 215, he ran a 4.47 40 and showed outstanding hands throughout the combine. Caught 78 passes for 1,150 yards and 11 touchdowns. He wins contested catches at an elite rate — defenders simply can't out-position him at the high point. His route running has improved dramatically, and he now creates separation with subtle releases and tempo changes rather than relying solely on physicality. In the red zone, he's a cheat code with his catch radius and body control on back-shoulder fades. Not a dynamic after-the-catch threat and won't consistently win with separation against elite press corners. Bottom line: A physical possession receiver with red-zone dominance who projects as a reliable WR1 in a complementary offense.`,

  "Omar Cooper Jr.": `Quick-twitch slot receiver from Kansas State who is one of the most elusive players in this draft class. At 5-11, 185, he ran a 4.37 40 and posted elite agility numbers in the short shuttle and 3-cone drills. Caught 88 passes for 1,100 yards and 10 touchdowns, with most production coming from the slot. His route running from inside alignments is exceptional — he eats up cushion with controlled stems and explodes out of breaks. After the catch, he makes defenders miss with sharp cuts and acceleration. Added value as a punt returner with two return touchdowns. His slight frame raises durability concerns, and he'll struggle against physical press coverage from bigger corners on the outside. Bottom line: A dynamic slot weapon with elite quickness who will produce immediately in a spread offense.`,

  "Keldric Faulk": `Powerful, versatile edge rusher from Auburn who projects as a high-floor defensive end with upside. At 6-4, 270, he ran a 4.65 40 and showed impressive power in combine drills. Recorded 10 sacks and 15 tackles for loss playing both stand-up and hand-down alignments. His bull rush is his best weapon — he walks tackles backward with heavy hands and relentless leg drive. Has also shown the ability to win around the arc with a long-arm move that keeps blockers at bay. Sets the edge consistently against the run and is rarely moved off his spot. Needs to develop a more diverse counter-rush package and can be slow to redirect against misdirection plays. Bottom line: A physical, high-motor edge defender who can contribute as a starter with his run-stopping ability and developing pass-rush repertoire.`,

  "Kayden McDonald": `Massive, space-eating defensive tackle from Ohio State who commands double teams and controls the interior. At 6-3, 325, he ran a 5.05 40 and put up 30 bench press reps. His first-step quickness for his size is startling — he gets into the backfield before guards can set their hands. Has developed a devastating two-gap ability that plugs running lanes and frees up linebackers. Recorded 8 sacks from the interior, showing he can rush the passer as well as stop the run. Uses his hands well to stack and shed blockers. Conditioning has been questioned — he can fade in the fourth quarter of games. Bottom line: A dominant interior presence who will anchor a run defense immediately and provide interior pressure as a bonus.`,

  "Peter Woods": `Quick, penetrating defensive tackle from Clemson who lives in the opponent's backfield. At 6-2, 290, he ran a 4.78 40 — one of the fastest times among interior linemen. His first step is explosive and he uses leverage exceptionally well despite being undersized for a traditional 3-technique. Recorded 7.5 sacks and 14 tackles for loss with elite disruption metrics. Wins with a combination of quickness, hand usage, and relentless effort. Can be moved off the ball against double teams due to his size, and pure power rushes aren't his strength. Bottom line: A disruptive interior pass rusher who thrives as a sub-package penetrator with potential to develop into a three-down player.`,

  "Caleb Lomu": `Athletic offensive tackle from BYU with elite movement skills and a mauling mentality. At 6-5, 310, he ran a 4.92 40 and showed outstanding footwork in pass protection drills. His Polynesian heritage connects him to a rich tradition of dominant NFL linemen. In the run game, he drives defenders off the ball with violent hand placement and generates tremendous push at the point of attack. His pass protection has developed significantly — he mirrors speed rushers with improved technique and maintains balance through contact. Occasionally overextends on reach blocks and loses his base. Started two seasons at left tackle in a pro-style offense. Bottom line: A physical, athletic tackle with the ceiling of a franchise left tackle if his technique continues to improve.`,

  "Zion Young": `Explosive edge rusher from Alabama who combines elite speed off the edge with developing power. At 6-3, 245, he ran a 4.50 40 — one of the fastest times among edge defenders. His speed-to-power conversion is violent when he gets it right, and his dip-and-rip around the arc is already NFL-caliber. Recorded 9.5 sacks with an impressive pressure rate. His motor runs hot and he brings effort on every snap, chasing plays down from the backside. Needs to add mass to hold up better against the run and can be over-reliant on his speed rush. Bottom line: A speed-rush specialist with the athleticism to develop into a complete edge setter with proper coaching and weight gain.`,

  "Cashius Howell": `Versatile, high-motor edge rusher from Florida State who does a little bit of everything well. At 6-4, 255, he ran a 4.58 40 and posted a 37-inch vertical. Recorded 10 sacks from multiple alignments, showing the ability to rush from both sides and drop into coverage. His pass-rush plan is mature — he sets up tackles with different looks and keeps them guessing. Strong hands allow him to disengage from blocks quickly in the run game. Brings intensity and leadership to the defensive line room. Lacks a true elite trait — he's not the fastest, strongest, or bendiest rusher. Bottom line: A complete, well-rounded edge defender who projects as an every-down starter with solid but not spectacular production.`,

  "Colton Hood": `Long, instinctive cornerback from Oklahoma who makes plays on the ball with regularity. At 6-2, 195, he ran a 4.39 40 and showed fluid change-of-direction at the combine. Recorded 5 interceptions and 14 pass breakups, with his ball production ranking among the best in the Big 12. His length allows him to contest catches at the high point, and he plays the ball aggressively without drawing excessive penalties. In zone coverage, he reads the quarterback's eyes and drives on throws with good timing. Tackling needs improvement — he tends to go high and miss in the open field. Bottom line: A ball-hawking corner with ideal size and speed who can start in a zone-heavy scheme immediately.`,

  "KC Concepcion": `Smooth, well-rounded receiver from NC State who does everything at a high level without a glaring weakness. At 6-1, 200, he ran a 4.42 40 and showed reliable hands throughout the combine. Caught 75 passes for 1,080 yards and 9 touchdowns. His route running is crisp and efficient — he gets in and out of breaks cleanly and creates consistent separation. Tracks the deep ball well and makes contested catches with body control. Contributes as a blocker on the perimeter. Doesn't have a clear elite trait that separates him from other receivers in this class. Bottom line: A well-rounded, pro-ready receiver who will contribute immediately as a WR2 with the potential to develop into more.`,

  "Chase Bisontis": `Powerful interior offensive lineman from Notre Dame who excels in the run game. At 6-4, 320, he put up 28 bench reps and showed strong anchor in pass protection drills. His pulling ability is outstanding — he reaches the second level with surprising speed and finishes blocks with authority. In-line pass protection is solid with a strong base and heavy hands. Started at both guard positions, showing scheme versatility. Has occasionally struggled with elite interior rushers who win with quickness rather than power. Communication and football IQ are praised by coaches. Bottom line: A physical, mauling guard who will improve any team's rushing attack and provide reliable pass protection from day one.`,

  "Caleb Banks": `Disruptive defensive tackle from Tennessee who plays with a motor that never quits. At 6-3, 305, he ran a 5.01 40 and demonstrated impressive power at the combine. Recorded 7 sacks and 12 tackles for loss from multiple interior alignments. His hand usage is advanced — he stacks blockers, sheds quickly, and makes plays in the backfield. Against the run, he holds the point of attack and controls gaps. Brings energy and intensity that elevates the players around him. Can be inconsistent with pad level and gets too upright against double teams. Bottom line: A high-motor interior lineman who provides disruption against both the run and pass with starting potential.`,

  "Anthony Hill Jr.": `Instinctive, physical linebacker from Texas who is a tackling machine. At 6-2, 235, he ran a 4.52 40 and showed excellent agility in the shuttle drill. Led the Big 12 in tackles with 135 while adding 8 tackles for loss. His ability to diagnose plays and flow to the ball is outstanding — he's consistently around the football. In coverage, he handles underneath zones well and can match tight ends on crossing routes. His downhill tackling is violent and sure. Lacks top-end speed to chase down faster backs on the perimeter and can get swallowed by blocks at the point of attack. Bottom line: A traditional downhill linebacker with outstanding instincts who will be a productive starter in a run-first defensive scheme.`,

  "Eli Stowers": `Athletic tight end from Texas A&M with a diverse skill set as both a receiver and blocker. At 6-4, 245, he ran a 4.60 40 and showed soft hands at the combine. Caught 55 passes for 720 yards and 8 touchdowns, serving as a primary target in the Aggies' offense. His inline blocking is solid — he anchors at the point of attack and drives defenders in the run game. As a receiver, he runs routes with purpose and finds soft spots in zone coverage. His versatility to line up inline, in the slot, and detached gives offensive coordinators flexibility. Not an explosive athlete and won't consistently separate from athletic linebackers. Bottom line: A complete, well-rounded tight end who contributes in all phases and can start early in his career.`,

  "Ty Simpson": `Talented dual-threat quarterback from Alabama with intriguing tools and developing accuracy. At 6-2, 215, he ran a 4.55 40 and showed improved mechanics at the combine. Threw for 3,400 yards and 26 touchdowns with 8 interceptions. His arm strength is above average — he can make all the NFL throws and drives the ball into tight windows. As a runner, his mobility creates explosive plays on designed runs and scrambles. His decision-making has improved but remains inconsistent, particularly under pressure. Ball placement on intermediate throws needs refinement. Bottom line: A high-ceiling, developing quarterback with starter tools who needs time to refine his game but has franchise-quarterback upside.`,

  "Brandon Cisse": `Physical, competitive cornerback from Syracuse who brings toughness and ball skills to the position. At 6-0, 195, he ran a 4.41 40 and showed excellent hip fluidity in defensive back drills. Recorded 4 interceptions and 12 pass breakups. His physicality at the line of scrimmage disrupts timing, and he's willing to mix it up in run support. In man coverage, he stays glued to receivers through their breaks with short-area quickness. Has a knack for punching the ball out at the catch point — forced 4 fumbles in his career. Can be over-aggressive and bite on double moves. Bottom line: A feisty, physical corner who competes on every snap and projects as a reliable starter in a press-man scheme.`,

  "Chris Johnson": `Smooth, technical cornerback from Oregon who excels in zone coverage schemes. At 6-1, 190, he ran a 4.42 40 and demonstrated excellent ball skills at the combine. Recorded 3 interceptions and 15 pass breakups over two seasons. His ability to read the quarterback's eyes and break on throws is among the best in this class. In zone coverage, he shows patience and awareness, staying disciplined in his assignment while reacting to the ball. His length allows him to contest catches and disrupt passing lanes. Needs to improve his press technique and can be slow to recover when beaten off the line. Bottom line: A polished zone corner with ideal size who can contribute immediately in the right defensive scheme.`,

  "Zachariah Branch": `Electric playmaker from USC who is the most dynamic returner and open-field runner in this class. At 5-9, 175, he ran a 4.28 40 — the fastest time at the combine. His game speed is even more impressive, as he routinely outruns angles in the open field. As a receiver, he's dangerous on jet sweeps, screens, and quick-game concepts. His return ability is elite — he averaged 28 yards per kick return with 3 touchdowns. Creates explosive plays in ways that don't show up in traditional receiving stats. His size limits him to a slot-only role and he'll struggle against physical press coverage. Bottom line: A speed-and-gadget weapon who transforms offenses and special teams with his electric playmaking ability.`,

  "Max Iheanachor": `Massive, powerful offensive tackle from USC who projects as a dominant run blocker at the next level. At 6-6, 330, he put up 27 bench press reps and showed improved agility in pass protection drills. His power at the point of attack is overwhelming — he moves defenders against their will in the run game. Has experience at both tackle spots and showed improvement at left tackle in his final season. His pass protection has developed but remains a question — he can get caught with his weight too far forward against speed rushers. Athletic enough to reach the second level on zone runs. Bottom line: A massive road-grader with elite run-blocking potential who needs continued pass protection development to become a complete tackle.`,

  "Chris Brazzell II": `Physical, contested-catch receiver from Alabama with a wide catch radius and strong hands. At 6-3, 210, he ran a 4.49 40 and showed outstanding high-point ability at the combine. Caught 65 passes for 950 yards and 8 touchdowns, thriving on 50/50 balls and red-zone targets. His body control at the catch point is outstanding — he adjusts to throws and shields defenders with his frame. Has improved his route running but still wins primarily with physicality rather than separation. In the blocking game, he's willing and effective on the perimeter. Doesn't create consistent separation against press corners and lacks elite after-the-catch ability. Bottom line: A physical outside receiver with reliable hands and red-zone prowess who projects as a strong WR2.`,

  "Germie Bernard": `Quick, shifty receiver from Washington who excels at creating separation and making defenders miss. At 5-11, 190, he ran a 4.40 40 and posted elite agility numbers. Caught 72 passes for 980 yards and 7 touchdowns from primarily slot alignments. His releases off the line are varied and effective — he uses head fakes, foot fire, and speed releases to gain early advantages. After the catch, his vision and elusiveness turn short throws into explosive gains. He's a sharp route runner who sits down in zones and finds windows. Slight frame limits his ability to win contested catches and may cause durability concerns at the NFL level. Bottom line: A savvy, quick slot receiver who will contribute as a reliable chain-mover with punt-return ability.`,

  "Gabe Jacas": `Long, athletic edge rusher from Miami who is still developing but has rare physical tools. At 6-5, 250, he ran a 4.55 40 and showed exceptional bend in pass-rush drills at the combine. Recorded 8.5 sacks with an impressive pressure rate, winning with length and flexibility around the arc. His ability to flatten and corner is among the best in this class. Uses his long arms to keep tackles at bay and create leverage advantages. Against the run, he needs significant development — he gets washed out of plays and struggles to set the edge consistently. Motor can be inconsistent. Bottom line: A high-ceiling developmental edge rusher with elite physical tools who needs coaching to refine his technique and consistency.`,

  "CJ Allen": `Downhill, physical linebacker from Georgia who excels in run defense with outstanding instincts. At 6-1, 230, he ran a 4.55 40 and showed solid athleticism at the combine. Recorded 110 tackles with 10 tackles for loss in the SEC. His ability to fill running lanes and take on blockers is outstanding — he plays with physicality and aggression that offenses must account for. His tackling technique is fundamentally sound, wrapping up consistently. Coverage remains a work in progress — he lacks the fluidity to carry routes vertically and can be exploited by athletic tight ends. Plays with high football IQ and makes the right reads consistently. Bottom line: A reliable, physical linebacker who projects as a run-stuffing starter with limitations in passing situations.`,

  "Jacob Rodriguez": `Versatile, athletic linebacker from Texas Tech who has developed rapidly over the past two seasons. At 6-2, 228, he ran a 4.50 40 and posted a 37-inch vertical. Recorded 105 tackles, 7 tackles for loss, and 3 interceptions — showing he can contribute in all phases. His sideline-to-sideline range is impressive, and he closes on ball carriers with burst. In coverage, he has the athleticism to match running backs and tight ends in man coverage. His blitz ability is underrated — he times his rushes well and finishes at the quarterback. Can get caught up in traffic and struggle to disengage from blocks. Bottom line: An athletic, versatile linebacker with three-down potential who fits modern defensive schemes.`,

  "Emmanuel Pregnon": `Powerful interior offensive lineman from USC who dominates with strength and leverage. At 6-4, 330, he put up 30 bench press reps and showed solid movement skills. His anchor in pass protection is outstanding — he rarely gets driven back and handles power rushers with ease. In the run game, he generates significant push at the point of attack and finishes blocks. Started at both guard spots and showed the ability to handle different blocking schemes. Can struggle with elite quickness on the interior — speed rushers can get around him. Bottom line: A strong, physical guard who provides immediate starting-caliber play in the run game with reliable pass protection.`,

  "Keionte Scott": `Long, physical cornerback from Cincinnati who uses his length to disrupt receivers throughout routes. At 6-2, 200, he ran a 4.38 40 — elite speed for his size. Recorded 3 interceptions and 10 pass breakups. His press technique is advanced — he uses his long arms to jam receivers and redirect their routes. In off coverage, his click-and-close ability is outstanding, and he shows good anticipation jumping routes. Has the physical profile that NFL teams covet for their outside corner position. Can get handsy downfield and draw penalties when he loses leverage. Tackling technique needs refinement despite his willingness. Bottom line: A long, fast press corner with ideal physical traits who can develop into a starting outside corner.`,

  "Christen Miller": `Powerful, disruptive interior defender from Georgia who has been a force in the middle of one of college football's best defenses. At 6-3, 310, he ran a 5.02 40 and showed impressive strength at the combine. Recorded 6 sacks from the interior with elite disruption metrics. His power at the point of attack is overwhelming — he bull-rushes guards into the quarterback's lap. His first step is quick for his size, and he penetrates gaps before blockers can set. Against the run, he controls his gap and stacks blockers effectively. Needs to develop a wider array of pass-rush moves beyond his power game. Bottom line: A powerful, disruptive interior defender who will contribute as a run-stuffer and interior rusher from day one.`,

  "Jadarian Price": `Elusive, patient running back from Notre Dame who combines excellent vision with smooth cutting ability. At 5-11, 205, he ran a 4.45 40 and posted strong agility numbers. Rushed for 1,100 yards and 10 touchdowns behind an elite offensive line. His patience and vision are his best traits — he waits for lanes to develop and makes one decisive cut to explode through the hole. As a pass catcher, he's natural and comfortable, catching 35 passes out of the backfield. His pass protection is willing and improving. Lacks elite top-end speed and breakaway ability — he won't consistently outrun angles at the NFL level. Bottom line: A steady, dependable running back with good vision and receiving ability who projects as a complementary back in a committee.`,
};

async function main() {
  const prospects = await db
    .select()
    .from(players)
    .where(isNotNull(players.rank));

  console.log(`Found ${prospects.length} prospects to enrich with combine data`);

  let updated = 0;
  let skipped = 0;

  for (const prospect of prospects) {
    const scouting = SCOUTING_DATA[prospect.name];
    if (!scouting) {
      console.log(`  SKIP ${prospect.name} — no scouting data`);
      skipped++;
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

    console.log(`  OK   ${prospect.name} — grade ${scouting.grade}, pos #${scouting.positionRank}, comp: ${scouting.comp}${enhancedNotes ? " [+notes]" : ""}`);
    updated++;
  }

  console.log(`\nDone: ${updated} prospects enriched, ${skipped} skipped`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
