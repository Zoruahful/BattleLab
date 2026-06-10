import type { PokemonBuild, PokemonType, StatSpread, SubmittedTeam, TeamSlot } from '../types'

const STAT_ORDER: Array<keyof StatSpread> = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']

const STAT_TO_LABEL: Record<keyof StatSpread, string> = {
  hp: 'HP',
  atk: 'Atk',
  def: 'Def',
  spa: 'SpA',
  spd: 'SpD',
  spe: 'Spe',
}

const LABEL_TO_STAT: Record<string, keyof StatSpread> = {
  hp: 'hp',
  atk: 'atk',
  def: 'def',
  spa: 'spa',
  spd: 'spd',
  spe: 'spe',
}

const VALID_TYPES: PokemonType[] = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison',
  'Ground', 'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy',
]

const emptyEvs = (): StatSpread => ({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 })
const fullIvs = (): StatSpread => ({ hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 })

function statLine(label: string, spread: StatSpread, skipValue: number) {
  const parts = STAT_ORDER.filter((stat) => spread[stat] !== skipValue).map(
    (stat) => `${spread[stat]} ${STAT_TO_LABEL[stat]}`,
  )
  return parts.length > 0 ? `${label}: ${parts.join(' / ')}` : null
}

function exportPokemon(pokemon: PokemonBuild): string {
  const lines: string[] = []

  const namePart = pokemon.nickname ? `${pokemon.nickname} (${pokemon.species})` : pokemon.species
  const genderPart = pokemon.gender && pokemon.gender !== 'N' ? ` (${pokemon.gender})` : ''
  const itemPart = pokemon.item ? ` @ ${pokemon.item}` : ''
  lines.push(`${namePart}${genderPart}${itemPart}`)

  if (pokemon.ability) {
    lines.push(`Ability: ${pokemon.ability}`)
  }
  if (pokemon.level && pokemon.level !== 100) {
    lines.push(`Level: ${pokemon.level}`)
  }
  if (pokemon.teraType) {
    lines.push(`Tera Type: ${pokemon.teraType}`)
  }

  const evLine = statLine('EVs', pokemon.evs, 0)
  if (evLine) {
    lines.push(evLine)
  }
  if (pokemon.nature) {
    lines.push(`${pokemon.nature} Nature`)
  }
  const ivLine = statLine('IVs', pokemon.ivs, 31)
  if (ivLine) {
    lines.push(ivLine)
  }

  pokemon.moves.filter(Boolean).forEach((move) => {
    lines.push(`- ${move}`)
  })

  return lines.join('\n')
}

export function exportShowdownTeam(team: SubmittedTeam): string {
  return team.slots
    .map((slot) => slot.pokemon)
    .filter((pokemon): pokemon is PokemonBuild => Boolean(pokemon))
    .map(exportPokemon)
    .join('\n\n')
}

function parseStatSpread(value: string, base: StatSpread): StatSpread {
  const next = { ...base }
  value.split('/').forEach((chunk) => {
    const match = chunk.trim().match(/^(\d+)\s+([A-Za-z]+)$/)
    if (!match) {
      return
    }
    const amount = Number(match[1])
    const stat = LABEL_TO_STAT[match[2].toLowerCase()]
    if (stat && Number.isFinite(amount)) {
      next[stat] = amount
    }
  })
  return next
}

function parseTeraType(value: string): PokemonType {
  const normalized = value.trim().toLowerCase()
  return VALID_TYPES.find((type) => type.toLowerCase() === normalized) ?? 'Normal'
}

function parseBlock(block: string, slot: number): PokemonBuild | null {
  const lines = block
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    return null
  }

  const header = lines[0]
  const moves: string[] = []

  let nickname: string | undefined
  let species: string
  let gender: PokemonBuild['gender']
  let item = ''
  let ability = ''
  let nature = ''
  let level = 50
  let teraType: PokemonType = 'Normal'
  let evs = emptyEvs()
  let ivs = fullIvs()

  const [namePortion, itemPortion] = header.split('@').map((part) => part.trim())
  if (itemPortion) {
    item = itemPortion
  }

  let nameCore = namePortion
  const genderMatch = nameCore.match(/\((M|F|N)\)\s*$/i)
  if (genderMatch) {
    gender = genderMatch[1].toUpperCase() as PokemonBuild['gender']
    nameCore = nameCore.replace(/\((M|F|N)\)\s*$/i, '').trim()
  }

  const speciesMatch = nameCore.match(/^(.*)\(([^)]+)\)\s*$/)
  if (speciesMatch) {
    nickname = speciesMatch[1].trim() || undefined
    species = speciesMatch[2].trim()
  } else {
    species = nameCore.trim()
  }

  lines.slice(1).forEach((line) => {
    if (line.startsWith('- ')) {
      moves.push(line.slice(2).trim())
    } else if (/^ability:/i.test(line)) {
      ability = line.split(':').slice(1).join(':').trim()
    } else if (/^level:/i.test(line)) {
      const parsed = Number(line.split(':')[1])
      if (Number.isFinite(parsed)) {
        level = parsed
      }
    } else if (/^tera type:/i.test(line)) {
      teraType = parseTeraType(line.split(':').slice(1).join(':'))
    } else if (/^evs:/i.test(line)) {
      evs = parseStatSpread(line.split(':').slice(1).join(':'), emptyEvs())
    } else if (/^ivs:/i.test(line)) {
      ivs = parseStatSpread(line.split(':').slice(1).join(':'), fullIvs())
    } else if (/\bnature$/i.test(line)) {
      nature = line.replace(/\s*nature$/i, '').trim()
    }
  })

  if (!species) {
    return null
  }

  const paddedMoves = [...moves]
  while (paddedMoves.length < 4) {
    paddedMoves.push('')
  }

  return {
    id: `import-${slot}-${species.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    slot: slot as PokemonBuild['slot'],
    species,
    nickname,
    level,
    gender,
    teraType,
    item,
    ability,
    nature,
    moves: paddedMoves.slice(0, 4) as PokemonBuild['moves'],
    evs,
    ivs,
  }
}

export function parseShowdownTeam(text: string, baseTeam: SubmittedTeam): SubmittedTeam {
  const blocks = text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .slice(0, 6)

  const builds = blocks
    .map((block, index) => parseBlock(block, index + 1))
    .filter((build): build is PokemonBuild => Boolean(build))

  const slots = Array.from({ length: 6 }, (_, index) => ({
    slot: (index + 1) as TeamSlot['slot'],
    pokemon: builds[index] ?? null,
  })) as SubmittedTeam['slots']

  return {
    ...baseTeam,
    slots,
    updatedAt: new Date().toISOString(),
  }
}
