import { useMemo, useState } from 'react'
import { submittedTeam } from '../data'
import type { PokemonBuild, PokemonType, StatSpread } from '../types'
import '../styles/pokemon-editor-panel.css'

type EditorMode = 'standard-evs' | 'champion-points'

export type PokemonEditorDraft = {
  pokemon: PokemonBuild
  mode: EditorMode
}

export type PokemonEditorPanelProps = {
  open?: boolean
  isOpen?: boolean
  slotIndex?: number | null
  slotNumber?: number
  pokemon?: PokemonBuild | null
  onClose?: () => void
  onSave?: (draft: PokemonEditorDraft) => void
}

const statKeys: Array<keyof StatSpread> = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']

const statLabels: Record<keyof StatSpread, string> = {
  hp: 'HP',
  atk: 'Atk',
  def: 'Def',
  spa: 'SpA',
  spd: 'SpD',
  spe: 'Spe',
}

const teraTypeOptions: PokemonType[] = [
  'Normal',
  'Fire',
  'Water',
  'Electric',
  'Grass',
  'Ice',
  'Fighting',
  'Poison',
  'Ground',
  'Flying',
  'Psychic',
  'Bug',
  'Rock',
  'Ghost',
  'Dragon',
  'Dark',
  'Steel',
  'Fairy',
]

