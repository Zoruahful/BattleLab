// Frontend-only fabricated editor data: move metadata + learnsets, base stats,
// nature modifiers, the Lv50 stat formula, and EV/IV <-> Champion SP conversion.
// Sample data only. Pokemon Showdown remains the future legality source of truth.

import type { PokemonType, StatSpread } from '../types'

export type MoveCategory = 'physical' | 'special' | 'status'

export interface EditorMove {
  showdownId: string
  name: string
  type: PokemonType
  category: MoveCategory
  power: number | null
  accuracy: number | null
  pp: number
  description: string
}

export const CATEGORY_META: Record<MoveCategory, { label: string }> = {
  physical: { label: 'Physical' },
  special: { label: 'Special' },
  status: { label: 'Status' },
}

const M = (
  showdownId: string,
  name: string,
  type: PokemonType,
  category: MoveCategory,
  power: number | null,
  accuracy: number | null,
  pp: number,
  description: string,
): EditorMove => ({ showdownId, name, type, category, power, accuracy, pp, description })

export const editorMoves: EditorMove[] = [
  M('protect', 'Protect', 'Normal', 'status', null, null, 10, 'Protects the user from most moves for the turn.'),
  M('substitute', 'Substitute', 'Normal', 'status', null, null, 10, 'Sacrifices HP to create a decoy substitute.'),
  M('swordsdance', 'Swords Dance', 'Normal', 'status', null, null, 20, 'Sharply raises the user’s Attack.'),
  M('bodyslam', 'Body Slam', 'Normal', 'physical', 85, 100, 15, 'May paralyze the target.'),
  M('facade', 'Facade', 'Normal', 'physical', 70, 100, 20, 'Doubles in power if the user has a status condition.'),
  M('helpinghand', 'Helping Hand', 'Normal', 'status', null, null, 20, 'Boosts the power of an ally’s move.'),
  M('hypervoice', 'Hyper Voice', 'Normal', 'special', 90, 100, 10, 'Spread sound damage to both foes.'),
  M('terablast', 'Tera Blast', 'Normal', 'special', 80, 100, 10, 'Matches the user’s Tera type and its better attacking stat.'),

  M('rockslide', 'Rock Slide', 'Rock', 'physical', 75, 90, 10, 'Spread Rock damage with a flinch chance.'),
  M('stoneedge', 'Stone Edge', 'Rock', 'physical', 100, 80, 5, 'High critical-hit ratio Rock damage.'),
  M('stealthrock', 'Stealth Rock', 'Rock', 'status', null, null, 20, 'Sets entry hazard damage on the opposing side.'),

  M('crunch', 'Crunch', 'Dark', 'physical', 80, 100, 15, 'May lower the target’s Defense.'),
  M('knockoff', 'Knock Off', 'Dark', 'physical', 65, 100, 20, 'Removes the target’s held item for extra damage.'),
  M('foulplay', 'Foul Play', 'Dark', 'physical', 95, 100, 15, 'Uses the target’s Attack stat against it.'),
  M('darkpulse', 'Dark Pulse', 'Dark', 'special', 80, 100, 15, 'May flinch the target.'),

  M('earthquake', 'Earthquake', 'Ground', 'physical', 100, 100, 10, 'Hits all adjacent Pokemon.'),
  M('highhorsepower', 'High Horsepower', 'Ground', 'physical', 95, 95, 10, 'Single-target Ground damage.'),
  M('earthpower', 'Earth Power', 'Ground', 'special', 90, 100, 10, 'May lower the target’s Special Defense.'),
  M('bulldoze', 'Bulldoze', 'Ground', 'physical', 60, 100, 20, 'Spread Ground damage that lowers Speed.'),

  M('ironhead', 'Iron Head', 'Steel', 'physical', 80, 100, 15, 'May flinch the target.'),
  M('heavyslam', 'Heavy Slam', 'Steel', 'physical', null, 100, 10, 'Stronger the heavier the user is than the target.'),
  M('steelbeam', 'Steel Beam', 'Steel', 'special', 140, 95, 5, 'Powerful Steel damage that hurts the user.'),

  M('flamethrower', 'Flamethrower', 'Fire', 'special', 90, 100, 15, 'May burn the target.'),
  M('fireblast', 'Fire Blast', 'Fire', 'special', 110, 85, 5, 'May burn the target.'),
  M('heatwave', 'Heat Wave', 'Fire', 'special', 95, 90, 10, 'Spread Fire damage with a burn chance.'),
  M('flareblitz', 'Flare Blitz', 'Fire', 'physical', 120, 100, 15, 'Strong Fire damage with recoil.'),
  M('willowisp', 'Will-O-Wisp', 'Fire', 'status', null, 85, 15, 'Burns the target.'),

  M('hydropump', 'Hydro Pump', 'Water', 'special', 110, 80, 5, 'Powerful but inaccurate Water damage.'),
  M('surf', 'Surf', 'Water', 'special', 90, 100, 15, 'Hits all adjacent Pokemon.'),
  M('scald', 'Scald', 'Water', 'special', 80, 100, 15, 'May burn the target.'),

  M('thunderbolt', 'Thunderbolt', 'Electric', 'special', 90, 100, 15, 'May paralyze the target.'),
  M('voltswitch', 'Volt Switch', 'Electric', 'special', 70, 100, 20, 'Switches the user out after damage.'),
  M('discharge', 'Discharge', 'Electric', 'special', 80, 100, 15, 'Spread Electric damage with a paralysis chance.'),
  M('thunderwave', 'Thunder Wave', 'Electric', 'status', null, 90, 20, 'Paralyzes the target.'),

  M('energyball', 'Energy Ball', 'Grass', 'special', 90, 100, 10, 'May lower the target’s Special Defense.'),
  M('gigadrain', 'Giga Drain', 'Grass', 'special', 75, 100, 10, 'Heals the user for half the damage dealt.'),
  M('spore', 'Spore', 'Grass', 'status', null, 100, 15, 'Puts the target to sleep.'),
  M('pollenpuff', 'Pollen Puff', 'Bug', 'special', 90, 100, 15, 'Damages foes or heals allies.'),
  M('ragepowder', 'Rage Powder', 'Bug', 'status', null, null, 20, 'Draws single-target moves to the user.'),
  M('leechseed', 'Leech Seed', 'Grass', 'status', null, 90, 10, 'Saps the target’s HP each turn.'),
  M('bugbuzz', 'Bug Buzz', 'Bug', 'special', 90, 100, 10, 'May lower the target’s Special Defense.'),

  M('bravebird', 'Brave Bird', 'Flying', 'physical', 120, 100, 15, 'Strong Flying damage with recoil.'),
  M('airslash', 'Air Slash', 'Flying', 'special', 75, 95, 15, 'May flinch the target.'),
  M('tailwind', 'Tailwind', 'Flying', 'status', null, null, 15, 'Doubles your team’s Speed for a few turns.'),
  M('hurricane', 'Hurricane', 'Flying', 'special', 110, 70, 10, 'May confuse the target.'),
  M('acrobatics', 'Acrobatics', 'Flying', 'physical', 55, 100, 15, 'Doubles in power with no held item.'),

  M('moonblast', 'Moonblast', 'Fairy', 'special', 95, 100, 15, 'May lower the target’s Special Attack.'),
  M('dazzlinggleam', 'Dazzling Gleam', 'Fairy', 'special', 80, 100, 10, 'Spread Fairy damage.'),

  M('closecombat', 'Close Combat', 'Fighting', 'physical', 120, 100, 5, 'Lowers the user’s defenses after hitting.'),
  M('lowkick', 'Low Kick', 'Fighting', 'physical', null, 100, 20, 'Stronger against heavier targets.'),
  M('drainpunch', 'Drain Punch', 'Fighting', 'physical', 75, 100, 10, 'Heals the user for half the damage dealt.'),

  M('dragonclaw', 'Dragon Claw', 'Dragon', 'physical', 80, 100, 15, 'Reliable Dragon damage.'),
  M('outrage', 'Outrage', 'Dragon', 'physical', 120, 100, 10, 'Locks the user in for a few turns.'),
  M('dracometeor', 'Draco Meteor', 'Dragon', 'special', 130, 90, 5, 'Sharply lowers the user’s Special Attack.'),
  M('dragonpulse', 'Dragon Pulse', 'Dragon', 'special', 85, 100, 10, 'Reliable special Dragon damage.'),

  M('trickroom', 'Trick Room', 'Psychic', 'status', null, null, 5, 'Slower Pokemon move first for a few turns.'),
  M('psychic', 'Psychic', 'Psychic', 'special', 90, 100, 10, 'May lower the target’s Special Defense.'),

  M('icebeam', 'Ice Beam', 'Ice', 'special', 90, 100, 10, 'May freeze the target.'),
  M('iciclecrash', 'Icicle Crash', 'Ice', 'physical', 85, 90, 10, 'May flinch the target.'),

  M('sludgebomb', 'Sludge Bomb', 'Poison', 'special', 90, 100, 10, 'May poison the target.'),
  M('clearsmog', 'Clear Smog', 'Poison', 'special', 50, null, 15, 'Removes the target’s stat changes.'),
]

