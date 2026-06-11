import { useMemo, useState, type FormEvent } from 'react'
import {
  fakeAbilityCatalogOptions,
  fakeItemCatalogOptions,
  fakeMoveCatalogOptions,
  fakeNatureCatalogOptions,
  fakePokemonCatalogOptions,
  fakeTypeCatalogOptions,
} from '../data'
import type { CatalogPickerOption } from '../types/catalog'
import type { BuildCatalogReference, PokemonBuild, PokemonType, StatSpread } from '../types'
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

const getInitials = (species: string) =>
  species
    .split(/[\s-]+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

const toSlotNumber = (slot: number): PokemonBuild['slot'] =>
  Math.min(Math.max(slot, 1), 6) as PokemonBuild['slot']

const getOptionLabel = (options: CatalogPickerOption[], fallback: string) =>
  options[0]?.displayName ?? fallback

const toBuildRef = (option?: CatalogPickerOption): BuildCatalogReference | undefined => {
  if (!option) {
    return undefined
  }

  return {
    catalogKey: option.catalogKey,
    ...(option.showdownId ? { showdownId: option.showdownId } : {}),
    displayName: option.displayName,
  }
}

const findOptionByLabel = (options: CatalogPickerOption[], label: string) =>
  options.find(
    (option) =>
      option.displayName === label ||
      option.showdownId === label.toLowerCase().replace(/[^a-z0-9]+/g, ''),
  )

const findMoveRef = (move: string): BuildCatalogReference | null =>
  toBuildRef(findOptionByLabel(fakeMoveCatalogOptions, move)) ?? null

const createPokemonBuildFromOption = (
  option: CatalogPickerOption,
  slot: PokemonBuild['slot'],
  current?: PokemonBuild | null,
): PokemonBuild => {
  const speciesChanged = current ? current.species !== option.displayName : true
  const defaultItem = fakeItemCatalogOptions[0]
  const defaultAbility = fakeAbilityCatalogOptions[0]
  const defaultNature = fakeNatureCatalogOptions[0]
  const teraTypeOption = fakeTypeCatalogOptions.find(
    (candidate) => candidate.displayName === (option.primaryType ?? current?.teraType ?? 'Normal'),
  )
  const moves = current?.moves ?? (['Protect', 'Tera Blast', '', ''] as PokemonBuild['moves'])

  return {
    id: speciesChanged ? `draft-${option.catalogKey}-slot-${slot}` : current?.id ?? `draft-${option.catalogKey}-slot-${slot}`,
    slot,
    species: option.displayName,
    speciesRef: toBuildRef(option),
    iconKey: option.asset?.iconKey,
    spriteKey: option.asset?.spriteKey,
    level: current?.level ?? 50,
    gender: current?.gender,
    teraType: option.primaryType ?? current?.teraType ?? 'Normal',
    teraTypeRef: toBuildRef(teraTypeOption) ?? current?.teraTypeRef,
    item: current?.item ?? getOptionLabel(fakeItemCatalogOptions, 'Sitrus Berry'),
    itemRef: current?.itemRef ?? toBuildRef(defaultItem),
    ability: current?.ability ?? getOptionLabel(fakeAbilityCatalogOptions, 'Levitate'),
    abilityRef: current?.abilityRef ?? toBuildRef(defaultAbility),
    nature: current?.nature ?? getOptionLabel(fakeNatureCatalogOptions, 'Jolly'),
    natureRef: current?.natureRef ?? toBuildRef(defaultNature),
    moves,
    moveRefs: current?.moveRefs ?? (moves.map(findMoveRef) as PokemonBuild['moveRefs']),
    evs: current?.evs ?? { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 },
    ivs: current?.ivs ?? { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    notes: speciesChanged ? option.description : current?.notes ?? option.description,
  }
}

const findPokemonOptionKey = (pokemon: PokemonBuild | null) =>
  pokemon
    ? fakePokemonCatalogOptions.find(
        (option) => option.displayName === pokemon.species || option.showdownId === pokemon.species.toLowerCase(),
      )?.catalogKey ?? ''
    : ''

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
  const selectedSlot = toSlotNumber(
    slotNumber ?? (slotIndex !== null && slotIndex !== undefined ? slotIndex + 1 : undefined) ?? pokemon?.slot ?? 1,
  )
  const initialPokemon = useMemo(
    () =>
      pokemon ??
      (fakePokemonCatalogOptions[0]
        ? createPokemonBuildFromOption(fakePokemonCatalogOptions[0], selectedSlot)
        : null),
    [pokemon, selectedSlot],
  )
  const [draftPokemon, setDraftPokemon] = useState<PokemonBuild | null>(initialPokemon)
  const [mode, setMode] = useState<EditorMode>('standard-evs')

  const panelOpen = open ?? isOpen ?? true
  const visualKey = draftPokemon?.iconKey ?? draftPokemon?.spriteKey
  const selectedPokemonOptionKey = findPokemonOptionKey(draftPokemon)
  const selectedPokemonOption = fakePokemonCatalogOptions.find(
    (candidate) => candidate.catalogKey === selectedPokemonOptionKey,
  )
  const selectedPokemonTypes = selectedPokemonOption
    ? [selectedPokemonOption.primaryType, selectedPokemonOption.secondaryType].filter(Boolean).join(' / ')
    : ''
  const selectedPokemonSummary = selectedPokemonTypes
    ? `${selectedPokemonTypes}-type`
    : draftPokemon
      ? `${draftPokemon.teraType} Tera build`
      : 'Pick a Pokemon to start building this slot.'

  const updateDraft = (updates: Partial<PokemonBuild>) => {
    setDraftPokemon((current) => (current ? { ...current, ...updates } : current))
  }

  const updateMove = (moveIndex: number, value: string) => {
    setDraftPokemon((current) => {
      if (!current) {
        return current
      }

      const moves = current.moves.map((move, index) => (index === moveIndex ? value : move))
      const moveRefs = (current.moveRefs ?? [null, null, null, null]).map((moveRef, index) =>
        index === moveIndex ? findMoveRef(value) : moveRef,
      )
      return { ...current, moves: moves as PokemonBuild['moves'], moveRefs: moveRefs as PokemonBuild['moveRefs'] }
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

  const handleSelectPokemon = (catalogKey: string) => {
    const selectedPokemon = fakePokemonCatalogOptions.find((candidate) => candidate.catalogKey === catalogKey)

    if (selectedPokemon) {
      setDraftPokemon((current) => createPokemonBuildFromOption(selectedPokemon, selectedSlot, current))
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
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
                  <span>{selectedPokemonSummary}</span>
                </div>
              </section>

              <section className="bl-editor-section">
                <label className="bl-editor-field">
                  <span>Pokemon</span>
                  <select
                    value={selectedPokemonOptionKey}
                    onChange={(event) => handleSelectPokemon(event.target.value)}
                  >
                    {fakePokemonCatalogOptions.map((candidate) => (
                      <option value={candidate.catalogKey} key={candidate.catalogKey}>
                        {candidate.displayName}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="bl-editor-grid-2">
                  <label className="bl-editor-field">
                    <span>Item</span>
                    <select
                      value={draftPokemon.item}
                      onChange={(event) => {
                        const selectedItem = findOptionByLabel(fakeItemCatalogOptions, event.target.value)
                        const itemRef = toBuildRef(selectedItem)
                        updateDraft({
                          item: event.target.value,
                          ...(itemRef ? { itemRef } : {}),
                        })
                      }}
                    >
                      {fakeItemCatalogOptions.map((option) => (
                        <option value={option.displayName} key={option.catalogKey}>
                          {option.displayName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="bl-editor-field">
                    <span>Ability</span>
                    <select
                      value={draftPokemon.ability}
                      onChange={(event) => {
                        const selectedAbility = findOptionByLabel(fakeAbilityCatalogOptions, event.target.value)
                        const abilityRef = toBuildRef(selectedAbility)
                        updateDraft({
                          ability: event.target.value,
                          ...(abilityRef ? { abilityRef } : {}),
                        })
                      }}
                    >
                      {fakeAbilityCatalogOptions.map((option) => (
                        <option value={option.displayName} key={option.catalogKey}>
                          {option.displayName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="bl-editor-field">
                    <span>Nature</span>
                    <select
                      value={draftPokemon.nature}
                      onChange={(event) => {
                        const selectedNature = findOptionByLabel(fakeNatureCatalogOptions, event.target.value)
                        const natureRef = toBuildRef(selectedNature)
                        updateDraft({
                          nature: event.target.value,
                          ...(natureRef ? { natureRef } : {}),
                        })
                      }}
                    >
                      {fakeNatureCatalogOptions.map((option) => (
                        <option value={option.displayName} key={option.catalogKey}>
                          {option.displayName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="bl-editor-field">
                    <span>Tera type</span>
                    <select
                      value={draftPokemon.teraType}
                      onChange={(event) => {
                        const selectedType = findOptionByLabel(fakeTypeCatalogOptions, event.target.value)
                        const teraTypeRef = toBuildRef(selectedType)
                        updateDraft({
                          teraType: event.target.value as PokemonType,
                          ...(teraTypeRef ? { teraTypeRef } : {}),
                        })
                      }}
                    >
                      {fakeTypeCatalogOptions.map((typeOption) => (
                        <option value={typeOption.displayName} key={typeOption.catalogKey}>
                          {typeOption.displayName}
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
                <p>Pick a Pokemon to start building this slot.</p>
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
