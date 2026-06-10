import type {
  OpponentPool,
  PerformanceProfile,
  ReportHistoryEntry,
  SimulationReport,
  SimulationSettings,
  SubmittedTeam,
} from "../types";

export const opponentPools: OpponentPool[] = [
  {
    id: "pool-all-meta-tournament",
    name: "All Meta + All Tournament",
    description:
      "Full meta pool plus tournament teams for broad matchup coverage.",
    format: "vgc-regulation-h",
    tags: ["meta", "tournament", "balanced"],
    archetypes: [
      {
        id: "arch-balance",
        name: "Balance",
        description: "Flexible cores with speed control and defensive pivots.",
        sharePercent: 28,
      },
      {
        id: "arch-rain",
        name: "Rain",
        description: "Weather offense built around fast Water pressure.",
        sharePercent: 18,
      },
      {
        id: "arch-trick-room",
        name: "Trick Room",
        description: "Slow attackers supported by redirection and setup turns.",
        sharePercent: 16,
      },
      {
        id: "arch-sun",
        name: "Sun",
        description: "Fire and Protosynthesis pressure under harsh sunlight.",
        sharePercent: 14,
      },
    ],
  },
  {
    id: "pool-sa-top-four",
    name: "S/A-Tier + Top 4 Tournament",
    description: "Strong meta teams plus top tournament finishes.",
    format: "vgc-regulation-h",
    tags: ["meta", "tournament", "rain-check"],
    archetypes: [
      {
        id: "arch-rain-balance",
        name: "Rain Balance",
        description: "Rain offense with defensive pivots and late-game speed.",
        sharePercent: 30,
      },
      {
        id: "arch-goodstuffs",
        name: "Goodstuffs",
        description: "High-stat flexible teams with broad defensive coverage.",
        sharePercent: 24,
      },
      {
        id: "arch-sun-balance",
        name: "Sun Balance",
        description: "Weather control backed by Fire and Grass pressure.",
        sharePercent: 18,
      },
    ],
  },
  {
    id: "pool-s-tier-top-tournament",
    name: "S-Tier + Top Tournament",
    description: "Highest priority meta threats and top tournament teams.",
    format: "vgc-regulation-h",
    tags: ["elite", "tournament", "trick-room-check"],
    archetypes: [
      {
        id: "arch-hard-trick-room",
        name: "Hard Trick Room",
        description: "Dedicated slow-mode teams with redirection and setup.",
        sharePercent: 34,
      },
      {
        id: "arch-hyper-offense",
        name: "Hyper Offense",
        description: "Fast pressure teams that try to win before setup matters.",
        sharePercent: 26,
      },
      {
        id: "arch-bulky-offense",
        name: "Bulky Offense",
        description: "Durable attackers with flexible defensive switching.",
        sharePercent: 22,
      },
    ],
  },
];

export const performanceProfiles: PerformanceProfile[] = [
  {
    id: "profile-balanced",
    name: "Balanced Profile",
    mode: "balanced",
    description: "Keeps simulations responsive while using spare local CPU.",
    recommendedWorkerCount: 4,
    maxWorkerCount: 6,
    targetCpuPercent: 65,
  },
  {
    id: "profile-quiet",
    name: "Quiet Profile",
    mode: "quiet",
    description: "Runs fewer workers for laptops or background usage.",
    recommendedWorkerCount: 2,
    maxWorkerCount: 3,
    targetCpuPercent: 35,
  },
  {
    id: "profile-high",
    name: "High Profile",
    mode: "high",
    description: "Uses more local workers when the user wants faster results.",
    recommendedWorkerCount: 8,
    maxWorkerCount: 10,
    targetCpuPercent: 85,
  },
];

