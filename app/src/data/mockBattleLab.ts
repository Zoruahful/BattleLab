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
        speciesRef: {
          catalogKey: "pokemon-tyranitar",
          showdownId: "tyranitar",
          displayName: "Tyranitar",
        },
        iconKey: "tyranitar",
        spriteKey: "tyranitar-default",
        level: 50,
        gender: "M",
        teraType: "Flying",
        teraTypeRef: { catalogKey: "type-flying", showdownId: "flying", displayName: "Flying" },
        item: "Assault Vest",
        itemRef: {
          catalogKey: "item-assault-vest",
          showdownId: "assaultvest",
          displayName: "Assault Vest",
        },
        ability: "Sand Stream",
        abilityRef: {
          catalogKey: "ability-sand-stream",
          showdownId: "sandstream",
          displayName: "Sand Stream",
        },
        nature: "Adamant",
        natureRef: { catalogKey: "nature-adamant", showdownId: "adamant", displayName: "Adamant" },
        moves: ["Rock Slide", "Knock Off", "Low Kick", "Tera Blast"],
        moveRefs: [
          { catalogKey: "move-rock-slide", showdownId: "rockslide", displayName: "Rock Slide" },
          { catalogKey: "move-knock-off", showdownId: "knockoff", displayName: "Knock Off" },
          { catalogKey: "move-low-kick", showdownId: "lowkick", displayName: "Low Kick" },
          { catalogKey: "move-tera-blast", showdownId: "terablast", displayName: "Tera Blast" },
        ],
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
        speciesRef: {
          catalogKey: "pokemon-excadrill",
          showdownId: "excadrill",
          displayName: "Excadrill",
        },
        iconKey: "excadrill",
        spriteKey: "excadrill-default",
        level: 50,
        gender: "F",
        teraType: "Ground",
        teraTypeRef: { catalogKey: "type-ground", showdownId: "ground", displayName: "Ground" },
        item: "Clear Amulet",
        itemRef: {
          catalogKey: "item-clear-amulet",
          showdownId: "clearamulet",
          displayName: "Clear Amulet",
        },
        ability: "Sand Rush",
        abilityRef: {
          catalogKey: "ability-sand-rush",
          showdownId: "sandrush",
          displayName: "Sand Rush",
        },
        nature: "Jolly",
        natureRef: { catalogKey: "nature-jolly", showdownId: "jolly", displayName: "Jolly" },
        moves: ["High Horsepower", "Iron Head", "Protect", "Swords Dance"],
        moveRefs: [
          { catalogKey: "move-high-horsepower", showdownId: "highhorsepower", displayName: "High Horsepower" },
          { catalogKey: "move-iron-head", showdownId: "ironhead", displayName: "Iron Head" },
          { catalogKey: "move-protect", showdownId: "protect", displayName: "Protect" },
          { catalogKey: "move-swords-dance", showdownId: "swordsdance", displayName: "Swords Dance" },
        ],
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
        speciesRef: {
          catalogKey: "pokemon-talonflame",
          showdownId: "talonflame",
          displayName: "Talonflame",
        },
        nickname: "Tailwind",
        iconKey: "talonflame",
        spriteKey: "talonflame-default",
        level: 50,
        gender: "F",
        teraType: "Ghost",
        teraTypeRef: { catalogKey: "type-ghost", showdownId: "ghost", displayName: "Ghost" },
        item: "Covert Cloak",
        itemRef: {
          catalogKey: "item-covert-cloak",
          showdownId: "covertcloak",
          displayName: "Covert Cloak",
        },
        ability: "Gale Wings",
        abilityRef: {
          catalogKey: "ability-gale-wings",
          showdownId: "galewings",
          displayName: "Gale Wings",
        },
        nature: "Jolly",
        natureRef: { catalogKey: "nature-jolly", showdownId: "jolly", displayName: "Jolly" },
        moves: ["Tailwind", "Brave Bird", "Will-O-Wisp", "Protect"],
        moveRefs: [
          { catalogKey: "move-tailwind", showdownId: "tailwind", displayName: "Tailwind" },
          { catalogKey: "move-brave-bird", showdownId: "bravebird", displayName: "Brave Bird" },
          { catalogKey: "move-will-o-wisp", showdownId: "willowisp", displayName: "Will-O-Wisp" },
          { catalogKey: "move-protect", showdownId: "protect", displayName: "Protect" },
        ],
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
        speciesRef: {
          catalogKey: "pokemon-amoonguss",
          showdownId: "amoonguss",
          displayName: "Amoonguss",
        },
        iconKey: "amoonguss",
        spriteKey: "amoonguss-default",
        level: 50,
        gender: "M",
        teraType: "Water",
        teraTypeRef: { catalogKey: "type-water", showdownId: "water", displayName: "Water" },
        item: "Sitrus Berry",
        itemRef: {
          catalogKey: "item-sitrus-berry",
          showdownId: "sitrusberry",
          displayName: "Sitrus Berry",
        },
        ability: "Regenerator",
        abilityRef: {
          catalogKey: "ability-regenerator",
          showdownId: "regenerator",
          displayName: "Regenerator",
        },
        nature: "Relaxed",
        natureRef: { catalogKey: "nature-relaxed", showdownId: "relaxed", displayName: "Relaxed" },
        moves: ["Spore", "Rage Powder", "Pollen Puff", "Protect"],
        moveRefs: [
          { catalogKey: "move-spore", showdownId: "spore", displayName: "Spore" },
          { catalogKey: "move-rage-powder", showdownId: "ragepowder", displayName: "Rage Powder" },
          { catalogKey: "move-pollen-puff", showdownId: "pollenpuff", displayName: "Pollen Puff" },
          { catalogKey: "move-protect", showdownId: "protect", displayName: "Protect" },
        ],
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
      pokemon: "Urshifu-Rapid-Strike",
      pokemonRef: {
        catalogKey: "pokemon-urshifu-rapid-strike",
        showdownId: "urshifurapidstrike",
        displayName: "Urshifu-Rapid-Strike",
      },
      lossRate: 42.8,
      games: 72,
      severity: "high",
      detail:
        "Surging Strikes ignores defensive boosts and pressures both Tyranitar and Excadrill.",
    },
    {
      id: "threat-incineroar",
      pokemon: "Incineroar",
      pokemonRef: {
        catalogKey: "pokemon-incineroar",
        showdownId: "incineroar",
        displayName: "Incineroar",
      },
      lossRate: 34.5,
      games: 96,
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
      pokemon: ["Tyranitar", "Excadrill", "Talonflame", "Amoonguss"],
      winRate: 80.2,
      notes: "Primary aggressive mode with two layers of speed control and one defensive reset.",
    },
    {
      id: "core-sand-redirection",
      pokemon: ["Tyranitar", "Excadrill", "Amoonguss", "Talonflame"],
      winRate: 77.6,
      notes: "Most stable core into slower setup teams while keeping Tailwind available.",
    },
  ],
  coverage: [
    {
      type: "Fire",
      score: 42,
      notes: "Coverage depends on Tera Blast and neutral Rock pressure.",
      members: [
        { pokemon: "Tyranitar", score: 56, notes: "Rock pressure is useful but not decisive." },
        { pokemon: "Excadrill", score: 32, notes: "Usually needs Tera or chip support." },
        { pokemon: "Talonflame", score: 44, notes: "Can pressure Grass partners around Fire types." },
        { pokemon: "Amoonguss", score: 28, notes: "Mostly defensive into Fire pressure." },
      ],
    },
    {
      type: "Water",
      score: 58,
      notes: "Amoonguss helps defensively, but direct damage is limited.",
      members: [
        { pokemon: "Tyranitar", score: 22, notes: "Avoids direct Water trades." },
        { pokemon: "Excadrill", score: 34, notes: "Can clean only after Water attackers are chipped." },
        { pokemon: "Talonflame", score: 46, notes: "Burn support can soften physical Water threats." },
        { pokemon: "Amoonguss", score: 82, notes: "Main defensive answer and redirection option." },
      ],
    },
    {
      type: "Steel",
      score: 86,
      notes: "Ground pressure gives the team reliable Steel answers.",
      members: [
        { pokemon: "Tyranitar", score: 64, notes: "Low Kick and Rock chip help support the matchup." },
        { pokemon: "Excadrill", score: 96, notes: "Primary Steel answer with Ground pressure." },
        { pokemon: "Talonflame", score: 58, notes: "Can cover Grass and Bug partners." },
        { pokemon: "Amoonguss", score: 36, notes: "Mostly supports positioning." },
      ],
    },
    {
      type: "Flying",
      score: 74,
      notes: "Rock Slide pressure is consistent across sand turns.",
      members: [
        { pokemon: "Tyranitar", score: 92, notes: "Rock Slide is the primary Flying answer." },
        { pokemon: "Excadrill", score: 66, notes: "Can finish chipped Flying types." },
        { pokemon: "Talonflame", score: 54, notes: "Mirror pressure depends on speed control." },
        { pokemon: "Amoonguss", score: 42, notes: "Redirection buys time but does not solve the type alone." },
      ],
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
      pokemon: "Rillaboom",
      pokemonRef: {
        catalogKey: "pokemon-rillaboom",
        showdownId: "rillaboom",
        displayName: "Rillaboom",
      },
      lossRate: 45.9,
      games: 74,
      severity: "high",
      detail:
        "Grassy Glide threatens common rain attackers and can erase close endgames.",
    },
    {
      id: "threat-tornadus",
      pokemon: "Tornadus",
      pokemonRef: {
        catalogKey: "pokemon-tornadus",
        showdownId: "tornadus",
        displayName: "Tornadus",
      },
      lossRate: 38.2,
      games: 68,
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
      pokemon: ["Pelipper", "Archaludon", "Incineroar", "Amoonguss"],
      winRate: 68.1,
      notes: "Primary balance core with weather, damage, pivot support, and redirection.",
    },
    {
      id: "core-rain-endgame",
      pokemon: ["Pelipper", "Basculegion", "Amoonguss", "Incineroar"],
      winRate: 65.7,
      notes: "Useful into slower teams that need to be denied setup turns and pivoted safely.",
    },
  ],
  coverage: [
    {
      type: "Fire",
      score: 72,
      notes: "Rain reduces incoming Fire pressure and Water damage answers most Fire types.",
      members: [
        { pokemon: "Pelipper", score: 88, notes: "Sets rain and threatens Water damage." },
        { pokemon: "Archaludon", score: 68, notes: "Benefits from reduced Fire damage." },
        { pokemon: "Incineroar", score: 54, notes: "Mostly pivots around Fire mirrors." },
        { pokemon: "Amoonguss", score: 42, notes: "Needs rain support to avoid bad trades." },
      ],
    },
    {
      type: "Grass",
      score: 48,
      notes: "Grass pressure is the main defensive stress point.",
      members: [
        { pokemon: "Pelipper", score: 44, notes: "Can pressure some Grass partners with Flying damage." },
        { pokemon: "Archaludon", score: 52, notes: "Relies on bulk rather than super-effective damage." },
        { pokemon: "Incineroar", score: 74, notes: "Primary Grass answer." },
        { pokemon: "Amoonguss", score: 28, notes: "Often forced into support-only turns." },
      ],
    },
    {
      type: "Steel",
      score: 78,
      notes: "Rain attackers and Electric coverage pressure Steel teams well.",
      members: [
        { pokemon: "Pelipper", score: 64, notes: "Water pressure helps into neutral Steel boards." },
        { pokemon: "Archaludon", score: 82, notes: "Main damage contributor into Steel cores." },
        { pokemon: "Incineroar", score: 86, notes: "Fire pressure remains useful even outside sun." },
        { pokemon: "Amoonguss", score: 38, notes: "Supports positioning more than coverage." },
      ],
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
      pokemon: "Amoonguss",
      pokemonRef: {
        catalogKey: "pokemon-amoonguss",
        showdownId: "amoonguss",
        displayName: "Amoonguss",
      },
      lossRate: 39.7,
      games: 58,
      severity: "medium",
      detail:
        "Spore and redirection can waste critical Trick Room turns.",
    },
    {
      id: "threat-fake-out-taunt",
      pokemon: "Incineroar",
      pokemonRef: {
        catalogKey: "pokemon-incineroar",
        showdownId: "incineroar",
        displayName: "Incineroar",
      },
      lossRate: 47.4,
      games: 76,
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
      pokemon: ["Indeedee-F", "Hatterene", "Ursaluna", "Torkoal"],
      winRate: 62.4,
      notes: "Classic setup and damage core with a second slow attacker.",
    },
    {
      id: "core-trick-room-bulk",
      pokemon: ["Farigiraf", "Ursaluna", "Torkoal", "Hatterene"],
      winRate: 59.3,
      notes: "Best when the team needs multiple independent damage threats and a backup setter.",
    },
  ],
  coverage: [
    {
      type: "Ghost",
      score: 46,
      notes: "Ghost pressure can threaten common setup Pokemon.",
      members: [
        { pokemon: "Indeedee-F", score: 38, notes: "Terrain support matters more than coverage." },
        { pokemon: "Hatterene", score: 58, notes: "Can trade if Trick Room is already active." },
        { pokemon: "Ursaluna", score: 64, notes: "Ground pressure can punish some Ghost partners." },
        { pokemon: "Torkoal", score: 24, notes: "Needs support into most Ghost pressure." },
      ],
    },
    {
      type: "Steel",
      score: 71,
      notes: "Fire and Ground pressure are strong once Trick Room is active.",
      members: [
        { pokemon: "Indeedee-F", score: 34, notes: "Support-only into most Steel boards." },
        { pokemon: "Hatterene", score: 52, notes: "Can chip but does not carry the matchup." },
        { pokemon: "Ursaluna", score: 88, notes: "Primary Steel answer under Trick Room." },
        { pokemon: "Torkoal", score: 92, notes: "Fire pressure is excellent once positioned." },
      ],
    },
    {
      type: "Fairy",
      score: 69,
      notes: "Fairy attackers help punish Dragon-heavy offense.",
      members: [
        { pokemon: "Indeedee-F", score: 46, notes: "Supports the Fairy attacker with terrain." },
        { pokemon: "Hatterene", score: 90, notes: "Main Fairy pressure." },
        { pokemon: "Ursaluna", score: 62, notes: "Trades well into neutral Fairy boards." },
        { pokemon: "Torkoal", score: 48, notes: "Secondary damage into Fairy partners." },
      ],
    },
  ],
};

