import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  fakeAbilityCatalogOptions,
  fakeItemCatalogOptions,
  fakeNatureCatalogOptions,
  fakePokemonCatalogOptions,
  fakeTypeCatalogOptions,
} from '../data'
import {
  CATEGORY_META,
  CHAMPION_SP_MAX,
  CHAMPION_SP_TOTAL,
  STANDARD_EV_MAX,
  STANDARD_EV_TOTAL,
  STANDARD_IV_MAX,
  STAT_LABELS,
  computeStats,
  editorMoves,
  editorMovesById,
  evSpreadToSp,
  getStatTier,
  getBaseStats,
  getLearnsetMoves,
  getNatureMods,
  normalizeStandardEvSpread,
  spSpreadToEv,
  spToEv,
  type MoveCategory,
  STAT_TIER_LABELS,
} from '../data/pokemonEditorData'
import { Combobox, type ComboOption } from '../components/Combobox'
import { Tooltip, TooltipCard } from '../components/Tooltip'
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
const MAXED_IVS: StatSpread = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }

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
  if (!option) return undefined
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

const moveIdByName: Record<string, string> = Object.fromEntries(
  editorMoves.map((move) => [move.name, move.showdownId]),
)

const findMoveRef = (name: string): BuildCatalogReference | null => {
  const id = moveIdByName[name]
  const move = id ? editorMovesById[id] : undefined
  return move ? { catalogKey: `move-${move.showdownId}`, showdownId: move.showdownId, displayName: move.name } : null
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const standardEvTickMarks = [0, 84, 168, STANDARD_EV_MAX]
const championSpTickMarks = [0, 8, 16, 24, CHAMPION_SP_MAX]

const alignStandardEvStep = (value: number) => Math.floor(value / 4) * 4

const getBudgetedStandardEvMax = (evs: StatSpread, stat: keyof StatSpread) => {
  const currentValue = clamp(evs[stat], 0, STANDARD_EV_MAX)
  const otherTotal = statKeys.reduce((total, key) => (key === stat ? total : total + evs[key]), 0)
  const availableForStat = alignStandardEvStep(Math.max(0, STANDARD_EV_TOTAL - otherTotal))
  const budgetedMax = Math.min(STANDARD_EV_MAX, availableForStat)

  return Math.max(currentValue, budgetedMax)
}

const getBudgetedChampionSpMax = (sp: StatSpread, stat: keyof StatSpread) => {
  const currentValue = clamp(sp[stat], 0, CHAMPION_SP_MAX)
  const otherTotal = statKeys.reduce((total, key) => (key === stat ? total : total + sp[key]), 0)
  const availableForStat = Math.max(0, CHAMPION_SP_TOTAL - otherTotal)
  const budgetedMax = Math.min(CHAMPION_SP_MAX, availableForStat)

  return Math.max(currentValue, budgetedMax)
}

// ---- Type + category icons (item #2) ----
function TypeBadge({ type }: { type: PokemonType }) {
  return (
    <span className={`bl-type-pill bl-type-${type.toLowerCase()}`} title={type}>
      {type}
    </span>
  )
}

function CategoryIcon({ category }: { category: MoveCategory }) {
  return (
    <span className={`bl-cat-icon is-${category}`} title={CATEGORY_META[category].label} aria-label={CATEGORY_META[category].label} />
  )
}

function moveTooltip(move: (typeof editorMoves)[number]): ReactNode {
  return (
    <TooltipCard
      icon={<TypeBadge type={move.type} />}
      title={move.name}
      subtitle={`${move.type} · ${CATEGORY_META[move.category].label}`}
      rows={[
        { label: 'Power', value: move.power ?? '—' },
        { label: 'Accuracy', value: move.accuracy ? `${move.accuracy}%` : '—' },
        { label: 'PP', value: move.pp },
      ]}
      description={move.description}
    />
  )
}

function optionTooltip(option: CatalogPickerOption, subtitle: string): ReactNode {
  return <TooltipCard title={option.displayName} subtitle={subtitle} description={option.description} />
}

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
    id: speciesChanged
      ? `draft-${option.catalogKey}-slot-${slot}`
      : current?.id ?? `draft-${option.catalogKey}-slot-${slot}`,
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
    ivs: current?.ivs ?? { ...MAXED_IVS },
    notes: speciesChanged ? option.description : current?.notes ?? option.description,
  }
}