export const submittedTeam: SubmittedTeam = {
  id: "team-sandstorm-hyper-offense",
  name: "Sandstorm Hyper Offense",
  format: "vgc-regulation-h",
  description:
    "Fast pressure team using sand chip, speed control, and priority cleanup.",
  createdAt: "2026-06-08T14:20:00.000Z",
  updatedAt: "2026-06-10T09:15:00.000Z",
  slots: [
    {
      slot: 1,
      pokemon: {
        id: "build-tyranitar",
        slot: 1,
        species: "Tyranitar",
        iconKey: "tyranitar",
        spriteKey: "tyranitar-default",
        level: 50,
        gender: "M",
        teraType: "Flying",
        item: "Assault Vest",
        ability: "Sand Stream",
        nature: "Adamant",
        moves: ["Rock Slide", "Knock Off", "Low Kick", "Tera Blast"],
        evs: { hp: 252, atk: 156, def: 4, spa: 0, spd: 76, spe: 20 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 0, spd: 31, spe: 31 },
        notes: "Primary sand setter and special sponge.",
      },
    },
    {
      slot: 2,
      pokemon: {
        id: "build-excadrill",
        slot: 2,
        species: "Excadrill",
        iconKey: "excadrill",
        spriteKey: "excadrill-default",
        level: 50,
        gender: "F",
        teraType: "Ground",
        item: "Clear Amulet",
        ability: "Sand Rush",
        nature: "Jolly",
        moves: ["High Horsepower", "Iron Head", "Protect", "Swords Dance"],
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 0, spd: 31, spe: 31 },
        notes: "Main sand sweeper and late-game cleaner.",
      },
    },
    {
      slot: 3,
      pokemon: {
        id: "build-talontail",
        slot: 3,
        species: "Talonflame",
        nickname: "Tailwind",
        iconKey: "talonflame",
        spriteKey: "talonflame-default",
        level: 50,
        gender: "F",
        teraType: "Ghost",
        item: "Covert Cloak",
        ability: "Gale Wings",
        nature: "Jolly",
        moves: ["Tailwind", "Brave Bird", "Will-O-Wisp", "Protect"],
        evs: { hp: 44, atk: 180, def: 4, spa: 0, spd: 28, spe: 252 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 0, spd: 31, spe: 31 },
        notes: "Backup speed control and burn support.",
      },
    },
    {
      slot: 4,
      pokemon: {
        id: "build-amoonguss",
        slot: 4,
        species: "Amoonguss",
        iconKey: "amoonguss",
        spriteKey: "amoonguss-default",
        level: 50,
        gender: "M",
        teraType: "Water",
        item: "Sitrus Berry",
        ability: "Regenerator",
        nature: "Relaxed",
        moves: ["Spore", "Rage Powder", "Pollen Puff", "Protect"],
        evs: { hp: 236, atk: 0, def: 156, spa: 0, spd: 116, spe: 0 },
        ivs: { hp: 31, atk: 0, def: 31, spa: 31, spd: 31, spe: 0 },
        notes: "Redirection option into faster offense.",
      },
    },
    { slot: 5, pokemon: null },
    { slot: 6, pokemon: null },
  ],
};

export const localSimulationSettings: SimulationSettings = {
  id: "settings-local-balanced",
  format: "vgc-regulation-h",
  battleCount: 1050,
  bringCount: 4,
  teamSize: 6,
  opponentPoolId: "pool-all-meta-tournament",
  performanceProfileId: "profile-balanced",
  workerCount: 4,
  randomSeed: "battlelab-local-demo",
  openTeamSheets: true,
};

export const reportHistoryEntries: ReportHistoryEntry[] = [
  {
    id: "history-sandstorm-meta",
    reportId: "report-sandstorm-meta",
    title: "Sandstorm Hyper Offense vs All Meta + All Tournament",
    description:
      "Full meta pool plus tournament teams for broad matchup coverage.",
    teamName: "Sandstorm Hyper Offense",
    opponentPoolName: "All Meta + All Tournament",
    status: "complete",
    generatedAt: "2026-06-10T10:35:00.000Z",
    battleCount: 1050,
    winRate: 76.5,
    tier: "S-Tier",
    avgTurns: 6.7,
    formatLabel: "Champion Format",
    profileName: "Balanced Profile",
  },
  {
    id: "history-rain-balance",
    reportId: "report-rain-balance",
    title: "Rain Balance vs S/A-Tier + Top 4 Tournament",
    description: "Strong meta teams plus top tournament finishes.",
    teamName: "Rain Balance",
    opponentPoolName: "S/A-Tier + Top 4 Tournament",
    status: "complete",
    generatedAt: "2026-06-09T16:10:00.000Z",
    battleCount: 500,
    winRate: 64.2,
    tier: "A-Tier",
    avgTurns: 7.2,
    formatLabel: "Standard Format",
    profileName: "Balanced Profile",
  },
  {
    id: "history-hard-trick-room",
    reportId: "report-hard-trick-room",
    title: "Hard Trick Room vs S-Tier + Top Tournament",
    description: "Highest priority meta threats and top tournament teams.",
    teamName: "Hard Trick Room",
    opponentPoolName: "S-Tier + Top Tournament",
    status: "complete",
    generatedAt: "2026-06-08T12:05:00.000Z",
    battleCount: 300,
    winRate: 58,
    tier: "B-Tier",
    avgTurns: 5.4,
    formatLabel: "Champion Format",
    profileName: "High Profile",
  },
];

