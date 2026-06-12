import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
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
  getStatBarColor,
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
import { StatRadar } from '../components/StatRadar'
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

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const spreadTotal = (spread: StatSpread) => statKeys.reduce((total, key) => total + spread[key], 0)

const statAllocationMax = (totalBudget: number, statCap: number, spread: StatSpread, stat: keyof StatSpread) => {
  const otherSpent = statKeys.reduce((total, key) => (key === stat ? total : total + spread[key]), 0)
  return clamp(totalBudget - otherSpent, 0, statCap)
}

function AnimatedStatTotal({
  stat,
  value,
  tier,
  tierLabel,
  color,
}: {
  stat: keyof StatSpread
  value: number
  tier: ReturnType<typeof getStatTier>
  tierLabel: string
  color: string
}) {
  const reducedMotion = prefersReducedMotion()
  const [displayValue, setDisplayValue] = useState(value)
  const valueRef = useRef(value)

  useEffect(() => {
    if (reducedMotion) {
      valueRef.current = value
      return
    }

    let raf = 0
    const start = performance.now()
    const duration = tier === 'high' || tier === 'extreme' ? 520 : 380
    const from = valueRef.current

    const tick = (now: number) => {
      const progress = clamp((now - start) / duration, 0, 1)
      const eased = 1 - (1 - progress) ** 3
      const next = Math.round(from + (value - from) * eased)
      valueRef.current = next
      setDisplayValue(next)

      if (progress < 1) {
        raf = requestAnimationFrame(tick)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reducedMotion, tier, value])

  const shownValue = reducedMotion ? value : displayValue

  return (
    <span
      className={`bl-stat-table-total bl-statline-value is-${tier}`}
      role="cell"
      style={{ '--stat-total-color': color } as CSSProperties}
      title={`${STAT_LABELS[stat]} ${value} · ${tierLabel}`}
      aria-label={`${STAT_LABELS[stat]} total ${value}, ${tierLabel}`}
    >
      <span className="bl-stat-total-number" key={`${stat}-${value}-${tier}`}>
        {shownValue}
      </span>
    </span>
  )
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
    evs: speciesChanged ? { ...ZERO_EVS } : current?.evs ?? { ...ZERO_EVS },
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
    options.map((option) => ({
      value: option.displayName,
      label: option.displayName,
      searchText: `${option.displayName} ${option.aliases.join(' ')} ${option.description ?? ''}`,
      tooltip: optionTooltip(option, kindLabel),
    }))

  const itemOptions = useMemo(
    () =>
      fakeItemCatalogOptions.map((option) => ({
        value: option.displayName,
        label: option.displayName,
        searchText: `${option.displayName} ${option.aliases.join(' ')} ${option.description ?? ''}`,
        leading: <ItemIconSlot option={option} />,
        tooltip: optionTooltip(option, 'Held item'),
      })),
    [],
  )
  const abilityOptions = useMemo(() => buildSimpleOptions(fakeAbilityCatalogOptions, 'Ability'), [])
  const natureOptions = useMemo(
    () =>
      fakeNatureCatalogOptions.map((option) => ({
        value: option.displayName,
        label: option.displayName,
        searchText: `${option.displayName} ${option.aliases.join(' ')} ${option.description ?? ''}`,
        meta: <NatureModChip showdownId={option.showdownId} />,
        selectedMeta: <NatureModChip showdownId={option.showdownId} />,
        tooltip: natureTooltip(option),
      })),
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
                <div className="bl-stat-editor-topline">
                  <div>
                    <h3>Gym</h3>
                    <p
                      className={`bl-training-total ${budgetOver > 0 || budgetBelow > 0 ? 'is-warning' : ''}`}
                      aria-live="polite"
                    >
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
                      {budgetBelow > 0 ? <span className="bl-training-over">{budgetBelow} below 0</span> : null}
                    </p>
                    {trimNotice && !isChampion ? (
                      <p className="bl-training-note">Trimmed to fit 510 EVs.</p>
                    ) : null}
                  </div>
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

                <div className="bl-stat-editor-layout">
                  <StatRadar baseStats={base} totalStats={computed} />
                  <div className="bl-stat-table" role="table" aria-label="Stats and training controls">
                    <div className="bl-stat-table-head" role="row">
                      <span role="columnheader">Stat</span>
                      <span role="columnheader">Base</span>
                      <span role="columnheader">Slider</span>
                      <span role="columnheader">IV</span>
                      <span role="columnheader">{isChampion ? 'SP' : 'EV'}</span>
                      <span role="columnheader">Total</span>
                    </div>
                    {statKeys.map((stat) => {
                      const value = computed[stat]
                      const tier = getStatTier(stat, value)
                      const barColor = getStatBarColor(stat, value)
                      const tierLabel = STAT_TIER_LABELS[tier]
                      const sp = spSpread ? spSpread[stat] : 0
                      const points = isChampion ? sp : draftPokemon.evs[stat]
                      const pointMax = isChampion ? CHAMPION_SP_MAX : STANDARD_EV_MAX
                      const pointStep = 1
                      const pointSpread = isChampion ? (spSpread ?? ZERO_EVS) : draftPokemon.evs
                      const allowedPointMax = statAllocationMax(budgetTotal, pointMax, pointSpread, stat)
                      const controlMax = Math.max(points, allowedPointMax)
                      const updatePoints = (next: number) => (isChampion ? updateSp(stat, next) : updateEv(stat, next))
                      const sliderFill = `${Math.min(100, (points / pointMax) * 100)}%`
                      return (
                        <div className="bl-stat-table-row" role="row" key={stat}>
                          <strong className="bl-stat-table-stat" role="cell">
                            {STAT_LABELS[stat]}
                          </strong>
                          <span className="bl-stat-table-base" role="cell">
                            {base[stat]}
                          </span>
                          <span
                            className="bl-stat-table-slider"
                            role="cell"
                            style={{ '--slider-fill': sliderFill } as CSSProperties}
                          >
                            <button
                              type="button"
                              onClick={() => updatePoints(points - pointStep)}
                              disabled={points <= 0}
                              aria-label={`Lower ${STAT_LABELS[stat]} ${isChampion ? 'SP' : 'EV'}`}
                            >
                              -
                            </button>
                            <span className="bl-stat-range-shell">
                              <span className="bl-stat-range-track" aria-hidden="true">
                                <span className="bl-stat-range-fill" />
                                <span className="bl-stat-range-thumb" />
                              </span>
                              <input
                                type="range"
                                min="0"
                                max={pointMax}
                                step={pointStep}
                                list={isChampion ? 'bl-champion-sp-ticks' : 'bl-standard-ev-ticks'}
                                value={points}
                                onChange={(event) => updatePoints(Number(event.target.value))}
                                aria-label={`${STAT_LABELS[stat]} ${isChampion ? 'SP' : 'EV'} slider`}
                              />
                            </span>
                            <button
                              type="button"
                              onClick={() => updatePoints(points + pointStep)}
                              disabled={points >= allowedPointMax}
                              aria-label={`Raise ${STAT_LABELS[stat]} ${isChampion ? 'SP' : 'EV'}`}
                            >
                              +
                            </button>
                          </span>
                          <span className="bl-stat-table-iv" role="cell">
                            {isChampion ? (
                              <input type="number" value={31} disabled aria-label={`${STAT_LABELS[stat]} IV fixed at 31`} />
                            ) : (
                              <input
                                type="number"
                                min="0"
                                max={STANDARD_IV_MAX}
                                value={draftPokemon.ivs[stat]}
                                onChange={(event) => updateIv(stat, Number(event.target.value))}
                                aria-label={`${STAT_LABELS[stat]} IV`}
                              />
                            )}
                          </span>
                          <span className="bl-stat-table-points" role="cell">
                            <input
                              type="number"
                              min="0"
                              max={controlMax}
                              step={pointStep}
                              value={points}
                              onChange={(event) => updatePoints(Number(event.target.value))}
                              aria-label={`${STAT_LABELS[stat]} ${isChampion ? 'SP' : 'EV'} value`}
                            />
                          </span>
                          <AnimatedStatTotal
                            stat={stat}
                            value={value}
                            tier={tier}
                            tierLabel={tierLabel}
                            color={barColor}
                          />
                        </div>
                      )
                    })}
                  </div>
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