const findPokemonOptionKey = (pokemon: PokemonBuild | null) =>
  pokemon
    ? fakePokemonCatalogOptions.find(
        (option) =>
          option.displayName === pokemon.species || option.showdownId === pokemon.species.toLowerCase(),
      )?.catalogKey ?? ''
    : ''

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
  const [standardIvs, setStandardIvs] = useState<StatSpread>(initialPokemon?.ivs ?? { ...MAXED_IVS })
  const [trimNotice, setTrimNotice] = useState(false)

  const panelOpen = open ?? isOpen ?? true
  const visualKey = draftPokemon?.iconKey ?? draftPokemon?.spriteKey
  const selectedPokemonOptionKey = findPokemonOptionKey(draftPokemon)
  const selectedPokemonOption = fakePokemonCatalogOptions.find(
    (candidate) => candidate.catalogKey === selectedPokemonOptionKey,
  )
  const speciesShowdownId = selectedPokemonOption?.showdownId ?? draftPokemon?.species.toLowerCase() ?? ''

  const updateDraft = (updates: Partial<PokemonBuild>) => {
    setDraftPokemon((current) => (current ? { ...current, ...updates } : current))
  }

  const handleSelectPokemon = (catalogKey: string) => {
    const next = fakePokemonCatalogOptions.find((candidate) => candidate.catalogKey === catalogKey)
    if (next) {
      setDraftPokemon((current) => createPokemonBuildFromOption(next, selectedSlot, current))
      setTrimNotice(false)
    }
  }

  const handleMoveChange = (moveIndex: number, moveId: string) => {
    setDraftPokemon((current) => {
      if (!current) return current
      const move = moveId === '__none__' ? null : editorMovesById[moveId]
      const name = move?.name ?? ''
      const moves = current.moves.map((value, index) => (index === moveIndex ? name : value))
      const baseRefs = current.moveRefs ?? [null, null, null, null]
      const moveRefs = baseRefs.map((ref, index) => (index === moveIndex ? findMoveRef(name) : ref))
      return {
        ...current,
        moves: moves as PokemonBuild['moves'],
        moveRefs: moveRefs as PokemonBuild['moveRefs'],
      }
    })
  }

  const handleModeChange = (next: EditorMode) => {
    if (next === mode) return
    if (next === 'champion-points') {
      // Normalize EVs onto the 8-EV champion grid and max IVs (Pokemon Champions).
      setDraftPokemon((current) =>
        current
          ? {
              ...current,
              evs: spSpreadToEv(evSpreadToSp(current.evs)),
              ivs: { ...MAXED_IVS },
            }
          : current,
      )
      setStandardIvs(draftPokemon?.ivs ?? standardIvs)
      setTrimNotice(false)
    } else {
      const convertedEvTotal = draftPokemon ? statKeys.reduce((total, key) => total + draftPokemon.evs[key], 0) : 0
      setDraftPokemon((current) =>
        current ? { ...current, evs: normalizeStandardEvSpread(current.evs), ivs: { ...standardIvs } } : current,
      )
      setTrimNotice(convertedEvTotal > STANDARD_EV_TOTAL)
    }
    setMode(next)
  }

  const updateEv = (stat: keyof StatSpread, value: number) => {
    setTrimNotice(false)
    setDraftPokemon((current) => {
      if (!current) return current

      const max = getBudgetedStandardEvMax(current.evs, stat)
      return { ...current, evs: { ...current.evs, [stat]: clamp(value, 0, max) } }
    })
  }

  const updateIv = (stat: keyof StatSpread, value: number) => {
    setTrimNotice(false)
    const nextValue = clamp(value, 0, STANDARD_IV_MAX)
    setStandardIvs((current) => ({ ...current, [stat]: nextValue }))
    setDraftPokemon((current) => (current ? { ...current, ivs: { ...current.ivs, [stat]: nextValue } } : current))
  }

  const updateSp = (stat: keyof StatSpread, sp: number) => {
    setTrimNotice(false)
    setDraftPokemon((current) => {
      if (!current) return current

      const currentSpSpread = evSpreadToSp(current.evs)
      const max = getBudgetedChampionSpMax(currentSpSpread, stat)
      const nextSp = clamp(sp, 0, max)

      return {
        ...current,
        evs: { ...current.evs, [stat]: spToEv(nextSp) },
        ivs: { ...current.ivs, [stat]: 31 },
      }
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (draftPokemon) {
      onSave?.({ pokemon: draftPokemon, mode })
    }
  }

  // ---- Derived data for pickers + stats ----
  const pokemonOptions: ComboOption[] = useMemo(
    () =>
      fakePokemonCatalogOptions.map((option) => {
        const types = [option.primaryType, option.secondaryType].filter(Boolean) as PokemonType[]
        return {
          value: option.catalogKey,
          label: option.displayName,
          searchText: `${option.displayName} ${option.aliases.join(' ')} ${types.join(' ')}`,
          leading: (
            <span className="bl-combo-types">
              {types.map((type) => (
                <TypeBadge type={type} key={type} />
              ))}
            </span>
          ),
          tooltip: optionTooltip(option, types.join(' / ') || 'Pokemon'),
        }
      }),
    [],
  )

  const buildSimpleOptions = (options: CatalogPickerOption[], kindLabel: string): ComboOption[] =>
    options.map((option) => ({
      value: option.displayName,
      label: option.displayName,
      searchText: `${option.displayName} ${option.aliases.join(' ')} ${option.description ?? ''}`,
      tooltip: optionTooltip(option, kindLabel),
    }))

  const itemOptions = useMemo(() => buildSimpleOptions(fakeItemCatalogOptions, 'Held item'), [])
  const abilityOptions = useMemo(() => buildSimpleOptions(fakeAbilityCatalogOptions, 'Ability'), [])
  const natureOptions = useMemo(() => buildSimpleOptions(fakeNatureCatalogOptions, 'Nature'), [])
  const teraOptions: ComboOption[] = useMemo(
    () =>
      fakeTypeCatalogOptions.map((option) => ({
        value: option.displayName,
        label: option.displayName,
        searchText: option.displayName,
        leading: option.primaryType ? <TypeBadge type={option.primaryType} /> : undefined,
        tooltip: optionTooltip(option, 'Tera type'),
      })),
    [],
  )

  const moveOptions: ComboOption[] = useMemo(() => {
    const learnset = getLearnsetMoves(speciesShowdownId)
    const noneOption: ComboOption = {
      value: '__none__',
      label: '— None —',
      searchText: 'none empty clear',
    }
    return [
      noneOption,
      ...learnset.map((move) => ({
        value: move.showdownId,
        label: move.name,
        searchText: `${move.name} ${move.type} ${CATEGORY_META[move.category].label}`,
        leading: (
          <span className="bl-move-lead">
            <TypeBadge type={move.type} />
            <CategoryIcon category={move.category} />
          </span>
        ),
        meta: <span className="bl-move-power">{move.power ?? '—'}</span>,
        tooltip: moveTooltip(move),
      })),
    ]
  }, [speciesShowdownId])

  const base = getBaseStats(speciesShowdownId)
  const natureMods = getNatureMods(draftPokemon?.natureRef?.showdownId ?? draftPokemon?.nature.toLowerCase() ?? '')
  const computed = draftPokemon ? computeStats(base, draftPokemon.evs, draftPokemon.ivs, natureMods) : null
  const spSpread = draftPokemon ? evSpreadToSp(draftPokemon.evs) : null
  const evTotal = draftPokemon ? statKeys.reduce((total, key) => total + draftPokemon.evs[key], 0) : 0
  const spTotal = spSpread ? statKeys.reduce((total, key) => total + spSpread[key], 0) : 0
  const isChampion = mode === 'champion-points'
  const budgetTotal = isChampion ? CHAMPION_SP_TOTAL : STANDARD_EV_TOTAL
  const budgetValue = isChampion ? spTotal : evTotal
  const budgetOver = Math.max(0, budgetValue - budgetTotal)

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
            <h2 id="pokemon-editor-title">{draftPokemon ? draftPokemon.species : 'Empty slot'}</h2>
            <p>{selectedSlot ? `Slot ${selectedSlot}` : 'Choose a Pokemon to begin.'}</p>
          </div>
          <button className="bl-editor-icon-button" type="button" aria-label="Close" onClick={onClose}>
            x
          </button>
        </header>

        <div className="bl-editor-body pb">
          {draftPokemon && computed ? (
            <>
              <section className="bl-editor-hero" aria-label="Selected Pokemon summary">
                <span
                  className={`bl-editor-avatar ${visualKey ? 'has-visual-key' : 'is-fallback'}`}
                  aria-hidden="true"
                >
                  <span>{getInitials(draftPokemon.species)}</span>
                </span>
                <div>
                  <Tooltip
                    content={
                      <TooltipCard
                        title={draftPokemon.species}
                        subtitle={selectedPokemonOption ? 'Pokemon' : undefined}
                        description={selectedPokemonOption?.description}
                      />
                    }
                  >
                    <strong>{draftPokemon.species}</strong>
                  </Tooltip>
                  <span className="bl-editor-hero-types">
                    {selectedPokemonOption
                      ? ([selectedPokemonOption.primaryType, selectedPokemonOption.secondaryType].filter(
                          Boolean,
                        ) as PokemonType[]).map((type) => <TypeBadge type={type} key={type} />)
                      : null}
                  </span>
                </div>
              </section>

              <section className="bl-editor-section">
                <label className="bl-editor-field">
                  <span>Pokemon</span>
                  <Combobox
                    ariaLabel="Pokemon"
                    value={selectedPokemonOptionKey}
                    options={pokemonOptions}
                    onChange={handleSelectPokemon}
                  />
                </label>

                <div className="bl-editor-grid-2">
                  <label className="bl-editor-field">
                    <span>Item</span>
                    <Combobox
                      ariaLabel="Held item"
                      value={draftPokemon.item}
                      options={itemOptions}
                      onChange={(displayName) => {
                        const ref = toBuildRef(findOptionByLabel(fakeItemCatalogOptions, displayName))
                        updateDraft({ item: displayName, ...(ref ? { itemRef: ref } : {}) })
                      }}
                    />
                  </label>
                  <label className="bl-editor-field">
                    <span>Ability</span>
                    <Combobox
                      ariaLabel="Ability"
                      value={draftPokemon.ability}
                      options={abilityOptions}
                      onChange={(displayName) => {
                        const ref = toBuildRef(findOptionByLabel(fakeAbilityCatalogOptions, displayName))
                        updateDraft({ ability: displayName, ...(ref ? { abilityRef: ref } : {}) })
                      }}
                    />
                  </label>
                  <label className="bl-editor-field">
                    <span>Nature</span>
                    <Combobox
                      ariaLabel="Nature"
                      value={draftPokemon.nature}
                      options={natureOptions}
                      onChange={(displayName) => {
                        const ref = toBuildRef(findOptionByLabel(fakeNatureCatalogOptions, displayName))
                        updateDraft({ nature: displayName, ...(ref ? { natureRef: ref } : {}) })
                      }}
                    />
                  </label>
                  <label className="bl-editor-field">
                    <span>Tera type</span>
                    <Combobox
                      ariaLabel="Tera type"
                      value={draftPokemon.teraType}
                      options={teraOptions}
                      onChange={(displayName) => {
                        const ref = toBuildRef(findOptionByLabel(fakeTypeCatalogOptions, displayName))
                        updateDraft({ teraType: displayName as PokemonType, ...(ref ? { teraTypeRef: ref } : {}) })
                      }}
                    />
                  </label>
                </div>
              </section>

              <section className="bl-editor-section">
                <div className="bl-editor-section-heading">
                  <h3>Moves</h3>
                  <span>Learnset only</span>
                </div>
                <div className="bl-move-editor-list">
                  {draftPokemon.moves.map((moveName, index) => {
                    const currentId = moveName ? moveIdByName[moveName] ?? '' : ''
                    return (
                      <label className="bl-editor-field" key={`${draftPokemon.id}-move-${index}`}>
                        <span>Move {index + 1}</span>
                        <Combobox
                          ariaLabel={`Move ${index + 1}`}
                          value={currentId || '__none__'}
                          options={moveOptions}
                          placeholder="Add a move"
                          emptyText="No learnable moves match"
                          onChange={(moveId) => handleMoveChange(index, moveId)}
                        />
                      </label>
                    )
                  })}
                </div>
              </section>

              <section className="bl-editor-section">
                <div className="bl-editor-section-heading">
                  <h3>Stats</h3>
                  <span>Lv 50 · {isChampion ? 'Champion' : 'Standard'}</span>
                </div>
                <div className="bl-stat-readout" aria-label="Computed stats">
                  {statKeys.map((stat) => {
                    const value = computed[stat]
                    const tier = getStatTier(stat, value)
                    return (
                      <div className="bl-statline" key={stat}>
                        <span className="bl-statline-label">{STAT_LABELS[stat]}</span>
                        <span className="bl-statline-bar">
                          <span
                            className={`bl-statline-fill is-${tier}`}
                            style={{ width: `${Math.min(100, (value / 220) * 100)}%` }}
                          />
                          <span
                            className={`bl-statline-flourish is-${tier}`}
                            key={`${stat}-${tier}`}
                            aria-hidden="true"
                          />
                        </span>
                        <span className={`bl-statline-value is-${tier}`}>
                          {value}
                          <em>· {STAT_TIER_LABELS[tier]}</em>
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>

              <section className="bl-editor-section">
                <div className="bl-editor-section-heading">
                  <h3>Training</h3>
                  <div className="bl-editor-toggle" role="group" aria-label="Training mode">
                    <button
                      className={mode === 'standard-evs' ? 'active' : ''}
                      type="button"
                      onClick={() => handleModeChange('standard-evs')}
                    >
                      Standard Points
                    </button>
                    <button
                      className={mode === 'champion-points' ? 'active' : ''}
                      type="button"
                      onClick={() => handleModeChange('champion-points')}
                    >
                      Champion Points
                    </button>
                  </div>
                </div>

                <p className={`bl-training-total ${budgetOver > 0 ? 'is-warning' : ''}`} aria-live="polite">
                  {isChampion ? (
                    <>
                      <strong>{spTotal}</strong> / {CHAMPION_SP_TOTAL} SP · IVs fixed at 31
                    </>
                  ) : (
                    <>
                      <strong>{evTotal}</strong> / {STANDARD_EV_TOTAL} EVs · IVs editable
                    </>
                  )}
                  {budgetOver > 0 ? <span className="bl-training-over">{budgetOver} over</span> : null}
                </p>
                {trimNotice && !isChampion ? (
                  <p className="bl-training-note">Trimmed to fit 510 EVs.</p>
                ) : null}

                <div className="bl-stat-slider-list">
                  {statKeys.map((stat) => {
                    const sp = spSpread ? spSpread[stat] : 0
                    return (
                      <div className={`bl-stat-slider ${isChampion ? 'is-champion' : ''}`} key={stat}>
                        <span className="bl-stat-slider-head">
                          <strong>{STAT_LABELS[stat]}</strong>
                          <em>{isChampion ? `${sp} SP` : `${draftPokemon.evs[stat]} EV`}</em>
                        </span>
                        {isChampion ? (
                          <div className="bl-slider-track">
                            <input
                              type="range"
                              min="0"
                              max={CHAMPION_SP_MAX}
                              step="1"
                              list="bl-champion-sp-ticks"
                              value={sp}
                              onChange={(event) => updateSp(stat, Number(event.target.value))}
                              aria-label={`${STAT_LABELS[stat]} stat points`}
                            />
                            <div className="bl-slider-ticks" aria-hidden="true">
                              {championSpTickMarks.map((tick) => (
                                <span key={tick}>{tick}</span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="bl-stat-standard-row">
                            <div className="bl-slider-track">
                              <input
                                type="range"
                                min="0"
                                max={STANDARD_EV_MAX}
                                step="4"
                                list="bl-standard-ev-ticks"
                                value={draftPokemon.evs[stat]}
                                onChange={(event) => updateEv(stat, Number(event.target.value))}
                                aria-label={`${STAT_LABELS[stat]} EVs`}
                              />
                              <div className="bl-slider-ticks" aria-hidden="true">
                                {standardEvTickMarks.map((tick) => (
                                  <span key={tick}>{tick}</span>
                                ))}
                              </div>
                            </div>
                            <label className="bl-iv-box">
                              <span>IV</span>
                              <input
                                type="number"
                                min="0"
                                max={STANDARD_IV_MAX}
                                value={draftPokemon.ivs[stat]}
                                onChange={(event) => updateIv(stat, Number(event.target.value))}
                                aria-label={`${STAT_LABELS[stat]} IV`}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <datalist id="bl-standard-ev-ticks">
                  {standardEvTickMarks.map((tick) => (
                    <option key={tick} value={tick} />
                  ))}
                </datalist>
                <datalist id="bl-champion-sp-ticks">
                  {championSpTickMarks.map((tick) => (
                    <option key={tick} value={tick} />
                  ))}
                </datalist>
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