export const detailedSimulationReport: SimulationReport = {
  id: "report-sandstorm-meta",
  teamId: submittedTeam.id,
  teamName: submittedTeam.name,
  opponentPool: opponentPools[0],
  status: "complete",
  generatedAt: "2026-06-10T10:35:00.000Z",
  settings: localSimulationSettings,
  performanceProfile: performanceProfiles[0],
  summary: {
    winRate: 76.5,
    tier: "S-Tier",
    wins: 803,
    losses: 247,
    totalBattles: 1050,
    avgTurns: 6.7,
  },
  heroMetrics: [
    { label: "Win Rate", value: "76.5%", detail: "S-Tier" },
    { label: "Record", value: "803 W / 247 L" },
    { label: "Battles", value: "1,050" },
    { label: "Avg Turns", value: "6.7" },
  ],
  overview: {
    headline:
      "Sand pressure is winning cleanly into broad meta pools, with the best results coming from proactive speed control.",
    paragraphs: [
      "The team performs best when Tyranitar enables sand early and Excadrill is preserved for the final two turns of pressure.",
      "Amoonguss improves the slower matchups, but the team can lose tempo if both speed-control options are forced to play defensively.",
    ],
    keyTakeaways: [
      "Lead Tyranitar plus Talonflame when Tailwind pressure is needed immediately.",
      "Keep Excadrill hidden into Intimidate-heavy teams until Clear Amulet can convert a late Swords Dance turn.",
      "Use Amoonguss to buy one setup turn rather than as a long defensive pivot.",
    ],
  },
  archetypeWinRates: [
    {
      archetypeId: "arch-balance",
      archetypeName: "Balance",
      wins: 246,
      losses: 74,
      winRate: 76.9,
      notes: "Strong if sand is preserved through midgame pivots.",
    },
    {
      archetypeId: "arch-rain",
      archetypeName: "Rain",
      wins: 132,
      losses: 58,
      winRate: 69.5,
      notes: "Playable, but requires denying early weather control.",
    },
    {
      archetypeId: "arch-trick-room",
      archetypeName: "Trick Room",
      wins: 118,
      losses: 42,
      winRate: 73.8,
      notes: "Amoonguss and Rock Slide pressure limit setup turns.",
    },
    {
      archetypeId: "arch-sun",
      archetypeName: "Sun",
      wins: 104,
      losses: 31,
      winRate: 77,
      notes: "Tyranitar weather control creates favorable tempo.",
    },
  ],
  weaknesses: [
    {
      id: "weak-rain-weather-reset",
      title: "Repeated rain resets",
      severity: "medium",
      detail:
        "Rain teams that preserve Pelipper can erase sand speed and force Excadrill into Protect-heavy turns.",
    },
    {
      id: "weak-priority-water",
      title: "Priority Water cleanup",
      severity: "high",
      detail:
        "Aqua Jet pressure after chip damage can remove Excadrill before it converts the endgame.",
    },
  ],
  strategyTips: [
    {
      id: "tip-delay-excadrill",
      title: "Delay the sweeper reveal",
      severity: "low",
      detail:
        "Bring Excadrill from the back when possible so opponents spend their defensive Tera before the sand sweeper enters.",
    },
    {
      id: "tip-tailwind-first",
      title: "Use Tailwind before sand mirror trades",
      severity: "medium",
      detail:
        "Tailwind gives the team a fallback speed mode if sand is removed or copied.",
    },
  ],
  threats: [
    {
      id: "threat-urshifu-rapid",
      title: "Urshifu-Rapid-Strike",
      severity: "high",
      detail:
        "Surging Strikes ignores defensive boosts and pressures both Tyranitar and Excadrill.",
    },
    {
      id: "threat-incineroar",
      title: "Incineroar",
      severity: "medium",
      detail:
        "Fake Out plus Parting Shot can stall sand turns if Clear Amulet is not positioned well.",
    },
  ],
  leads: [
    {
      id: "lead-tyranitar-talonflame",
      pokemon: ["Tyranitar", "Talonflame"],
      usagePercent: 34,
      winRate: 79.4,
      notes: "Best general lead when Tailwind creates immediate pressure.",
    },
    {
      id: "lead-tyranitar-amoonguss",
      pokemon: ["Tyranitar", "Amoonguss"],
      usagePercent: 21,
      winRate: 75.1,
      notes: "Safer into Trick Room and aggressive priority lines.",
    },
    {
      id: "lead-excadrill-talonflame",
      pokemon: ["Excadrill", "Talonflame"],
      usagePercent: 18,
      winRate: 72.8,
      notes: "High-tempo option when sand can be set from the back.",
    },
  ],
  cores: [
    {
      id: "core-sand-speed",
      pokemon: ["Tyranitar", "Excadrill", "Talonflame"],
      winRate: 80.2,
      notes: "Primary aggressive mode with two layers of speed control.",
    },
    {
      id: "core-sand-redirection",
      pokemon: ["Tyranitar", "Excadrill", "Amoonguss"],
      winRate: 77.6,
      notes: "Most stable core into slower setup teams.",
    },
  ],
  coverage: [
    {
      type: "Fire",
      score: 42,
      notes: "Coverage depends on Tera Blast and neutral Rock pressure.",
    },
    {
      type: "Water",
      score: 58,
      notes: "Amoonguss helps defensively, but direct damage is limited.",
    },
    {
      type: "Steel",
      score: 86,
      notes: "Ground pressure gives the team reliable Steel answers.",
    },
    {
      type: "Flying",
      score: 74,
      notes: "Rock Slide pressure is consistent across sand turns.",
    },
  ],
};

