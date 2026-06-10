import type { PokemonBuild, PokemonType } from '../types'

export type TeamSlotPokemon = PokemonBuild

type TeamSlotCardProps = {
  slotNumber: number
  pokemon?: TeamSlotPokemon | null
  onSelect?: (slotIndex: number) => void
  onClear?: (slotIndex: number) => void
}

// Display-only typing lookup. Types are catalog/display data (per BL-008),
// kept out of the user build model. Unknown species render no type pills.
const speciesTypes: Record<string, PokemonType[]> = {
  tyranitar: ['Rock', 'Dark'],
  excadrill: ['Ground', 'Steel'],
  talonflame: ['Fire', 'Flying'],
  amoonguss: ['Grass', 'Poison'],
  garchomp: ['Dragon', 'Ground'],
  'rotom-wash': ['Electric', 'Water'],
  charizard: ['Fire', 'Flying'],
  heatran: ['Fire', 'Steel'],
  gardevoir: ['Psychic', 'Fairy'],
  dragonite: ['Dragon', 'Flying'],
  greninja: ['Water', 'Dark'],
  ferrothorn: ['Grass', 'Steel'],
  metagross: ['Steel', 'Psychic'],
  incineroar: ['Fire', 'Dark'],
}

const getSpeciesTypes = (species: string): PokemonType[] =>
  speciesTypes[species.toLowerCase()] ?? []

const typeClassName = (typeName: string) =>
  `bl-type-pill bl-type-${typeName.toLowerCase().replace(/\s+/g, '-')}`

const getInitials = (species: string) =>
  species
    .split(/[\s-]+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

const getVisualMetadata = (pokemon: PokemonBuild) => {
  const visualKey = pokemon.iconKey ?? pokemon.spriteKey

  return {
    hasVisualKey: Boolean(visualKey),
    label: getInitials(pokemon.species),
    title: visualKey
      ? `${pokemon.species} visual metadata: ${visualKey}`
      : `${pokemon.species} initials fallback`,
  }
}

const getEvTotal = (pokemon: PokemonBuild) =>
  Object.values(pokemon.evs).reduce((total, value) => total + value, 0)

export function TeamSlotCard({ slotNumber, pokemon, onSelect, onClear }: TeamSlotCardProps) {
  const slotIndex = slotNumber - 1
  const isFilled = Boolean(pokemon)
  const accessibleName = isFilled
    ? `Edit slot ${slotNumber}, ${pokemon?.species}`
    : `Add Pokemon to slot ${slotNumber}`
  const visualMetadata = pokemon ? getVisualMetadata(pokemon) : null
  const types = pokemon ? getSpeciesTypes(pokemon.species) : []
  const evTotal = pokemon ? getEvTotal(pokemon) : 0
  const evPercent = Math.min(100, Math.round((evTotal / 510) * 100))

  return (
    <article
      className={`bl-team-slot ${isFilled ? 'is-filled' : 'is-empty'}`}
    >
      <button
        className="bl-slot-main-action"
        type="button"
      aria-label={accessibleName}
      onClick={() => onSelect?.(slotIndex)}
      >
      <span className="bl-slot-kicker">Slot {slotNumber}</span>

      {pokemon ? (
        <>
          <span className="bl-slot-mode-tag">STD</span>

          <span className="bl-slot-art-wrap">
            <span
              className={`bl-slot-avatar ${visualMetadata?.hasVisualKey ? 'has-visual-key' : 'is-fallback'}`}
              data-icon-key={pokemon.iconKey}
              data-sprite-key={pokemon.spriteKey}
              title={visualMetadata?.title}
              aria-hidden="true"
            >
              <span className="bl-slot-avatar-mark">{visualMetadata?.label}</span>
            </span>
          </span>

          <span className="bl-slot-identity">
            <span className="bl-slot-name">{pokemon.species}</span>
            {pokemon.nickname ? <span className="bl-slot-nickname">{pokemon.nickname}</span> : null}
          </span>

          <span className="bl-slot-types" aria-label={`${pokemon.species} typing`}>
            {types.map((typeName) => (
              <span className={typeClassName(typeName)} key={typeName}>
                {typeName}
              </span>
            ))}
            <span className="bl-type-pill">Lv. {pokemon.level}</span>
            {pokemon.gender ? <span className="bl-type-pill">{pokemon.gender}</span> : null}
          </span>

          <span className="bl-slot-statbar" aria-label={`${pokemon.species} EV total ${evTotal} of 510`}>
            <span>
              <strong>{evTotal}</strong>
              <em>/ 510 EVs</em>
            </span>
            <span className="bl-slot-stat-track">
              <span style={{ width: `${evPercent}%` }} />
            </span>
          </span>

          <span className="bl-slot-summary">
            <span className="bl-slot-meta-row">
              <strong>Item</strong>
              <em>{pokemon.item}</em>
            </span>
            <span className="bl-slot-meta-row">
              <strong>Ability</strong>
              <em>{pokemon.ability}</em>
            </span>
            <span className="bl-slot-meta-row">
              <strong>Nature</strong>
              <em>{pokemon.nature}</em>
            </span>
            <span className="bl-slot-meta-row">
              <strong>Tera</strong>
              <em>{pokemon.teraType}</em>
            </span>
          </span>

          <span className="bl-move-list" aria-label={`${pokemon.species} moves`}>
            {pokemon.moves.map((move) => (
              <span key={move}>{move}</span>
            ))}
          </span>
        </>
      ) : (
        <>
          <span className="bl-empty-plus" aria-hidden="true">
            +
          </span>
          <span className="bl-empty-title">Add Pokemon</span>
          <span className="bl-empty-detail">Click to choose a build for this team slot.</span>
        </>
      )}
      </button>
      {pokemon ? (
        <button
          className="bl-slot-clear-button"
          type="button"
          aria-label={`Clear slot ${slotNumber}, ${pokemon.species}`}
          onClick={() => onClear?.(slotIndex)}
        >
          Clear
        </button>
      ) : null}
    </article>
  )
}