export const simulationReports: SimulationReport[] = [
  detailedSimulationReport,
  rainBalanceSimulationReport,
  hardTrickRoomSimulationReport,
];

const reportFormatLabels: Partial<Record<SimulationReport["id"], string>> = {
  "report-sandstorm-meta": "Champion Format",
  "report-rain-balance": "Standard Format",
  "report-hard-trick-room": "Champion Format",
};

const toReportHistoryEntry = (report: SimulationReport): ReportHistoryEntry => ({
  id: `history-${report.id.replace(/^report-/, "")}`,
  reportId: report.id,
  title: `${report.teamName} vs ${report.opponentPool.name}`,
  description: report.opponentPool.description,
  teamName: report.teamName,
  opponentPoolName: report.opponentPool.name,
  status: report.status,
  generatedAt: report.generatedAt,
  summary: {
    winRate: report.summary.winRate,
    tier: report.summary.tier,
    totalBattles: report.summary.totalBattles,
    avgTurns: report.summary.avgTurns,
  },
  formatLabel: reportFormatLabels[report.id] ?? "Champion Format",
  profileName: report.performanceProfile.name,
});

export const reportHistoryEntries: ReportHistoryEntry[] =
  simulationReports.map(toReportHistoryEntry);

export const simulationReportsById: Record<string, SimulationReport> = Object.fromEntries(
  simulationReports.map((report) => [report.id, report]),
);