export const rainBalanceSimulationReport: SimulationReport = {
  id: "report-rain-balance",
  teamId: "team-rain-balance",
  teamName: "Rain Balance",
  opponentPool: opponentPools[1],
  status: "complete",
  generatedAt: "2026-06-09T16:10:00.000Z",
  settings: {
    ...localSimulationSettings,
    id: "settings-rain-balanced",
    battleCount: 500,
    opponentPoolId: "pool-sa-top-four",
    randomSeed: "battlelab-rain-demo",
  },
  performanceProfile: performanceProfiles[0],
  summary: {
    winRate: 64.2,
    tier: "A-Tier",
    wins: 321,
    losses: 179,
    totalBattles: 500,
    avgTurns: 7.2,
  },
  heroMetrics: [
    { label: "Win Rate", value: "64.2%", detail: "A-Tier" },
    { label: "Record", value: "321 W / 179 L" },
    { label: "Battles", value: "500" },
    { label: "Avg Turns", value: "7.2" },
  ],
  overview: {
    headline:
      "Rain Balance is stable into broad meta teams, but it needs cleaner answers into weather mirrors and strong priority endgames.",
    paragraphs: [
      "The team wins most often when rain is established early and the bulky pivot core preserves enough HP for a second weather cycle.",
      "Losses tend to cluster around games where opposing speed control forces the rain attackers to Protect instead of trading damage.",
    ],
    keyTakeaways: [
      "Preserve the rain setter until the opponent commits their own weather control.",
      "Use bulky pivots to buy the second rain cycle instead of forcing a turn-one damage race.",
      "Track priority users carefully before positioning the final Water attacker.",
    ],
  },
  archetypeWinRates: [
    {
      archetypeId: "arch-rain-balance",
      archetypeName: "Rain Balance",
      wins: 92,
      losses: 58,
      winRate: 61.3,
      notes: "Mirror games are playable but depend heavily on weather timing.",
    },
    {
      archetypeId: "arch-goodstuffs",
      archetypeName: "Goodstuffs",
      wins: 88,
      losses: 42,
      winRate: 67.7,
      notes: "Defensive pivots convert well when rain pressure is conserved.",
    },
    {
      archetypeId: "arch-sun-balance",
      archetypeName: "Sun Balance",
      wins: 66,
      losses: 39,
      winRate: 62.9,
      notes: "Weather resets decide most games in this pocket.",
    },
  ],
  weaknesses: [
    {
      id: "weak-rain-speed-control",
      title: "Speed control denial",
      severity: "medium",
      detail:
        "Tailwind or paralysis lines can force the rain attackers to spend too many turns protecting.",
    },
    {
      id: "weak-rain-priority",
      title: "Late priority trades",
      severity: "medium",
      detail:
        "Priority users can finish weakened Water attackers after rain chip has already done its work.",
    },
  ],
  strategyTips: [
    {
      id: "tip-rain-weather-patience",
      title: "Do not spend rain turns too early",
      severity: "low",
      detail:
        "The second rain cycle is often more valuable than immediate turn-one damage.",
    },
    {
      id: "tip-rain-pivot-first",
      title: "Pivot before committing",
      severity: "medium",
      detail:
        "Use the defensive core to identify opposing Tera choices before locking the endgame attacker in place.",
    },
  ],
  threats: [
    {
      id: "threat-rillaboom",
      title: "Rillaboom",
      severity: "high",
      detail:
        "Grassy Glide threatens common rain attackers and can erase close endgames.",
    },
    {
      id: "threat-tornadus",
      title: "Tornadus",
      severity: "medium",
      detail:
        "Prankster speed control makes it harder to convert rain turns into decisive pressure.",
    },
  ],
  leads: [
    {
      id: "lead-rain-setter-pivot",
      pokemon: ["Pelipper", "Incineroar"],
      usagePercent: 31,
      winRate: 66.4,
      notes: "Safest lead for preserving rain control into unknown openers.",
    },
    {
      id: "lead-rain-sweeper-support",
      pokemon: ["Pelipper", "Archaludon"],
      usagePercent: 24,
      winRate: 64.8,
      notes: "Best when immediate rain pressure is required.",
    },
  ],
  cores: [
    {
      id: "core-rain-balance",
      pokemon: ["Pelipper", "Archaludon", "Incineroar"],
      winRate: 68.1,
      notes: "Primary balance core with weather, damage, and pivot support.",
    },
    {
      id: "core-rain-endgame",
      pokemon: ["Pelipper", "Basculegion", "Amoonguss"],
      winRate: 65.7,
      notes: "Useful into slower teams that need to be denied setup turns.",
    },
  ],
  coverage: [
    {
      type: "Fire",
      score: 72,
      notes: "Rain reduces incoming Fire pressure and Water damage answers most Fire types.",
    },
    {
      type: "Grass",
      score: 48,
      notes: "Grass pressure is the main defensive stress point.",
    },
    {
      type: "Steel",
      score: 78,
      notes: "Rain attackers and Electric coverage pressure Steel teams well.",
    },
  ],
};

