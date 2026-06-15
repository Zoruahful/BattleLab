import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import {
  createCachedCatalogPickerProjection,
  createPlannedExpansionLocalPickerProjection,
  getAbilityPickerOptions,
  getCatalogPickerSearchText,
  getItemPickerOptions,
  getMovePickerOptions,
  getNaturePickerOptions,
  getPokemonPickerOptions,
  getTypePickerOptions,
  resolveCatalogAssetReference,
  type CatalogCachedPickerProjectionOptionSets,
  type CatalogPlannedExpansionPickerProjectionOptionSets,
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

type PickerProjectionLoadState =
  | { status: 'loading'; optionSets: null; pokemonMoveIdsByShowdownId: null; error: null }
  | {
      status: 'ready'
      optionSets: CatalogPlannedExpansionPickerProjectionOptionSets | CatalogCachedPickerProjectionOptionSets
      pokemonMoveIdsByShowdownId: Record<string, string[]> | null
      error: null
    }
  | { status: 'error'; optionSets: null; pokemonMoveIdsByShowdownId: null; error: string }

const statKeys: Array<keyof StatSpread> = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']
const MAXED_IVS: StatSpread = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
const ZERO_EVS: StatSpread = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
const PICKER_PROJECTION_ERROR =
  'Planned catalog preview is unavailable. Keeping bundled picker options for this session.'

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

const findOptionByBuildValue = (
  options: CatalogPickerOption[],
  value: string,
  ref?: BuildCatalogReference | null,
) =>
  options.find(
    (option) =>
      option.catalogKey === ref?.catalogKey ||
      option.showdownId === ref?.showdownId ||
      option.catalogKey === value ||
      option.displayName === value ||
      option.showdownId === value.toLowerCase().replace(/[^a-z0-9]+/g, ''),
  )

const findOptionKeyByBuildValue = (
  options: CatalogPickerOption[],
  value: string,
  ref?: BuildCatalogReference | null,
) => findOptionByBuildValue(options, value, ref)?.catalogKey ?? ''

const isUnavailableOption = (option: CatalogPickerOption) =>
  option.availability === 'disabled' || option.availability === 'hidden'

const getCatalogOptionGroup = (option: CatalogPickerOption, fallback: string) => {
  if (option.kind === 'pokemon' && option.primaryType) return option.primaryType
  if (option.kind === 'move' && option.primaryType) return option.primaryType
  if (option.kind === 'type') return 'Type'
  if (option.kind === 'nature') return 'Nature'
  if (option.kind === 'ability') return 'Ability'
  if (option.kind === 'item') return 'Item'
  return fallback
}

const withSavedCatalogValue = (
  options: ComboOption[],
  selectedKey: string,
  savedValue: string | undefined,
  group = 'Selected',
) => {
  if (!savedValue || selectedKey || options.some((option) => option.label === savedValue)) {
    return options
  }

  return [
    {
      value: savedValue,
      label: savedValue,
      searchText: savedValue,
      group,
      disabled: true,
      disabledReason: 'Saved value is not available in the current local catalog.',
      meta: <span className="bl-combo-warning">Unavailable</span>,
      selectedMeta: <span className="bl-combo-warning">Unavailable</span>,
    },
    ...options,
  ]
}

const moveIdByName: Record<string, string> = Object.fromEntries(
  editorMoves.map((move) => [move.name, move.showdownId]),
)
const toShowdownId = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '')

