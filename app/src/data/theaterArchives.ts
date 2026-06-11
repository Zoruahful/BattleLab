// Fabricated, frontend-only sample data for the Theater replay preview.
// This is fake battle data used to demonstrate the local replay player.
// It is NOT real simulation output and carries no legality meaning.

export type TheaterLogKind = 'weather' | 'move' | 'ko' | 'swap' | 'status' | 'end'

export type TheaterLogEvent = {
  turn: number
  kind: TheaterLogKind
  text: string
}

export type TheaterMon = {
  name: string
  koTurn: number | null
  hp: number
}

export type TheaterGame = {
  id: string
  opponent: string
  result: 'win' | 'loss'
  score: string
  turns: number
  runtime: string
  weather: string
  yourTeam: TheaterMon[]
  theirTeam: TheaterMon[]
  log: TheaterLogEvent[]
}

export type TheaterArchive = {
  id: string
  team: string
  pool: string
  format: string
  tag: string
  date: string
  games: TheaterGame[]
}

const SECONDS_PER_TURN = 1.1

function runtimeForTurns(turns: number): string {
  const totalSeconds = Math.round(turns * SECONDS_PER_TURN * 8)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

type GameSpec = {
  opponent: string
  result: 'win' | 'loss'
  score: string
  turns: number
  your: string[]
  their: string[]
  // index list of your mons that faint, paired with the turn they faint on
  yourKos?: Array<[number, number]>
  theirKos?: Array<[number, number]>
}

const MOVE_POOL = [
  'Earthquake',
  'Rock Slide',
  'Iron Head',
  'Hydro Pump',
  'Flare Blitz',
  'Dragon Claw',
  'Protect',
  'Crunch',
  'Moonblast',
  'Volt Switch',
  'Ice Beam',
  'Close Combat',
]

function buildLog(spec: GameSpec, weather: string): TheaterLogEvent[] {
  const log: TheaterLogEvent[] = []
  if (weather) {
    log.push({ turn: 1, kind: 'weather', text: weather })
  }

  const koByTurn = new Map<number, string>()
  spec.theirKos?.forEach(([index, turn]) => {
    koByTurn.set(turn, `The opposing ${spec.their[index] ?? 'Pokemon'} fainted.`)
  })
  spec.yourKos?.forEach(([index, turn]) => {
    // your KO text only if no opposing KO already claimed that turn
    if (!koByTurn.has(turn)) {
      koByTurn.set(turn, `Your ${spec.your[index] ?? 'Pokemon'} fainted.`)
    }
  })

  for (let turn = 1; turn <= spec.turns; turn += 1) {
    const attacker = turn % 2 === 1 ? spec.your[turn % spec.your.length] : spec.their[turn % spec.their.length]
    const move = MOVE_POOL[(turn * 3) % MOVE_POOL.length]
    if (turn > 1 || !weather) {
      log.push({ turn, kind: 'move', text: `${attacker} used ${move}.` })
    }
    const ko = koByTurn.get(turn)
    if (ko) {
      log.push({ turn, kind: 'ko', text: ko })
    }
  }

  log.push({
    turn: spec.turns,
    kind: 'end',
    text:
      spec.result === 'win'
        ? `BattleLab declares victory. ${spec.score}.`
        : `Opponent declares victory. ${spec.score}.`,
  })

  return log
}

function buildTeam(names: string[], kos: Array<[number, number]> | undefined): TheaterMon[] {
  const koMap = new Map<number, number>()
  kos?.forEach(([index, turn]) => koMap.set(index, turn))
  return names.map((name, index) => {
    const koTurn = koMap.get(index) ?? null
    return {
      name,
      koTurn,
      hp: koTurn === null ? (index % 3 === 0 ? 96 : 100) : 0,
    }
  })
}

function buildGame(archiveId: string, index: number, spec: GameSpec, weather: string): TheaterGame {
  return {
    id: `${archiveId}-g${index + 1}`,
    opponent: spec.opponent,
    result: spec.result,
    score: spec.score,
    turns: spec.turns,
    runtime: runtimeForTurns(spec.turns),
    weather,
    yourTeam: buildTeam(spec.your, spec.yourKos),
    theirTeam: buildTeam(spec.their, spec.theirKos),
    log: buildLog(spec, weather),
  }
}

type ArchiveSpec = {
  id: string
  team: string
  pool: string
  format: string
  tag: string
  date: string
  weather: string
  your: string[]
  games: Array<Omit<GameSpec, 'your'> & { your?: string[] }>
}

const archiveSpecs: ArchiveSpec[] = [
  {
    id: 'arc-001',
    team: 'Sandstorm Hyper Offense',
    pool: 'All Meta + All Tournament',
    format: 'Champion Format / Doubles',
    tag: 'Tournament finals',
    date: '2d ago',
    weather: "Tyranitar's Sand Stream kicked up a sandstorm.",
    your: ['Garchomp', 'Tyranitar', 'Excadrill', 'Rotom-Wash'],
    games: [
      { opponent: 'Rain Stall', result: 'win', score: '4-0', turns: 6, their: ['Ferrothorn', 'Rotom-Wash', 'Greninja', 'Gardevoir'], theirKos: [[1, 1], [2, 3], [0, 5], [3, 6]] },
      { opponent: 'Sun Offense', result: 'win', score: '4-1', turns: 9, their: ['Charizard', 'Heatran', 'Gardevoir', 'Dragonite'], theirKos: [[1, 2], [0, 5], [3, 7], [2, 9]], yourKos: [[3, 4]] },
      { opponent: 'Trick Room', result: 'win', score: '4-2', turns: 11, their: ['Metagross', 'Gardevoir', 'Ferrothorn', 'Amoonguss'], theirKos: [[1, 3], [0, 6], [2, 9], [3, 11]], yourKos: [[2, 4], [3, 8]] },
      { opponent: 'Bulky Offense', result: 'win', score: '4-2', turns: 12, their: ['Incineroar', 'Amoonguss', 'Dragonite', 'Rotom-Wash'], theirKos: [[0, 4], [1, 6], [2, 9], [3, 12]], yourKos: [[1, 5], [3, 10]] },
      { opponent: 'Sand Mirror', result: 'loss', score: '2-3', turns: 13, their: ['Tyranitar', 'Excadrill', 'Garchomp', 'Rotom-Wash'], theirKos: [[2, 5], [3, 9]], yourKos: [[3, 4], [2, 7], [0, 11]] },
      { opponent: 'Tailwind Offense', result: 'win', score: '4-1', turns: 8, their: ['Talonflame', 'Greninja', 'Garchomp', 'Gardevoir'], theirKos: [[0, 2], [1, 4], [2, 6], [3, 8]], yourKos: [[3, 5]] },
      { opponent: 'Perish Trap', result: 'win', score: '4-2', turns: 14, their: ['Amoonguss', 'Gardevoir', 'Rotom-Wash', 'Ferrothorn'], theirKos: [[1, 4], [0, 7], [2, 10], [3, 14]], yourKos: [[2, 6], [3, 11]] },
      { opponent: 'Hyper Offense', result: 'win', score: '4-3', turns: 12, their: ['Dragonite', 'Greninja', 'Charizard', 'Metagross'], theirKos: [[1, 3], [0, 6], [2, 9], [3, 12]], yourKos: [[3, 4], [2, 7], [1, 10]] },
    ],
  },
  {
    id: 'arc-002',
    team: 'Rain Balance',
    pool: 'S/A Tier + Top 4 Tournament',
    format: 'Champion Format / Doubles',
    tag: 'Ladder run',
    date: '5d ago',
    weather: 'Pelipper switched the weather to rain.',
    your: ['Greninja', 'Rotom-Wash', 'Ferrothorn', 'Gardevoir'],
    games: [
      { opponent: 'Sun Offense', result: 'win', score: '4-2', turns: 10, their: ['Charizard', 'Heatran', 'Gardevoir', 'Dragonite'], theirKos: [[1, 3], [0, 6], [3, 8], [2, 10]], yourKos: [[2, 5], [3, 9]] },
      { opponent: 'Sand HO', result: 'win', score: '4-1', turns: 8, their: ['Tyranitar', 'Excadrill', 'Garchomp', 'Rotom-Wash'], theirKos: [[1, 2], [0, 4], [2, 6], [3, 8]], yourKos: [[2, 5]] },
      { opponent: 'Trick Room', result: 'loss', score: '1-3', turns: 9, their: ['Metagross', 'Gardevoir', 'Amoonguss', 'Ferrothorn'], theirKos: [[1, 4]], yourKos: [[0, 3], [2, 6], [3, 9]] },
      { opponent: 'Goodstuffs', result: 'win', score: '4-2', turns: 13, their: ['Incineroar', 'Dragonite', 'Amoonguss', 'Garchomp'], theirKos: [[0, 4], [1, 7], [3, 10], [2, 13]], yourKos: [[2, 6], [3, 11]] },
      { opponent: 'Rain Mirror', result: 'win', score: '4-3', turns: 12, their: ['Greninja', 'Rotom-Wash', 'Ferrothorn', 'Gardevoir'], theirKos: [[0, 3], [3, 6], [1, 9], [2, 12]], yourKos: [[2, 5], [3, 8], [1, 11]] },
      { opponent: 'Tailwind', result: 'win', score: '4-1', turns: 7, their: ['Talonflame', 'Greninja', 'Garchomp', 'Gardevoir'], theirKos: [[0, 2], [1, 3], [2, 5], [3, 7]], yourKos: [[3, 4]] },
      { opponent: 'Hard TR', result: 'loss', score: '2-3', turns: 11, their: ['Metagross', 'Tyranitar', 'Amoonguss', 'Gardevoir'], theirKos: [[2, 5], [3, 8]], yourKos: [[0, 4], [2, 7], [3, 11]] },
      { opponent: 'Bulky Offense', result: 'win', score: '4-2', turns: 12, their: ['Incineroar', 'Amoonguss', 'Heatran', 'Rotom-Wash'], theirKos: [[0, 4], [1, 6], [2, 9], [3, 12]], yourKos: [[2, 5], [3, 10]] },
    ],
  },
  {
    id: 'arc-003',
    team: 'Hard Trick Room',
    pool: 'S-Tier + Top Tournament',
    format: 'Standard Format / Doubles',
    tag: 'Practice',
    date: '1w ago',
    weather: 'Gardevoir set up Trick Room.',
    your: ['Metagross', 'Tyranitar', 'Ferrothorn', 'Gardevoir'],
    games: [
      { opponent: 'Hyper Offense', result: 'loss', score: '0-3', turns: 8, their: ['Greninja', 'Dragonite', 'Garchomp', 'Charizard'], theirKos: [], yourKos: [[3, 3], [0, 5], [1, 7]] },
      { opponent: 'Rain Balance', result: 'win', score: '4-2', turns: 12, their: ['Greninja', 'Rotom-Wash', 'Ferrothorn', 'Gardevoir'], theirKos: [[0, 4], [3, 7], [1, 10], [2, 12]], yourKos: [[2, 6], [3, 9]] },
      { opponent: 'Sun Offense', result: 'win', score: '4-3', turns: 13, their: ['Charizard', 'Heatran', 'Gardevoir', 'Dragonite'], theirKos: [[1, 4], [0, 7], [3, 10], [2, 13]], yourKos: [[2, 5], [3, 8], [0, 11]] },
      { opponent: 'Sand HO', result: 'loss', score: '1-3', turns: 9, their: ['Tyranitar', 'Excadrill', 'Garchomp', 'Rotom-Wash'], theirKos: [[3, 5]], yourKos: [[0, 3], [2, 6], [3, 9]] },
      { opponent: 'Goodstuffs', result: 'win', score: '4-2', turns: 14, their: ['Incineroar', 'Dragonite', 'Amoonguss', 'Garchomp'], theirKos: [[0, 5], [1, 8], [3, 11], [2, 14]], yourKos: [[2, 6], [3, 12]] },
      { opponent: 'TR Mirror', result: 'win', score: '4-3', turns: 13, their: ['Metagross', 'Tyranitar', 'Amoonguss', 'Gardevoir'], theirKos: [[3, 4], [0, 7], [2, 10], [1, 13]], yourKos: [[3, 5], [0, 8], [2, 11]] },
      { opponent: 'Tailwind', result: 'loss', score: '2-3', turns: 10, their: ['Talonflame', 'Greninja', 'Garchomp', 'Gardevoir'], theirKos: [[0, 4], [3, 7]], yourKos: [[0, 3], [2, 6], [3, 10]] },
      { opponent: 'Bulky Offense', result: 'win', score: '4-2', turns: 13, their: ['Incineroar', 'Amoonguss', 'Heatran', 'Rotom-Wash'], theirKos: [[0, 5], [1, 7], [2, 10], [3, 13]], yourKos: [[2, 6], [3, 11]] },
    ],
  },
  {
    id: 'arc-004',
    team: 'Sun Balance',
    pool: 'Full Meta + 100 Random',
    format: 'Champion Format / Doubles',
    tag: 'Tournament round 4',
    date: '2w ago',
    weather: "Charizard's Drought intensified the sunlight.",
    your: ['Charizard', 'Heatran', 'Garchomp', 'Rotom-Wash'],
    games: [
      { opponent: 'Trick Room', result: 'win', score: '4-1', turns: 9, their: ['Metagross', 'Tyranitar', 'Ferrothorn', 'Gardevoir'], theirKos: [[2, 3], [0, 5], [1, 7], [3, 9]], yourKos: [[1, 6]] },
      { opponent: 'Rain Balance', result: 'loss', score: '2-3', turns: 11, their: ['Greninja', 'Rotom-Wash', 'Ferrothorn', 'Gardevoir'], theirKos: [[2, 5], [3, 8]], yourKos: [[0, 4], [3, 7], [1, 11]] },
      { opponent: 'Sand HO', result: 'win', score: '4-2', turns: 12, their: ['Tyranitar', 'Excadrill', 'Garchomp', 'Rotom-Wash'], theirKos: [[1, 4], [0, 6], [2, 9], [3, 12]], yourKos: [[2, 5], [3, 10]] },
      { opponent: 'Sun Mirror', result: 'win', score: '4-3', turns: 13, their: ['Charizard', 'Heatran', 'Garchomp', 'Rotom-Wash'], theirKos: [[1, 4], [0, 7], [2, 10], [3, 13]], yourKos: [[1, 5], [2, 8], [3, 11]] },
      { opponent: 'Goodstuffs', result: 'win', score: '4-1', turns: 8, their: ['Incineroar', 'Dragonite', 'Amoonguss', 'Garchomp'], theirKos: [[0, 2], [2, 4], [1, 6], [3, 8]], yourKos: [[1, 5]] },
      { opponent: 'Hyper Offense', result: 'loss', score: '1-3', turns: 10, their: ['Dragonite', 'Greninja', 'Charizard', 'Metagross'], theirKos: [[1, 5]], yourKos: [[2, 3], [0, 6], [3, 10]] },
      { opponent: 'Tailwind', result: 'win', score: '4-2', turns: 11, their: ['Talonflame', 'Greninja', 'Garchomp', 'Gardevoir'], theirKos: [[0, 3], [1, 5], [2, 8], [3, 11]], yourKos: [[2, 6], [3, 9]] },
      { opponent: 'Bulky Offense', result: 'win', score: '4-2', turns: 12, their: ['Incineroar', 'Amoonguss', 'Heatran', 'Rotom-Wash'], theirKos: [[0, 4], [1, 6], [2, 9], [3, 12]], yourKos: [[1, 5], [3, 10]] },
    ],
  },
]

export const theaterArchives: TheaterArchive[] = archiveSpecs.map((archive) => ({
  id: archive.id,
  team: archive.team,
  pool: archive.pool,
  format: archive.format,
  tag: archive.tag,
  date: archive.date,
  games: archive.games.map((game, index) =>
    buildGame(archive.id, index, { ...game, your: game.your ?? archive.your }, archive.weather),
  ),
}))

export function getArchiveRecord(archive: TheaterArchive) {
  const wins = archive.games.filter((game) => game.result === 'win').length
  return { wins, losses: archive.games.length - wins, total: archive.games.length }
}

export const totalTheaterGames = theaterArchives.reduce(
  (total, archive) => total + archive.games.length,
  0,
)

export type BestGame = { archive: TheaterArchive; game: TheaterGame }

export function getFastestGame(): BestGame | null {
  let best: BestGame | null = null
  theaterArchives.forEach((archive) => {
    archive.games.forEach((game) => {
      if (game.result === 'win' && (!best || game.turns < best.game.turns)) {
        best = { archive, game }
      }
    })
  })
  return best
}