export const editorMovesById: Record<string, EditorMove> = Object.fromEntries(
  editorMoves.map((move) => [move.showdownId, move]),
)

// Per-species "any game" learnsets (sample data). Not format-filtered.
export const learnsets: Record<string, string[]> = {
  tyranitar: [
    'rockslide', 'stoneedge', 'stealthrock', 'crunch', 'knockoff', 'darkpulse', 'earthquake',
    'highhorsepower', 'bulldoze', 'ironhead', 'heavyslam', 'lowkick', 'icebeam', 'flamethrower',
    'fireblast', 'thunderwave', 'dragonclaw', 'dragonpulse', 'bodyslam', 'facade', 'protect',
    'substitute', 'swordsdance', 'terablast',
  ],
  excadrill: [
    'earthquake', 'highhorsepower', 'bulldoze', 'ironhead', 'heavyslam', 'rockslide', 'stoneedge',
    'stealthrock', 'knockoff', 'lowkick', 'bodyslam', 'facade', 'protect', 'substitute',
    'swordsdance', 'terablast',
  ],
  amoonguss: [
    'spore', 'ragepowder', 'pollenpuff', 'gigadrain', 'energyball', 'leechseed', 'sludgebomb',
    'clearsmog', 'protect', 'substitute', 'helpinghand', 'facade', 'terablast',
  ],
  talonflame: [
    'bravebird', 'flareblitz', 'acrobatics', 'airslash', 'hurricane', 'flamethrower', 'fireblast',
    'heatwave', 'willowisp', 'tailwind', 'protect', 'substitute', 'swordsdance', 'facade',
    'bodyslam', 'helpinghand', 'terablast',
  ],
  rotomwash: [
    'thunderbolt', 'voltswitch', 'discharge', 'thunderwave', 'hydropump', 'surf', 'scald',
    'willowisp', 'protect', 'substitute', 'trickroom', 'terablast',
  ],
  garchomp: [
    'earthquake', 'highhorsepower', 'bulldoze', 'dragonclaw', 'outrage', 'dragonpulse', 'dracometeor',
    'stoneedge', 'rockslide', 'stealthrock', 'crunch', 'ironhead', 'fireblast', 'flamethrower',
    'swordsdance', 'protect', 'substitute', 'facade', 'bodyslam', 'terablast',
  ],
  sylveon: [
    'moonblast', 'dazzlinggleam', 'hypervoice', 'psychic', 'drainpunch', 'helpinghand', 'protect',
    'substitute', 'terablast', 'bodyslam', 'facade',
  ],
}

