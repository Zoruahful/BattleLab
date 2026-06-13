import { useMemo, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
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
  getBaseStats,
  getLearnsetMoves,
  getNatureMods,
  normalizeStandardEvSpread,
  spSpreadToEv,
  spToEv,
  type MoveCategory,
} from '../data/pokemonEditorData'
import { Combobox, type ComboOption } from '../components/Combobox'
import { GymStatEditor, type EditorMode } from '../components/GymStatEditor'
import { NotesEditor } from '../components/NotesEditor'
import { Tooltip, TooltipCard } from '../components/Tooltip'
import type { CatalogPickerOption } from '../types/catalog'
import type { BuildCatalogReference, PokemonBuild, PokemonType, StatSpread } from '../types'
import '../styles/pokemon-editor-panel.css'

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
  statEditorMode?: EditorMode
  onClose?: () => void
  onSave?: (draft: PokemonEditorDraft) => void
}

const statKeys: Array<keyof StatSpread> = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']
const MAXED_IVS: StatSpread = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
const ZERO_EVS: StatSpread = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }

const getInitials = (species: string) =>
  species
    .split(/[\s-]+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

const toSlotNumber = (slot: number): PokemonBuild['slot'] =>
  Math.min(Math.max(slot, 1), 6) as PokemonBuild['slot']

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
const isToolbarActivationKey = (event: ReactKeyboardEvent<HTMLElement>) =>
  !event.repeat && (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar' || event.code === 'Space')

const EMPTY_OPTION: ComboOption = {
  value: '',
  label: 'None',
  searchText: 'none empty not set clear',
}

const spreadTotal = (spread: StatSpread) => statKeys.reduce((total, key) => total + spread[key], 0)

const statAllocationMax = (totalBudget: number, statCap: number, spread: StatSpread, stat: keyof StatSpread) => {
  const otherSpent = statKeys.reduce((total, key) => (key === stat ? total : total + spread[key]), 0)
  return clamp(totalBudget - otherSpent, 0, statCap)
}

function TypePill({ type }: { type: PokemonType }) {
  return (
    <span className={`bl-type-pill bl-type-${type.toLowerCase()}`} title={type}>
      {type}
    </span>
  )
}

function TypeGem({ type }: { type: PokemonType }) {
  return (
    <span
      className={`bl-type-gem bl-type-${type.toLowerCase()}`}
      title={type}
      aria-label={`${type} type`}
    >
      {type[0]}
    </span>
  )
}

function CategoryIcon({ category }: { category: MoveCategory }) {
  const label = CATEGORY_META[category].label
  return (
    <span className={`bl-cat-icon is-${category}`} title={label} aria-label={label}>
      <svg viewBox="0 0 18 18" focusable="false" aria-hidden="true">
        {category === 'physical' ? (
          <>
            <polygon className="bl-cat-shape-fill" points="9 1.6 11.2 6.4 16.4 5.8 12.8 9.5 15 14.4 9.8 12.4 6.2 16.4 6.4 11 1.6 8.8 6.8 7.4" />
            <polyline className="bl-cat-shape-line" points="5.2 4.4 8.2 7.8 4.4 9.4" />
          </>
        ) : null}
        {category === 'special' ? (
          <>
            <circle className="bl-cat-shape-line" cx="9" cy="9" r="6.3" />
            <circle className="bl-cat-shape-line" cx="9" cy="9" r="3.2" />
            <path className="bl-cat-shape-fill" d="M13.7 2.6l.7 1.4 1.4.7-1.4.7-.7 1.4-.7-1.4-1.4-.7 1.4-.7z" />
          </>
        ) : null}
        {category === 'status' ? (
          <>
            <path className="bl-cat-shape-line" d="M9 2.2l5 1.8v4.1c0 3.2-2 5.7-5 7.6-3-1.9-5-4.4-5-7.6V4z" />
            <path className="bl-cat-shape-fill" d="M8 5.8h2v2.3h2.3v2H10v2.3H8v-2.3H5.7v-2H8z" />
          </>
        ) : null}
      </svg>
    </span>
  )
}

function ItemIconSlot({ option }: { option: CatalogPickerOption }) {
  const fallback = option.asset?.fallbackText ?? getInitials(option.displayName)
  const assetKey = option.asset?.iconKey ?? option.catalogKey
  return (
    <span className="bl-item-icon-slot" title={`${option.displayName} item icon placeholder`} data-icon-key={assetKey}>
      {fallback}
    </span>
  )
}

function NatureModChip({ showdownId }: { showdownId?: string }) {
  const mods = getNatureMods(showdownId ?? '')
  if (!mods.inc || !mods.dec) {
    return <span className="bl-nature-chip is-neutral">No stat change</span>
  }

  return (
    <span className="bl-nature-chip" title={`${STAT_LABELS[mods.inc]} up, ${STAT_LABELS[mods.dec]} down`}>
      <span className="bl-nature-up">▲ {STAT_LABELS[mods.inc]}</span>
      <span className="bl-nature-down">▼ {STAT_LABELS[mods.dec]}</span>
    </span>
  )
}


function moveTooltip(move: (typeof editorMoves)[number]): ReactNode {
  return (
    <TooltipCard
      icon={<TypeGem type={move.type} />}
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

function natureTooltip(option: CatalogPickerOption): ReactNode {
  return (
    <TooltipCard
      title={option.displayName}
      subtitle="Nature"
      rows={[{ label: 'Stat change', value: <NatureModChip showdownId={option.showdownId} /> }]}
      description={option.description}
    />
  )
}

const createPokemonBuildFromOption = (
  option: CatalogPickerOption,
  slot: PokemonBuild['slot'],
  current?: PokemonBuild | null,
): PokemonBuild => {
  const speciesChanged = current ? current.species !== option.displayName : true
  const teraTypeOption = fakeTypeCatalogOptions.find(
    (candidate) => candidate.displayName === (option.primaryType ?? current?.teraType ?? 'Normal'),
  )
  const moves = speciesChanged ? (['', '', '', ''] as PokemonBuild['moves']) : current?.moves ?? (['', '', '', ''] as PokemonBuild['moves'])

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
    item: speciesChanged ? '' : current?.item ?? '',
    itemRef: speciesChanged ? undefined : current?.itemRef,
    ability: speciesChanged ? '' : current?.ability ?? '',
    abilityRef: speciesChanged ? undefined : current?.abilityRef,
    nature: speciesChanged ? '' : current?.nature ?? '',
    natureRef: speciesChanged ? undefined : current?.natureRef,
    moves,
    moveRefs: speciesChanged
      ? ([null, null, null, null] as PokemonBuild['moveRefs'])
      : current?.moveRefs ?? (moves.map(findMoveRef) as PokemonBuild['moveRefs']),
    evs: speciesChanged ? { ...ZERO_EVS } : current?.evs ?? { ...ZERO_EVS },
    ivs: current?.ivs ?? { ...MAXED_IVS },
    notes: speciesChanged ? '' : current?.notes ?? '',
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
  statEditorMode = 'standard-evs',
  onClose,
  onSave,
}: PokemonEditorPanelProps) {
  const selectedSlot = toSlotNumber(
    slotNumber ?? (slotIndex !== null && slotIndex !== undefined ? slotIndex + 1 : undefined) ?? pokemon?.slot ?? 1,
  )
  const initialPokemon =
    statEditorMode === 'champion-points' && pokemon
      ? { ...pokemon, evs: spSpreadToEv(evSpreadToSp(pokemon.evs)), ivs: { ...MAXED_IVS } }
      : pokemon ?? null
  const [draftPokemon, setDraftPokemon] = useState<PokemonBuild | null>(initialPokemon)
  const [mode, setMode] = useState<EditorMode>(statEditorMode)
  const [standardIvs, setStandardIvs] = useState<StatSpread>(pokemon?.ivs ?? { ...MAXED_IVS })
  const [trimNotice, setTrimNotice] = useState(false)
  const [savePulseKey, setSavePulseKey] = useState(0)

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
      const maxForStat = statAllocationMax(STANDARD_EV_TOTAL, STANDARD_EV_MAX, current.evs, stat)

      return { ...current, evs: { ...current.evs, [stat]: clamp(value, 0, maxForStat) } }
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
      const maxForStat = statAllocationMax(CHAMPION_SP_TOTAL, CHAMPION_SP_MAX, currentSpSpread, stat)
      const nextSp = clamp(sp, 0, maxForStat)

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

  const triggerSavePulse = () => {
    if (draftPokemon) {
      setSavePulseKey((current) => current + 1)
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
                <TypeGem type={type} key={type} />
              ))}
            </span>
          ),
          tooltip: optionTooltip(option, types.join(' / ') || 'Pokemon'),
        }
      }),
    [],
  )

  const buildSimpleOptions = (options: CatalogPickerOption[], kindLabel: string): ComboOption[] =>
    [
      EMPTY_OPTION,
      ...options.map((option) => ({
        value: option.displayName,
        label: option.displayName,
        searchText: `${option.displayName} ${option.aliases.join(' ')} ${option.description ?? ''}`,
        tooltip: optionTooltip(option, kindLabel),
      })),
    ]

  const itemOptions = useMemo(
    () => [
      EMPTY_OPTION,
      ...fakeItemCatalogOptions.map((option) => ({
        value: option.displayName,
        label: option.displayName,
        searchText: `${option.displayName} ${option.aliases.join(' ')} ${option.description ?? ''}`,
        leading: <ItemIconSlot option={option} />,
        tooltip: optionTooltip(option, 'Held item'),
      })),
    ],
    [],
  )
  const abilityOptions = useMemo(() => buildSimpleOptions(fakeAbilityCatalogOptions, 'Ability'), [])
  const natureOptions = useMemo(
    () => [
      EMPTY_OPTION,
      ...fakeNatureCatalogOptions.map((option) => ({
        value: option.displayName,
        label: option.displayName,
        searchText: `${option.displayName} ${option.aliases.join(' ')} ${option.description ?? ''}`,
        meta: <NatureModChip showdownId={option.showdownId} />,
        selectedMeta: <NatureModChip showdownId={option.showdownId} />,
        tooltip: natureTooltip(option),
      })),
    ],
    [],
  )
  const teraOptions: ComboOption[] = useMemo(
    () =>
      fakeTypeCatalogOptions.map((option) => ({
        value: option.displayName,
        label: option.displayName,
        searchText: option.displayName,
        leading: option.primaryType ? <TypeGem type={option.primaryType} /> : undefined,
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
            <TypeGem type={move.type} />
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
  const evTotal = draftPokemon ? spreadTotal(draftPokemon.evs) : 0
  const spTotal = spSpread ? spreadTotal(spSpread) : 0
  const isChampion = mode === 'champion-points'
  const budgetTotal = isChampion ? CHAMPION_SP_TOTAL : STANDARD_EV_TOTAL
  const budgetValue = isChampion ? spTotal : evTotal
  const budgetOver = Math.max(0, budgetValue - budgetTotal)
  const allocationMinimum = draftPokemon
    ? Math.min(...statKeys.map((stat) => (isChampion ? (spSpread?.[stat] ?? 0) : draftPokemon.evs[stat])))
    : 0
  const budgetBelow = Math.max(0, -allocationMinimum)

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
              <section className="bl-editor-hero" aria-label="Selected Pokemon summary" key={`hero-${draftPokemon.id}-${draftPokemon.species}`}>
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
                        ) as PokemonType[]).map((type) => <TypePill type={type} key={type} />)
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
                        updateDraft({ item: displayName, itemRef: ref })
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
                        updateDraft({ ability: displayName, abilityRef: ref })
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
                        updateDraft({ nature: displayName, natureRef: ref })
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

              <GymStatEditor
                base={base}
                computed={computed}
                draftPokemon={draftPokemon}
                isChampion={isChampion}
                mode={mode}
                spSpread={spSpread ?? ZERO_EVS}
                spTotal={spTotal}
                evTotal={evTotal}
                budgetOver={budgetOver}
                budgetBelow={budgetBelow}
                trimNotice={trimNotice}
                onModeChange={handleModeChange}
                onEvChange={updateEv}
                onIvChange={updateIv}
                onSpChange={updateSp}
              />

              <section className="bl-editor-section">
                <div className="bl-editor-field">
                  <span>Notes</span>
                  <NotesEditor value={draftPokemon.notes ?? ''} onChange={(notes) => updateDraft({ notes })} />
                </div>
              </section>
            </>
          ) : (
            <section className="bl-editor-empty">
              <h3>No Pokemon selected</h3>
              <p>Pick a Pokemon to start building this slot.</p>
              <label className="bl-editor-field bl-editor-empty-picker">
                <span>Pokemon</span>
                <Combobox
                  ariaLabel="Pokemon"
                  value=""
                  options={pokemonOptions}
                  placeholder="Choose a Pokemon"
                  onChange={handleSelectPokemon}
                />
              </label>
            </section>
          )}
        </div>

        <footer className="bl-editor-footer pf">
          <button className="secondary-action" type="button" onClick={onClose}>
            Close
          </button>
          <button
            className="primary-action bl-editor-save-action"
            type="submit"
            disabled={!draftPokemon}
            onPointerDown={triggerSavePulse}
            onKeyDown={(event) => {
              if (isToolbarActivationKey(event)) {
                triggerSavePulse()
              }
            }}
          >
            <span className={savePulseKey > 0 ? 'is-saving-pulse' : ''} key={savePulseKey}>Save</span>
          </button>
        </footer>
      </form>
    </aside>
  )
}

export default PokemonEditorPanel