const getInitials = (species: string) =>
  species
    .split(/[\s-]+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

const getSelectablePokemon = () =>
  submittedTeam.slots
    .map((slot) => slot.pokemon)
    .filter((candidate): candidate is PokemonBuild => Boolean(candidate))

function getVisualTitle(pokemon: PokemonBuild) {
  const visualKey = pokemon.iconKey ?? pokemon.spriteKey

  return visualKey
    ? `${pokemon.species} visual metadata: ${visualKey}`
    : `${pokemon.species} initials fallback`
}

export function PokemonEditorPanel({
  open,
  isOpen,
  slotIndex,
  slotNumber,
  pokemon,
  onClose,
  onSave,
}: PokemonEditorPanelProps) {
  const selectablePokemon = useMemo(() => getSelectablePokemon(), [])
  const initialPokemon = pokemon ?? selectablePokemon[0] ?? null
  const [draftPokemon, setDraftPokemon] = useState<PokemonBuild | null>(initialPokemon)
  const [mode, setMode] = useState<EditorMode>('standard-evs')

  const panelOpen = open ?? isOpen ?? true
  const selectedSlot = slotNumber ?? (slotIndex !== null && slotIndex !== undefined ? slotIndex + 1 : undefined) ?? draftPokemon?.slot
  const visualKey = draftPokemon?.iconKey ?? draftPokemon?.spriteKey

  const updateDraft = (updates: Partial<PokemonBuild>) => {
    setDraftPokemon((current) => (current ? { ...current, ...updates } : current))
  }

  const updateMove = (moveIndex: number, value: string) => {
    setDraftPokemon((current) => {
      if (!current) {
        return current
      }

      const moves = current.moves.map((move, index) => (index === moveIndex ? value : move))
      return { ...current, moves: moves as PokemonBuild['moves'] }
    })
  }

  const updateEv = (stat: keyof StatSpread, value: number) => {
    setDraftPokemon((current) =>
      current
        ? {
            ...current,
            evs: {
              ...current.evs,
              [stat]: value,
            },
          }
        : current,
    )
  }

  const handleSelectPokemon = (pokemonId: string) => {
    const selectedPokemon = selectablePokemon.find((candidate) => candidate.id === pokemonId)

    if (selectedPokemon) {
      setDraftPokemon(selectedPokemon)
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (draftPokemon) {
      onSave?.({ pokemon: draftPokemon, mode })
    }
  }

  return (
      <aside
        className={`bl-editor-panel side-panel wide ${panelOpen ? 'is-open open' : ''}`}
        aria-labelledby="pokemon-editor-title"
        aria-hidden={!panelOpen}
        data-open={panelOpen}
      >
        <form className="bl-editor-form" onSubmit={handleSubmit}>
          <header className="bl-editor-header ph">
            <div>
              <span className="eyebrow">Pokemon Editor</span>
              <h2 id="pokemon-editor-title">
                {draftPokemon ? draftPokemon.species : 'Empty slot'}
              </h2>
              <p>{selectedSlot ? `Slot ${selectedSlot}` : 'Choose a Pokemon to begin.'}</p>
            </div>
            <button className="bl-editor-icon-button" type="button" aria-label="Close" onClick={onClose}>
              x
            </button>
          </header>

          <div className="bl-editor-body pb">
            {draftPokemon ? (
              <>
              <section className="bl-editor-hero" aria-label="Selected Pokemon summary">
                <span
                  className={`bl-editor-avatar ${visualKey ? 'has-visual-key' : 'is-fallback'}`}
                  data-icon-key={draftPokemon.iconKey}
                  data-sprite-key={draftPokemon.spriteKey}
                  title={getVisualTitle(draftPokemon)}
                  aria-hidden="true"
                >
                  <span>{getInitials(draftPokemon.species)}</span>
                </span>
                <div>
                  <strong>{draftPokemon.species}</strong>
                  <span>{visualKey ? `Visual key: ${visualKey}` : 'Text fallback active'}</span>
                </div>
              </section>

              <section className="bl-editor-section">
                <label className="bl-editor-field">
                  <span>Pokemon</span>
                  <select
                    value={draftPokemon.id}
                    onChange={(event) => handleSelectPokemon(event.target.value)}
                  >
                    {selectablePokemon.map((candidate) => (
                      <option value={candidate.id} key={candidate.id}>
                        {candidate.species}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="bl-editor-grid-2">
                  <label className="bl-editor-field">
                    <span>Item</span>
                    <input
                      value={draftPokemon.item}
                      onChange={(event) => updateDraft({ item: event.target.value })}
                    />
                  </label>
                  <label className="bl-editor-field">
                    <span>Ability</span>
                    <input
                      value={draftPokemon.ability}
                      onChange={(event) => updateDraft({ ability: event.target.value })}
                    />
                  </label>
                  <label className="bl-editor-field">
                    <span>Nature</span>
                    <input
                      value={draftPokemon.nature}
                      onChange={(event) => updateDraft({ nature: event.target.value })}
                    />
                  </label>
                  <label className="bl-editor-field">
                    <span>Tera type</span>
                    <select
                      value={draftPokemon.teraType}
                      onChange={(event) =>
                        updateDraft({ teraType: event.target.value as PokemonType })
                      }
                    >
                      {teraTypeOptions.map((typeName) => (
                        <option value={typeName} key={typeName}>
                          {typeName}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              <section className="bl-editor-section">
                <div className="bl-editor-section-heading">
                  <h3>Moves</h3>
                  <span>4 slots</span>
                </div>
                <div className="bl-move-editor-list">
                  {draftPokemon.moves.map((move, index) => (
                    <label className="bl-editor-field" key={`${draftPokemon.id}-move-${index}`}>
                      <span>Move {index + 1}</span>
                      <input value={move} onChange={(event) => updateMove(index, event.target.value)} />
                    </label>
                  ))}
                </div>
              </section>

              <section className="bl-editor-section">
                <div className="bl-editor-section-heading">
                  <h3>Training</h3>
                  <div className="bl-editor-toggle" role="group" aria-label="Training mode">
                    <button
                      className={mode === 'standard-evs' ? 'active' : ''}
                      type="button"
                      onClick={() => setMode('standard-evs')}
                    >
                      Standard EVs
                    </button>
                    <button
                      className={mode === 'champion-points' ? 'active' : ''}
                      type="button"
                      onClick={() => setMode('champion-points')}
                    >
                      Champion points
                    </button>
                  </div>
                </div>

                <div className="bl-stat-slider-list">
                  {statKeys.map((stat) => (
                    <label className="bl-stat-slider" key={stat}>
                      <span>
                        <strong>{statLabels[stat]}</strong>
                        {draftPokemon.evs[stat]}
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="252"
                        step="4"
                        value={draftPokemon.evs[stat]}
                        onChange={(event) => updateEv(stat, Number(event.target.value))}
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section className="bl-editor-section">
                <label className="bl-editor-field">
                  <span>Notes</span>
                  <textarea
                    value={draftPokemon.notes ?? ''}
                    onChange={(event) => updateDraft({ notes: event.target.value })}
                    rows={3}
                  />
                </label>
              </section>
              </>
            ) : (
              <section className="bl-editor-empty">
                <h3>No Pokemon selected</h3>
                <p>Lead wiring can pass the clicked slot or a new local draft when the panel is integrated.</p>
              </section>
            )}
          </div>

          <footer className="bl-editor-footer pf">
            <button className="secondary-action" type="button" onClick={onClose}>
              Close
            </button>
            <button className="primary-action" type="submit" disabled={!draftPokemon}>
              Save build
            </button>
          </footer>
        </form>
      </aside>
  )
}

export default PokemonEditorPanel