const TYPE_ORDER: PokemonType[] = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice', 'Fighting', 'Poison', 'Ground',
  'Flying', 'Psychic', 'Bug', 'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy',
]

// Moves a species can learn, sorted by type then name (item #1).
export function getLearnsetMoves(speciesShowdownId: string): EditorMove[] {
  const ids = learnsets[speciesShowdownId] ?? []
  return ids
    .map((id) => editorMovesById[id])
    .filter((move): move is EditorMove => Boolean(move))
    .sort((a, b) => {
      const typeDelta = TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)
      return typeDelta !== 0 ? typeDelta : a.name.localeCompare(b.name)
    })
}

// Real base stats for the sample species (HP/Atk/Def/SpA/SpD/Spe).
export const baseStats: Record<string, StatSpread> = {
  tyranitar: { hp: 100, atk: 134, def: 110, spa: 95, spd: 100, spe: 61 },
  excadrill: { hp: 110, atk: 135, def: 60, spa: 50, spd: 65, spe: 88 },
  amoonguss: { hp: 114, atk: 85, def: 70, spa: 85, spd: 80, spe: 30 },
  talonflame: { hp: 78, atk: 81, def: 71, spa: 74, spd: 69, spe: 126 },
  rotomwash: { hp: 50, atk: 65, def: 107, spa: 105, spd: 107, spe: 86 },
  garchomp: { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
  sylveon: { hp: 95, atk: 65, def: 65, spa: 110, spd: 130, spe: 60 },
}

const DEFAULT_BASE: StatSpread = { hp: 80, atk: 80, def: 80, spa: 80, spd: 80, spe: 80 }

export function getBaseStats(speciesShowdownId: string): StatSpread {
  return baseStats[speciesShowdownId] ?? DEFAULT_BASE
}

export type NatureMods = { inc: keyof StatSpread | null; dec: keyof StatSpread | null }

export const natureMods: Record<string, NatureMods> = {
  adamant: { inc: 'atk', dec: 'spa' },
  jolly: { inc: 'spe', dec: 'spa' },
  relaxed: { inc: 'def', dec: 'spe' },
  modest: { inc: 'spa', dec: 'atk' },
  timid: { inc: 'spe', dec: 'atk' },
  calm: { inc: 'spd', dec: 'atk' },
}

export function getNatureMods(natureShowdownId: string): NatureMods {
  return natureMods[natureShowdownId] ?? { inc: null, dec: null }
}

// ---- Champion Points <-> EV conversion (Pokemon Champions: Lv50, IV31) ----
export const STANDARD_EV_MAX = 252
export const STANDARD_EV_TOTAL = 510
export const STANDARD_IV_MAX = 31
export const CHAMPION_SP_MAX = 32
export const CHAMPION_SP_TOTAL = 66
export const EV_PER_SP = 8
export const BATTLE_LEVEL = 50

export const STAT_KEYS: Array<keyof StatSpread> = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

// 1 SP == 8 EVs. Round on EV->SP so 252 EV maps to the 32 SP cap.
export function evToSp(ev: number): number {
  return clamp(Math.round(ev / EV_PER_SP), 0, CHAMPION_SP_MAX)
}

export function spToEv(sp: number): number {
  return clamp(Math.round(sp) * EV_PER_SP, 0, STANDARD_EV_MAX)
}

export function evSpreadToSp(evs: StatSpread): StatSpread {
  return {
    hp: evToSp(evs.hp),
    atk: evToSp(evs.atk),
    def: evToSp(evs.def),
    spa: evToSp(evs.spa),
    spd: evToSp(evs.spd),
    spe: evToSp(evs.spe),
  }
}

export function spSpreadToEv(sp: StatSpread): StatSpread {
  return {
    hp: spToEv(sp.hp),
    atk: spToEv(sp.atk),
    def: spToEv(sp.def),
    spa: spToEv(sp.spa),
    spd: spToEv(sp.spd),
    spe: spToEv(sp.spe),
  }
}

const spreadTotal = (spread: StatSpread) => STAT_KEYS.reduce((total, key) => total + spread[key], 0)

export function normalizeStandardEvSpread(evs: StatSpread): StatSpread {
  const next: StatSpread = {
    hp: clamp(evs.hp, 0, STANDARD_EV_MAX),
    atk: clamp(evs.atk, 0, STANDARD_EV_MAX),
    def: clamp(evs.def, 0, STANDARD_EV_MAX),
    spa: clamp(evs.spa, 0, STANDARD_EV_MAX),
    spd: clamp(evs.spd, 0, STANDARD_EV_MAX),
    spe: clamp(evs.spe, 0, STANDARD_EV_MAX),
  }

  while (spreadTotal(next) > STANDARD_EV_TOTAL) {
    const trimStat = STAT_KEYS.filter((key) => next[key] > 0).sort((a, b) => next[a] - next[b])[0]

    if (!trimStat) {
      break
    }

    next[trimStat] = Math.max(0, next[trimStat] - 4)
  }

  return next
}

// ---- Lv50 stat formula ----
export function computeStatValue(
  base: number,
  ev: number,
  iv: number,
  isHp: boolean,
  natureMult: number,
): number {
  const core = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * BATTLE_LEVEL) / 100)
  if (isHp) {
    return core + BATTLE_LEVEL + 10
  }
  return Math.floor((core + 5) * natureMult)
}

export function computeStats(
  base: StatSpread,
  evs: StatSpread,
  ivs: StatSpread,
  nature: NatureMods,
): StatSpread {
  const result = {} as StatSpread
  STAT_KEYS.forEach((key) => {
    const isHp = key === 'hp'
    const mult = nature.inc === key ? 1.1 : nature.dec === key ? 0.9 : 1
    result[key] = computeStatValue(base[key], evs[key], ivs[key], isHp, mult)
  })
  return result
}

export const STAT_LABELS: Record<keyof StatSpread, string> = {
  hp: 'HP',
  atk: 'Atk',
  def: 'Def',
  spa: 'SpA',
  spd: 'SpD',
  spe: 'Spe',
}