export const hardTrickRoomSimulationReport: SimulationReport = {
  id: "report-hard-trick-room",
  teamId: "team-hard-trick-room",
  teamName: "Hard Trick Room",
  opponentPool: opponentPools[2],
  status: "complete",
  generatedAt: "2026-06-08T12:05:00.000Z",
  settings: {
    ...localSimulationSettings,
    id: "settings-hard-trick-room-high",
    battleCount: 300,
    opponentPoolId: "pool-s-tier-top-tournament",
    performanceProfileId: "profile-high",
    workerCount: 8,
    randomSeed: "battlelab-trick-room-demo",
  },
  performanceProfile: performanceProfiles[2],
  summary: {
    winRate: 58,
    tier: "B-Tier",
    wins: 174,
    losses: 126,
    totalBattles: 300,
    avgTurns: 5.4,
  },
  heroMetrics: [
    { label: "Win Rate", value: "58%", detail: "B-Tier" },
    { label: "Record", value: "174 W / 126 L" },
    { label: "Battles", value: "300" },
    { label: "Avg Turns", value: "5.4" },
  ],
  overview: {
    headline:
      "Hard Trick Room has a strong ceiling when setup succeeds, but elite pressure teams are forcing too many awkward turn-one decisions.",
    paragraphs: [
      "The best games come from redirecting damage into a guaranteed setup turn and then trading two slow attackers aggressively.",
      "The weakest games happen when Taunt, Fake Out, or immediate double-target pressure prevents Trick Room from going up.",
    ],
    keyTakeaways: [
      "Prioritize the safest setup line over the highest-damage opener.",
      "Bring the second slow attacker when the opponent has multiple Protect users.",
      "Avoid overcommitting Tera before Trick Room is confirmed.",
    ],
  },
  archetypeWinRates: [
    {
      archetypeId: "arch-hard-trick-room",
      archetypeName: "Hard Trick Room",
      wins: 54,
      losses: 36,
      winRate: 60,
      notes: "Mirrors are favorable when the bulkier attacker is preserved.",
    },
    {
      archetypeId: "arch-hyper-offense",
      archetypeName: "Hyper Offense",
      wins: 48,
      losses: 42,
      winRate: 53.3,
      notes: "Turn-one disruption is the biggest failure point.",
    },
    {
      archetypeId: "arch-bulky-offense",
      archetypeName: "Bulky Offense",
      wins: 50,
      losses: 28,
      winRate: 64.1,
      notes: "Slow attackers convert well once setup is secured.",
    },
  ],
  weaknesses: [
    {
      id: "weak-trick-room-taunt",
      title: "Taunt and Fake Out pressure",
      severity: "high",
      detail:
        "Fast disruption can deny setup before the team gets to use its speed advantage.",
    },
    {
      id: "weak-trick-room-stall",
      title: "Protect cycling",
      severity: "medium",
      detail:
        "Opponents that stall two Trick Room turns can force slow attackers into bad trades.",
    },
  ],
  strategyTips: [
    {
      id: "tip-trick-room-safe-setup",
      title: "Choose the safest setup route",
      severity: "medium",
      detail:
        "Damage can wait; the report favors lines that make Trick Room reliable first.",
    },
    {
      id: "tip-trick-room-double-threat",
      title: "Bring two slow attackers",
      severity: "low",
      detail:
        "A second attacker reduces the impact of Protect cycling and Intimidate turns.",
    },
  ],
  threats: [
    {
      id: "threat-amoonguss",
      title: "Amoonguss",
      severity: "medium",
      detail:
        "Spore and redirection can waste critical Trick Room turns.",
    },
    {
      id: "threat-fake-out-taunt",
      title: "Fake Out + Taunt cores",
      severity: "high",
      detail:
        "Layered disruption creates the least stable setup outcomes.",
    },
  ],
  leads: [
    {
      id: "lead-indeedee-hatterene",
      pokemon: ["Indeedee-F", "Hatterene"],
      usagePercent: 38,
      winRate: 61.2,
      notes: "Most consistent setup line when Psychic Terrain is valuable.",
    },
    {
      id: "lead-farigiraf-ursaluna",
      pokemon: ["Farigiraf", "Ursaluna"],
      usagePercent: 22,
      winRate: 57.8,
      notes: "Higher damage lead with more risk into disruption.",
    },
  ],
  cores: [
    {
      id: "core-trick-room-setup",
      pokemon: ["Indeedee-F", "Hatterene", "Ursaluna"],
      winRate: 62.4,
      notes: "Classic setup and damage core for slower matchups.",
    },
    {
      id: "core-trick-room-bulk",
      pokemon: ["Farigiraf", "Ursaluna", "Torkoal"],
      winRate: 59.3,
      notes: "Best when the team needs multiple independent damage threats.",
    },
  ],
  coverage: [
    {
      type: "Ghost",
      score: 46,
      notes: "Ghost pressure can threaten common setup Pokemon.",
    },
    {
      type: "Steel",
      score: 71,
      notes: "Fire and Ground pressure are strong once Trick Room is active.",
    },
    {
      type: "Fairy",
      score: 69,
      notes: "Fairy attackers help punish Dragon-heavy offense.",
    },
  ],
};

export const simulationReports: SimulationReport[] = [
  detailedSimulationReport,
  rainBalanceSimulationReport,
  hardTrickRoomSimulationReport,
];

export const simulationReportsById: Record<string, SimulationReport> = Object.fromEntries(
  simulationReports.map((report) => [report.id, report]),
);