const findMoveRef = (name: string, moveOptions: CatalogPickerOption[] = []): BuildCatalogReference | null => {
  const id = moveIdByName[name]
  const move = id ? editorMovesById[id] : undefined
  if (!move) return null

  const catalogOption = moveOptions.find(
    (option) => option.showdownId === move.showdownId || option.displayName === move.name,
  )

  return {
    catalogKey: catalogOption?.catalogKey ?? `move-${move.showdownId}`,
    showdownId: catalogOption?.showdownId ?? move.showdownId,
    displayName: catalogOption?.displayName ?? move.name,
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
const isToolbarActivationKey = (event: ReactKeyboardEvent<HTMLElement>) =>
  !event.repeat && (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar' || event.code === 'Space')

const EMPTY_OPTION: ComboOption = {
  value: '',
  label: 'None',
  searchText: 'none empty not set clear',
  group: 'Selected',
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
  const resolvedAsset = resolveCatalogAssetReference(option.asset)
  const fallback = resolvedAsset.fallbackText ?? option.asset?.fallbackText ?? getInitials(option.displayName)
  const assetKey = resolvedAsset.icon?.assetKey ?? option.asset?.iconKey ?? option.catalogKey
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


function moveTooltip(move: (typeof editorMoves)[number], catalogOption?: CatalogPickerOption): ReactNode {
  return (
    <TooltipCard
      icon={<TypeGem type={move.type} />}
      title={catalogOption?.displayName ?? move.name}
      subtitle={`${move.type} · ${CATEGORY_META[move.category].label}`}
      rows={[
        { label: 'Power', value: move.power ?? '—' },
        { label: 'Accuracy', value: move.accuracy ? `${move.accuracy}%` : '—' },
        { label: 'PP', value: move.pp },
      ]}
      description={catalogOption?.description ?? move.description}
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
  typeOptions: CatalogPickerOption[],
  moveOptions: CatalogPickerOption[],
  current?: PokemonBuild | null,
): PokemonBuild => {
  const speciesChanged = current ? current.species !== option.displayName : true
  const teraTypeOption = typeOptions.find(
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
      : current?.moveRefs ?? (moves.map((move) => findMoveRef(move, moveOptions)) as PokemonBuild['moveRefs']),
    evs: speciesChanged ? { ...ZERO_EVS } : current?.evs ?? { ...ZERO_EVS },
    ivs: current?.ivs ?? { ...MAXED_IVS },
    notes: speciesChanged ? '' : current?.notes ?? '',
  }
}

function catalogMoveTooltip(option: CatalogPickerOption): ReactNode {
  return (
    <TooltipCard
      icon={option.primaryType ? <TypeGem type={option.primaryType} /> : undefined}
      title={option.displayName}
      subtitle={[option.primaryType, option.tags.find((tag) => tag === 'physical' || tag === 'special' || tag === 'status')]
        .filter(Boolean)
        .join(' · ')}
      description={option.description}
    />
  )
}

const findPokemonOptionKey = (pokemon: PokemonBuild | null, options: CatalogPickerOption[]) =>
  pokemon
    ? options.find(
        (option) =>
          option.catalogKey === pokemon.speciesRef?.catalogKey ||
          option.showdownId === pokemon.speciesRef?.showdownId ||
          option.displayName === pokemon.species ||
          option.showdownId === toShowdownId(pokemon.species),
      )?.catalogKey ?? ''
    : ''

const getCatalogMoveCategory = (option: CatalogPickerOption): MoveCategory | null => {
  const category = option.tags.find((tag): tag is MoveCategory =>
    tag === 'physical' || tag === 'special' || tag === 'status',
  )

  return category ?? null
}

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
  const [pickerProjectionLoad, setPickerProjectionLoad] = useState<PickerProjectionLoadState>({
    status: 'loading',
    optionSets: null,
    pokemonMoveIdsByShowdownId: null,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    const loadPickerProjection = async () => {
      const cachedProjection = await createCachedCatalogPickerProjection()
      if (cachedProjection) {
        return {
          optionSets: cachedProjection.optionSets,
          pokemonMoveIdsByShowdownId: cachedProjection.pokemonMoveIdsByShowdownId,
        }
      }

      const plannedProjection = await createPlannedExpansionLocalPickerProjection()

      return {
        optionSets: plannedProjection.optionSets,
        pokemonMoveIdsByShowdownId: null,
      }
    }

    loadPickerProjection()
      .then((projection) => {
        if (!cancelled) {
          setPickerProjectionLoad({ status: 'ready', ...projection, error: null })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPickerProjectionLoad({
            status: 'error',
            optionSets: null,
            pokemonMoveIdsByShowdownId: null,
            error: PICKER_PROJECTION_ERROR,
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const bundledPickerOptions = useMemo<CatalogPlannedExpansionPickerProjectionOptionSets>(
    () => ({
      pokemon: getPokemonPickerOptions(),
      moves: getMovePickerOptions(),
      abilities: getAbilityPickerOptions(),
      items: getItemPickerOptions(),
      types: getTypePickerOptions(),
      natures: getNaturePickerOptions(),
    }),
    [],
  )
  const activePickerOptions =
    pickerProjectionLoad.status === 'ready' ? pickerProjectionLoad.optionSets : bundledPickerOptions
  const activePokemonMoveIdsByShowdownId =
    pickerProjectionLoad.status === 'ready' ? pickerProjectionLoad.pokemonMoveIdsByShowdownId : null
  const pickerLoading = pickerProjectionLoad.status === 'loading'
  const pickerErrorText = pickerProjectionLoad.status === 'error' ? pickerProjectionLoad.error : undefined
  const pokemonPickerOptions = activePickerOptions.pokemon
  const movePickerOptions = activePickerOptions.moves
  const itemPickerOptions = activePickerOptions.items
  const abilityPickerOptions = activePickerOptions.abilities
  const naturePickerOptions = activePickerOptions.natures
  const typePickerOptions = activePickerOptions.types

  const panelOpen = open ?? isOpen ?? true
  const visualKey = draftPokemon?.iconKey ?? draftPokemon?.spriteKey
  const selectedPokemonOptionKey = findPokemonOptionKey(draftPokemon, pokemonPickerOptions)
  const selectedPokemonOption = pokemonPickerOptions.find(
    (candidate) => candidate.catalogKey === selectedPokemonOptionKey,
  )
  const selectedItemOptionKey = draftPokemon
    ? findOptionKeyByBuildValue(itemPickerOptions, draftPokemon.item, draftPokemon.itemRef)
    : ''
  const selectedAbilityOptionKey = draftPokemon
    ? findOptionKeyByBuildValue(abilityPickerOptions, draftPokemon.ability, draftPokemon.abilityRef)
    : ''
  const selectedNatureOptionKey = draftPokemon
    ? findOptionKeyByBuildValue(naturePickerOptions, draftPokemon.nature, draftPokemon.natureRef)
    : ''
  const selectedTeraOptionKey = draftPokemon
    ? findOptionKeyByBuildValue(typePickerOptions, draftPokemon.teraType, draftPokemon.teraTypeRef)
    : ''
  const selectedItemValue = selectedItemOptionKey || draftPokemon?.item || ''
  const selectedAbilityValue = selectedAbilityOptionKey || draftPokemon?.ability || ''
  const selectedNatureValue = selectedNatureOptionKey || draftPokemon?.nature || ''
  const selectedTeraValue = selectedTeraOptionKey || draftPokemon?.teraType || ''
  const speciesShowdownId = selectedPokemonOption?.showdownId ?? draftPokemon?.species.toLowerCase() ?? ''

  const updateDraft = (updates: Partial<PokemonBuild>) => {
    setDraftPokemon((current) => (current ? { ...current, ...updates } : current))
  }

  const handleSelectPokemon = (catalogKey: string) => {
    const next = pokemonPickerOptions.find((candidate) => candidate.catalogKey === catalogKey)
    if (next) {
      setDraftPokemon((current) =>
        createPokemonBuildFromOption(next, selectedSlot, typePickerOptions, movePickerOptions, current),
      )
      setTrimNotice(false)
    }
  }

  const handleMoveChange = (moveIndex: number, moveId: string) => {
    setDraftPokemon((current) => {
      if (!current) return current
      const catalogOption = moveId === '__none__' ? null : movePickerOptions.find((option) => option.showdownId === moveId)
      const move = moveId === '__none__' ? null : editorMovesById[moveId]
      const name = catalogOption?.displayName ?? move?.name ?? ''
      const moves = current.moves.map((value, index) => (index === moveIndex ? name : value))
      const baseRefs = current.moveRefs ?? [null, null, null, null]
      const moveRefs = baseRefs.map((ref, index) =>
        index === moveIndex ? (catalogOption ? toBuildRef(catalogOption) ?? null : findMoveRef(name, movePickerOptions)) : ref,
      )
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
      pokemonPickerOptions.map((option) => {
        const types = [option.primaryType, option.secondaryType].filter(Boolean) as PokemonType[]
        return {
          value: option.catalogKey,
          label: option.displayName,
          searchText: getCatalogPickerSearchText(option),
          group: getCatalogOptionGroup(option, 'Pokemon'),
          disabled: isUnavailableOption(option),
          disabledReason: isUnavailableOption(option) ? 'Catalog entry is not selectable yet.' : undefined,
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
    [pokemonPickerOptions],
  )

  const buildSimpleOptions = (options: CatalogPickerOption[], kindLabel: string): ComboOption[] =>
    [
      EMPTY_OPTION,
      ...options.map((option) => ({
        value: option.catalogKey,
        label: option.displayName,
        searchText: getCatalogPickerSearchText(option),
        group: getCatalogOptionGroup(option, kindLabel),
        disabled: isUnavailableOption(option),
        disabledReason: isUnavailableOption(option) ? 'Catalog entry is not selectable yet.' : undefined,
        tooltip: optionTooltip(option, kindLabel),
      })),
    ]

  const itemOptions = useMemo(
    () =>
      withSavedCatalogValue(
        [
          EMPTY_OPTION,
          ...itemPickerOptions.map((option) => ({
            value: option.catalogKey,
            label: option.displayName,
            searchText: getCatalogPickerSearchText(option),
            group: getCatalogOptionGroup(option, 'Item'),
            disabled: isUnavailableOption(option),
            disabledReason: isUnavailableOption(option) ? 'Catalog entry is not selectable yet.' : undefined,
            leading: <ItemIconSlot option={option} />,
            tooltip: optionTooltip(option, 'Held item'),
          })),
        ],
        selectedItemOptionKey,
        draftPokemon?.item,
      ),
    [draftPokemon?.item, itemPickerOptions, selectedItemOptionKey],
  )
  const abilityOptions = useMemo(
    () =>
      withSavedCatalogValue(
        buildSimpleOptions(abilityPickerOptions, 'Ability'),
        selectedAbilityOptionKey,
        draftPokemon?.ability,
      ),
    [abilityPickerOptions, draftPokemon?.ability, selectedAbilityOptionKey],
  )
  const natureOptions = useMemo(
    () =>
      withSavedCatalogValue(
        [
          EMPTY_OPTION,
          ...naturePickerOptions.map((option) => ({
            value: option.catalogKey,
            label: option.displayName,
            searchText: getCatalogPickerSearchText(option),
            group: getCatalogOptionGroup(option, 'Nature'),
            disabled: isUnavailableOption(option),
            disabledReason: isUnavailableOption(option) ? 'Catalog entry is not selectable yet.' : undefined,
            meta: <NatureModChip showdownId={option.showdownId} />,
            selectedMeta: <NatureModChip showdownId={option.showdownId} />,
            tooltip: natureTooltip(option),
          })),
        ],
        selectedNatureOptionKey,
        draftPokemon?.nature,
      ),
    [draftPokemon?.nature, naturePickerOptions, selectedNatureOptionKey],
  )
  const teraOptions: ComboOption[] = useMemo(
    () =>
      withSavedCatalogValue(
        typePickerOptions.map((option) => ({
          value: option.catalogKey,
          label: option.displayName,
          searchText: getCatalogPickerSearchText(option),
          group: getCatalogOptionGroup(option, 'Type'),
          disabled: isUnavailableOption(option),
          disabledReason: isUnavailableOption(option) ? 'Catalog entry is not selectable yet.' : undefined,
          leading: option.primaryType ? <TypeGem type={option.primaryType} /> : undefined,
          tooltip: optionTooltip(option, 'Tera type'),
        })),
        selectedTeraOptionKey,
        draftPokemon?.teraType,
      ),
    [draftPokemon?.teraType, selectedTeraOptionKey, typePickerOptions],
  )

  const moveOptions: ComboOption[] = useMemo(() => {
    const catalogMovesById = new Map(
      movePickerOptions
        .filter((option) => option.showdownId)
        .map((option) => [option.showdownId, option]),
    )
    const noneOption: ComboOption = {
      value: '__none__',
      label: '— None —',
      searchText: 'none empty clear',
      group: 'Selected',
    }
    const downloadedLearnsetIds = activePokemonMoveIdsByShowdownId?.[speciesShowdownId]

    if (downloadedLearnsetIds?.length) {
      return [
        noneOption,
        ...downloadedLearnsetIds
          .map((moveId) => catalogMovesById.get(moveId))
          .filter((option): option is CatalogPickerOption => Boolean(option))
          .map((option) => {
            const category = getCatalogMoveCategory(option)

            return {
              value: option.showdownId ?? option.catalogKey,
              label: option.displayName,
              searchText: getCatalogPickerSearchText(option),
              group: option.primaryType ?? 'Move',
              disabled: isUnavailableOption(option),
              disabledReason: isUnavailableOption(option) ? 'Catalog entry is not selectable yet.' : undefined,
              leading: (
                <span className="bl-move-lead">
                  {option.primaryType ? <TypeGem type={option.primaryType} /> : null}
                  {category ? <CategoryIcon category={category} /> : null}
                </span>
              ),
              tooltip: catalogMoveTooltip(option),
            }
          }),
      ]
    }

    const learnset = getLearnsetMoves(speciesShowdownId)

    return [
      noneOption,
      ...learnset.map((move) => {
        const catalogOption = catalogMovesById.get(move.showdownId)

        return {
          value: move.showdownId,
          label: catalogOption?.displayName ?? move.name,
          searchText: catalogOption
            ? getCatalogPickerSearchText(catalogOption)
            : `${move.name} ${move.showdownId} ${move.type} ${CATEGORY_META[move.category].label} ${move.description}`,
          group: move.type,
          disabled: catalogOption ? isUnavailableOption(catalogOption) : false,
          disabledReason: catalogOption && isUnavailableOption(catalogOption)
            ? 'Catalog entry is not selectable yet.'
            : undefined,
          leading: (
            <span className="bl-move-lead">
              <TypeGem type={move.type} />
              <CategoryIcon category={move.category} />
            </span>
          ),
          meta: <span className="bl-move-power">{move.power ?? '—'}</span>,
          tooltip: moveTooltip(move, catalogOption),
        }
      }),
    ]
  }, [activePokemonMoveIdsByShowdownId, movePickerOptions, speciesShowdownId])

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
                    loading={pickerLoading}
                    errorText={pickerErrorText}
                    maxVisibleOptions={40}
                    onChange={handleSelectPokemon}
                  />
                </label>

                <div className="bl-editor-grid-2">
                  <label className="bl-editor-field">
                    <span>Item</span>
                    <Combobox
                      ariaLabel="Held item"
                      value={selectedItemValue}
                      options={itemOptions}
                      loading={pickerLoading}
                      errorText={pickerErrorText}
                      maxVisibleOptions={50}
                      onChange={(catalogKey) => {
                        const option = itemPickerOptions.find((candidate) => candidate.catalogKey === catalogKey)
                        updateDraft({
                          item: option?.displayName ?? '',
                          itemRef: toBuildRef(option),
                        })
                      }}
                    />
                  </label>
                  <label className="bl-editor-field">
                    <span>Ability</span>
                    <Combobox
                      ariaLabel="Ability"
                      value={selectedAbilityValue}
                      options={abilityOptions}
                      loading={pickerLoading}
                      errorText={pickerErrorText}
                      maxVisibleOptions={50}
                      onChange={(catalogKey) => {
                        const option = abilityPickerOptions.find((candidate) => candidate.catalogKey === catalogKey)
                        updateDraft({
                          ability: option?.displayName ?? '',
                          abilityRef: toBuildRef(option),
                        })
                      }}
                    />
                  </label>
                  <label className="bl-editor-field">
                    <span>Nature</span>
                    <Combobox
                      ariaLabel="Nature"
                      value={selectedNatureValue}
                      options={natureOptions}
                      loading={pickerLoading}
                      errorText={pickerErrorText}
                      maxVisibleOptions={30}
                      onChange={(catalogKey) => {
                        const option = naturePickerOptions.find((candidate) => candidate.catalogKey === catalogKey)
                        updateDraft({
                          nature: option?.displayName ?? '',
                          natureRef: toBuildRef(option),
                        })
                      }}
                    />
                  </label>
                  <label className="bl-editor-field">
                    <span>Tera type</span>
                    <Combobox
                      ariaLabel="Tera type"
                      value={selectedTeraValue}
                      options={teraOptions}
                      loading={pickerLoading}
                      errorText={pickerErrorText}
                      maxVisibleOptions={12}
                      onChange={(catalogKey) => {
                        const option = typePickerOptions.find((candidate) => candidate.catalogKey === catalogKey)
                        if (!option) return
                        updateDraft({
                          teraType: option.displayName as PokemonType,
                          teraTypeRef: toBuildRef(option),
                        })
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
                    const currentRef = draftPokemon.moveRefs?.[index]
                    const currentId = moveName
                      ? currentRef?.showdownId ?? moveIdByName[moveName] ?? toShowdownId(moveName)
                      : ''
                    return (
                      <label className="bl-editor-field" key={`${draftPokemon.id}-move-${index}`}>
                        <span>Move {index + 1}</span>
                        <Combobox
                          ariaLabel={`Move ${index + 1}`}
                          value={currentId || '__none__'}
                          options={moveOptions}
                          placeholder="Add a move"
                          emptyText="No learnable moves match"
                          loading={pickerLoading}
                          errorText={pickerErrorText}
                          maxVisibleOptions={40}
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
                  loading={pickerLoading}
                  errorText={pickerErrorText}
                  maxVisibleOptions={40}
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
