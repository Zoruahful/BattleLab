import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
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
const EMPTY_OPTION: ComboOption = {
  value: '',
  label: 'None',
  searchText: 'none empty not set clear',
}

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

type RgbColor = { r: number; g: number; b: number }
type HsvColor = { h: number; s: number; v: number }
type NotesFormatKey = 'bold' | 'italic' | 'underline'
type NotesFormatState = Record<NotesFormatKey, boolean>
type NotesSelectionEntry = {
  color: string
  fontSize: number
  formats: NotesFormatState
  text: string
}
type NotesSelectionTable = {
  colors: string[]
  entries: NotesSelectionEntry[]
  fontSizes: number[]
  range: Range
  text: string
}

const DEFAULT_NOTE_COLOR = '#000000'
const NOTE_FORMAT_KEYS: NotesFormatKey[] = ['bold', 'italic', 'underline']
const DEFAULT_NOTE_FORMAT_STATE: NotesFormatState = {
  bold: false,
  italic: false,
  underline: false,
}
const NOTE_FORMAT_COMMANDS: Record<NotesFormatKey, string> = {
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
}

const isToolbarActivationKey = (event: ReactKeyboardEvent<HTMLElement>) =>
  !event.repeat && (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar' || event.code === 'Space')

const componentToHex = (value: number) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0')
const rgbToHex = ({ r, g, b }: RgbColor) => `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`

const normalizeHex = (value: string) => {
  const raw = value.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw.split('').map((char) => `${char}${char}`).join('')}`.toLowerCase()
  }
  if (/^[0-9a-f]{6}$/i.test(raw)) {
    return `#${raw}`.toLowerCase()
  }
  return null
}

const hexToRgb = (value: string): RgbColor | null => {
  const hex = normalizeHex(value)
  if (!hex) return null

  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  }
}

const rgbToHsv = ({ r, g, b }: RgbColor): HsvColor => {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  let h = 0

  if (delta !== 0) {
    if (max === red) h = ((green - blue) / delta) % 6
    else if (max === green) h = (blue - red) / delta + 2
    else h = (red - green) / delta + 4
    h *= 60
  }

  return {
    h: h < 0 ? h + 360 : h,
    s: max === 0 ? 0 : (delta / max) * 100,
    v: max * 100,
  }
}

const hsvToRgb = ({ h, s, v }: HsvColor): RgbColor => {
  const sat = clamp(s, 0, 100) / 100
  const val = clamp(v, 0, 100) / 100
  const chroma = val * sat
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1))
  const match = val - chroma
  let channels: [number, number, number]

  if (h < 60) channels = [chroma, x, 0]
  else if (h < 120) channels = [x, chroma, 0]
  else if (h < 180) channels = [0, chroma, x]
  else if (h < 240) channels = [0, x, chroma]
  else if (h < 300) channels = [x, 0, chroma]
  else channels = [chroma, 0, x]

  return {
    r: (channels[0] + match) * 255,
    g: (channels[1] + match) * 255,
    b: (channels[2] + match) * 255,
  }
}

const hsvToHex = (color: HsvColor) => rgbToHex(hsvToRgb(color))

const cssColorToHex = (value: string) => {
  const hex = normalizeHex(value)
  if (hex) return hex

  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (!match) return null

  return rgbToHex({
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
  })
}

function NotesEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const linkPopoverRef = useRef<HTMLDivElement | null>(null)
  const colorPopoverRef = useRef<HTMLDivElement | null>(null)
  const savedSelectionRef = useRef<Range | null>(null)
  const savedSelectionTextRef = useRef('')
  const savedCaretRangeRef = useRef<Range | null>(null)
  const selectedTextTableRef = useRef<NotesSelectionTable | null>(null)
  const pendingFontSizeRef = useRef<number | null>(null)
  const pendingColorRef = useRef<string | null>(null)
  const pendingFormatRef = useRef<NotesFormatState>({ ...DEFAULT_NOTE_FORMAT_STATE })
  const formatTypingOverrideRef = useRef(false)
  const formatStateRef = useRef<NotesFormatState>({ ...DEFAULT_NOTE_FORMAT_STATE })
  const fontSelectionCounterRef = useRef(0)
  const activeFontSelectionRef = useRef<string | null>(null)
  const colorSelectionCounterRef = useRef(0)
  const activeColorSelectionRef = useRef<string | null>(null)
  const colorPreviewOriginalColorRef = useRef<string | null>(null)
  const colorPopoverNudgeTimerRef = useRef<number | null>(null)
  const colorPopoverOpenTimerRef = useRef<number | null>(null)
  const [fontSize, setFontSize] = useState(12)
  const [fontSizeInput, setFontSizeInput] = useState('12')
  const [formatState, setFormatState] = useState<NotesFormatState>(DEFAULT_NOTE_FORMAT_STATE)
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false)
  const [linkText, setLinkText] = useState('')
  const [linkTextLocked, setLinkTextLocked] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false)
  const [colorPopoverOpening, setColorPopoverOpening] = useState(false)
  const [colorPopoverNudging, setColorPopoverNudging] = useState(false)
  const [toolbarColor, setToolbarColor] = useState(DEFAULT_NOTE_COLOR)
  const [textColor, setTextColor] = useState(DEFAULT_NOTE_COLOR)
  const [colorHsv, setColorHsv] = useState<HsvColor>(() => rgbToHsv(hexToRgb(DEFAULT_NOTE_COLOR) ?? { r: 0, g: 0, b: 0 }))
  const [hexInput, setHexInput] = useState(DEFAULT_NOTE_COLOR)
  const [rgbInput, setRgbInput] = useState<RgbColor>(() => hexToRgb(DEFAULT_NOTE_COLOR) ?? { r: 0, g: 0, b: 0 })

  const applyFormatState = (nextState: NotesFormatState) => {
    formatStateRef.current = nextState
    setFormatState(nextState)
  }

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || document.activeElement === editor) return
    if (editor.querySelector('[data-bl-color-active="true"], [data-bl-font-active="true"]')) return
    if (editor.innerHTML !== value) {
      editor.innerHTML = value
    }
  }, [value])

  useEffect(
    () => () => {
      if (colorPopoverNudgeTimerRef.current) {
        window.clearTimeout(colorPopoverNudgeTimerRef.current)
      }
      if (colorPopoverOpenTimerRef.current) {
        window.clearTimeout(colorPopoverOpenTimerRef.current)
      }
    },
    [],
  )

  const runCommand = (command: string, commandValue?: string) => {
    if (!prepareToolbarRange()) return
    document.execCommand(command, false, commandValue)
    onChange(editorRef.current?.innerHTML ?? '')
  }

  const toggleInlineFormat = (format: NotesFormatKey) => {
    const range = prepareToolbarRange()

    const isCollapsed = !range || range.collapsed
    const activeFormatAtCaret = range?.collapsed ? getNodeFormatState(range.startContainer)[format] : false
    const nextActive = !(formatStateRef.current[format] || activeFormatAtCaret)

    if (isCollapsed) {
      const nextFormatState = {
        ...pendingFormatRef.current,
        [format]: nextActive,
      }
      formatTypingOverrideRef.current = true
      setPendingFormatState(nextFormatState)
      if (range) {
        restoreCaretSelection()
      }
      return
    }

    document.execCommand(NOTE_FORMAT_COMMANDS[format], false)
    onChange(editorRef.current?.innerHTML ?? '')

    applyFormatState({
      ...formatState,
      [format]: nextActive,
    })
    window.requestAnimationFrame(() => {
      const activeRange = getCurrentEditorRange()
      if (!activeRange || activeRange.collapsed) return

      const table = storeSelectedTextTable(activeRange)
      if (table) {
        applyFormatState(getUnifiedFormatState(table.entries))
      }
    })
  }

  const getNodeFontSize = (node: Node) => {
    const editor = editorRef.current
    const element =
      node.nodeType === Node.ELEMENT_NODE
        ? (node as Element)
        : node.parentElement
    const fontSizeValue = window.getComputedStyle(element ?? editor ?? document.body).fontSize
    return clamp(Math.round(Number.parseFloat(fontSizeValue)), 8, 24)
  }

  const getNodeColor = (node: Node) => {
    const editor = editorRef.current
    const element =
      node.nodeType === Node.ELEMENT_NODE
        ? (node as Element)
        : node.parentElement
    return window.getComputedStyle(element ?? editor ?? document.body).color
  }

  const getNodeFormatState = (node: Node): NotesFormatState => {
    const editor = editorRef.current
    const element =
      node.nodeType === Node.ELEMENT_NODE
        ? (node as Element)
        : node.parentElement
    const style = window.getComputedStyle(element ?? editor ?? document.body)
    const fontWeight =
      style.fontWeight === 'bold'
        ? 700
        : style.fontWeight === 'normal'
          ? 400
          : Number.parseInt(style.fontWeight, 10)
    const textDecoration = style.textDecorationLine || style.textDecoration

    return {
      bold: Number.isFinite(fontWeight) && fontWeight >= 600,
      italic: style.fontStyle === 'italic' || style.fontStyle === 'oblique',
      underline: textDecoration.includes('underline'),
    }
  }

  const findUnderlineAncestor = (element: Element | null) => {
    const editor = editorRef.current
    let current = element
    let underlineAncestor: HTMLElement | null = null

    while (current && current !== editor) {
      const style = window.getComputedStyle(current)
      const textDecoration = style.textDecorationLine || style.textDecoration
      if (current.tagName === 'U' || textDecoration.includes('underline')) {
        underlineAncestor = current as HTMLElement
      }
      current = current.parentElement
    }

    return underlineAncestor
  }

  const isRangeAtElementEnd = (range: Range, element: HTMLElement) => {
    if (range.startContainer !== element && !element.contains(range.startContainer)) {
      return false
    }

    const tailRange = range.cloneRange()
    tailRange.setEndAfter(element)
    return (tailRange.cloneContents().textContent ?? '').length === 0
  }

  const getUnifiedFormatState = (entries: NotesSelectionEntry[]): NotesFormatState =>
    NOTE_FORMAT_KEYS.reduce(
      (state, key) => ({
        ...state,
        [key]: entries.length > 0 && entries.every((entry) => entry.formats[key]),
      }),
      { ...DEFAULT_NOTE_FORMAT_STATE },
    )

  const hasPendingTextStyle = () => Boolean(pendingFontSizeRef.current || pendingColorRef.current || formatTypingOverrideRef.current)

  const setPendingFormatState = (nextState: NotesFormatState) => {
    pendingFormatRef.current = nextState
    applyFormatState(nextState)
  }

  const getRangeColor = (range: Range) => {
    const element =
      range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? (range.commonAncestorContainer as Element)
        : range.commonAncestorContainer.parentElement
    const selectedColor =
      element?.closest<HTMLElement>('span[data-bl-color="true"]')?.style.color ||
      (element ? window.getComputedStyle(element).color : '')

    return selectedColor ? cssColorToHex(selectedColor) : null
  }

  const clearSelectedTextTable = () => {
    selectedTextTableRef.current = null
    savedSelectionRef.current = null
    savedSelectionTextRef.current = ''
    activeFontSelectionRef.current = null
  }

  const buildSelectedTextTable = (range: Range): NotesSelectionTable | null => {
    const editor = editorRef.current
    if (!editor || !editor.contains(range.commonAncestorContainer) || range.collapsed) return null

    const entries: NotesSelectionEntry[] = []
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT)
    let textNode = walker.nextNode()

    while (textNode) {
      if (range.intersectsNode(textNode)) {
        const text = textNode.textContent ?? ''
        const start = textNode === range.startContainer ? range.startOffset : 0
        const end = textNode === range.endContainer ? range.endOffset : text.length
        const selectedText = text.slice(start, end)

        if (selectedText.trim()) {
          entries.push({
            color: getNodeColor(textNode),
            fontSize: getNodeFontSize(textNode),
            formats: getNodeFormatState(textNode),
            text: selectedText,
          })
        }
      }
      textNode = walker.nextNode()
    }

    if (!entries.length) return null

    return {
      colors: [...new Set(entries.map((entry) => entry.color))],
      entries,
      fontSizes: entries.map((entry) => entry.fontSize),
      range: range.cloneRange(),
      text: entries.map((entry) => entry.text).join(''),
    }
  }

  const storeSelectedTextTable = (range: Range) => {
    const table = buildSelectedTextTable(range)
    if (!table) {
      clearSelectedTextTable()
      return null
    }

    selectedTextTableRef.current = table
    savedSelectionRef.current = table.range.cloneRange()
    savedSelectionTextRef.current = table.text
    savedCaretRangeRef.current = null
    pendingFormatRef.current = { ...DEFAULT_NOTE_FORMAT_STATE }
    formatTypingOverrideRef.current = false
    return table
  }

  const getCurrentEditorRange = () => {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection || selection.rangeCount === 0) return null

    const range = selection.getRangeAt(0)
    return editor.contains(range.commonAncestorContainer) ? range : null
  }

  const shouldKeepStoredSelection = () => {
    const editor = editorRef.current
    const activeElement = document.activeElement
    const toolbarHasFocus =
      activeElement instanceof HTMLElement &&
      Boolean(activeElement.closest('.bl-notes-toolbar'))

    return (
      toolbarHasFocus ||
      Boolean(editor?.querySelector('[data-bl-color-active="true"], [data-bl-font-active="true"]'))
    )
  }

  const restoreSelectionFromTable = () => {
    const table = selectedTextTableRef.current
    const selection = window.getSelection()
    if (!table || !selection) return false

    selection.removeAllRanges()
    selection.addRange(table.range.cloneRange())
    savedSelectionRef.current = table.range.cloneRange()
    savedSelectionTextRef.current = table.text
    return true
  }

  const getRangeFontSizes = (range: Range) => {
    const editor = editorRef.current
    if (!editor || !editor.contains(range.commonAncestorContainer)) return []

    if (range.collapsed) {
      return [getNodeFontSize(range.startContainer)]
    }

    const sizes: number[] = []
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT)
    let textNode = walker.nextNode()

    while (textNode) {
      if (range.intersectsNode(textNode)) {
        const text = textNode.textContent ?? ''
        const start = textNode === range.startContainer ? range.startOffset : 0
        const end = textNode === range.endContainer ? range.endOffset : text.length
        if (text.slice(start, end).trim()) {
          sizes.push(getNodeFontSize(textNode))
        }
      }
      textNode = walker.nextNode()
    }

    return sizes
  }

  const syncFontSizeFromRange = (range: Range) => {
    const sizes = getRangeFontSizes(range)
    if (!sizes.length) return

    const uniqueSizes = [...new Set(sizes)]
    if (uniqueSizes.length === 1) {
      setFontSize(uniqueSizes[0])
      setFontSizeInput(String(uniqueSizes[0]))
      return
    }

    setFontSizeInput('--')
  }

  const getActiveFontSizes = () => {
    const activeRange = getCurrentEditorRange()
    if (activeRange && !activeRange.collapsed) {
      const activeTable = storeSelectedTextTable(activeRange)
      if (activeTable?.fontSizes.length) return activeTable.fontSizes
    }

    if (activeRange?.collapsed) {
      clearSelectedTextTable()
      return []
    }

    const selectedTable = selectedTextTableRef.current
    if (shouldKeepStoredSelection() && selectedTable?.fontSizes.length) return selectedTable.fontSizes

    return []
  }

  const saveSelection = () => {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection || selection.rangeCount === 0) {
      clearSelectedTextTable()
      return
    }

    const range = selection.getRangeAt(0)
    if (editor.contains(range.commonAncestorContainer)) {
      if (range.collapsed) {
        savedCaretRangeRef.current = range.cloneRange()
        clearSelectedTextTable()
        return
      }

      const table = storeSelectedTextTable(range)
      if (table) {
        syncFontSizeFromRange(table.range)
        applyFormatState(getUnifiedFormatState(table.entries))
      }
      return
    }

    clearSelectedTextTable()
  }

  useEffect(() => {
    const handleSelectionChange = () => {
      const activeRange = getCurrentEditorRange()
      if (activeRange && !activeRange.collapsed) {
        const table = storeSelectedTextTable(activeRange)
        if (table) {
          syncFontSizeFromRange(table.range)
          setToolbarColor(getRangeColor(table.range) ?? DEFAULT_NOTE_COLOR)
          applyFormatState(getUnifiedFormatState(table.entries))
        }
        return
      }

      if (activeRange?.collapsed) {
        savedCaretRangeRef.current = activeRange.cloneRange()
        setToolbarColor(pendingColorRef.current ?? DEFAULT_NOTE_COLOR)
        applyFormatState(formatTypingOverrideRef.current ? pendingFormatRef.current : DEFAULT_NOTE_FORMAT_STATE)
        if (pendingFontSizeRef.current) {
          setFontSize(pendingFontSizeRef.current)
          setFontSizeInput(String(pendingFontSizeRef.current))
          clearSelectedTextTable()
          return
        }

        const sizes = getRangeFontSizes(activeRange)
        if (sizes.length) {
          setFontSize(sizes[0])
          setFontSizeInput(String(sizes[0]))
        }
        clearSelectedTextTable()
        return
      }

      if (!shouldKeepStoredSelection()) {
        clearSelectedTextTable()
        applyFormatState(DEFAULT_NOTE_FORMAT_STATE)
      }
    }

    document.addEventListener('selectionchange', handleSelectionChange)
    return () => document.removeEventListener('selectionchange', handleSelectionChange)
  })

  const restoreSelection = () => {
    const selection = window.getSelection()
    const range = savedSelectionRef.current
    if (!selection || !range) return

    selection.removeAllRanges()
    selection.addRange(range)
  }

  const restoreCaretSelection = () => {
    const selection = window.getSelection()
    const range = savedCaretRangeRef.current
    if (!selection || !range) return false

    editorRef.current?.focus()
    selection.removeAllRanges()
    selection.addRange(range.cloneRange())
    return true
  }

  const restoreSelectionByText = () => {
    const editor = editorRef.current
    const selectionText = savedSelectionTextRef.current
    const selection = window.getSelection()
    if (!editor || !selectionText || !selection) return false

    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT)
    let textNode = walker.nextNode()

    while (textNode) {
      const index = textNode.textContent?.indexOf(selectionText) ?? -1
      if (index >= 0) {
        const range = document.createRange()
        range.setStart(textNode, index)
        range.setEnd(textNode, index + selectionText.length)
        savedSelectionRef.current = range.cloneRange()
        selection.removeAllRanges()
        selection.addRange(range)
        return true
      }
      textNode = walker.nextNode()
    }

    return false
  }

  const prepareToolbarRange = (options: { allowCollapsed?: boolean } = {}) => {
    const { allowCollapsed = true } = options
    const editor = editorRef.current
    if (!editor) return null

    const activeRange = getCurrentEditorRange()
    if (activeRange && !activeRange.collapsed) {
      pendingFontSizeRef.current = null
      pendingColorRef.current = null
      storeSelectedTextTable(activeRange)
      editor.focus()
      return activeRange
    }

    if (activeRange?.collapsed) {
      savedCaretRangeRef.current = activeRange.cloneRange()
      clearSelectedTextTable()
      if (!allowCollapsed) return null
      restoreCaretSelection()
      return window.getSelection()?.rangeCount ? window.getSelection()?.getRangeAt(0) ?? null : null
    }

    if (selectedTextTableRef.current && shouldKeepStoredSelection() && restoreSelectionFromTable()) {
      editor.focus()
      return window.getSelection()?.rangeCount ? window.getSelection()?.getRangeAt(0) ?? null : null
    }

    if (allowCollapsed && savedCaretRangeRef.current && restoreCaretSelection()) {
      return window.getSelection()?.rangeCount ? window.getSelection()?.getRangeAt(0) ?? null : null
    }

    return null
  }

  const selectElementContents = (element: HTMLElement) => {
    const selection = window.getSelection()
    if (!selection) return

    if (element.matches('span[data-bl-font-size="true"], span[data-bl-font-selection]')) {
      element.dataset.blFontActive = 'true'
    }
    editorRef.current?.focus()
    const nextRange = document.createRange()
    nextRange.selectNodeContents(element)
    selection.removeAllRanges()
    selection.addRange(nextRange)
    storeSelectedTextTable(nextRange)
  }

  const selectTrackedFontSpan = () => {
    const editor = editorRef.current
    const marker = activeFontSelectionRef.current
    if (!editor || !marker) return false

    const trackedSpan = editor.querySelector<HTMLElement>(`span[data-bl-font-selection="${marker}"]`)
    if (!trackedSpan) return false

    trackedSpan.dataset.blFontActive = 'true'
    selectElementContents(trackedSpan)
    trackedSpan.dataset.blFontActive = 'true'
    return true
  }

  const queueTrackedFontSelection = () => {
    window.requestAnimationFrame(() => {
      selectTrackedFontSpan()
      window.setTimeout(selectTrackedFontSpan, 50)
    })
  }

  const clearActiveFontMarkers = () => {
    editorRef.current
      ?.querySelectorAll<HTMLElement>('span[data-bl-font-active="true"]')
      .forEach((node) => node.removeAttribute('data-bl-font-active'))
  }

  const clearFontSizeOverrides = (root: ParentNode, includeRoot = true) => {
    const elements =
      includeRoot && root instanceof HTMLElement
        ? [root, ...root.querySelectorAll<HTMLElement>('[style], [data-bl-font-size]')]
        : [...root.querySelectorAll<HTMLElement>('[style], [data-bl-font-size]')]

    elements.forEach((node) => {
      node.style.fontSize = ''
      node.removeAttribute('data-bl-font-size')
      node.removeAttribute('data-bl-font-active')
      node.removeAttribute('data-bl-font-selection')
      if (!node.getAttribute('style')) {
        node.removeAttribute('style')
      }
    })
  }

  const selectTrackedColorSpan = () => {
    const editor = editorRef.current
    const marker = activeColorSelectionRef.current
    if (!editor || !marker) return false

    const trackedSpan = editor.querySelector<HTMLElement>(`span[data-bl-color-selection="${marker}"]`)
    if (!trackedSpan) return false

    selectElementContents(trackedSpan)
    return true
  }

  const queueTrackedColorSelection = () => {
    window.requestAnimationFrame(() => {
      selectTrackedColorSpan()
      window.setTimeout(selectTrackedColorSpan, 50)
    })
  }

  const applyFontSize = (nextSize: number) => {
    if (!Number.isFinite(nextSize)) return

    const clampedSize = clamp(nextSize, 8, 24)
    const editor = editorRef.current

    setFontSize(clampedSize)
    setFontSizeInput(String(clampedSize))

    const activeRange = getCurrentEditorRange()
    if (activeRange && !activeRange.collapsed) {
      pendingFontSizeRef.current = null
      storeSelectedTextTable(activeRange)
    } else if (activeRange?.collapsed) {
      savedCaretRangeRef.current = activeRange.cloneRange()
      clearSelectedTextTable()
      pendingFontSizeRef.current = clampedSize
      restoreCaretSelection()
      return
    } else if (shouldKeepStoredSelection() && selectedTextTableRef.current) {
      if (!restoreSelectionFromTable()) {
        restoreSelection()
      }
    } else if (savedCaretRangeRef.current) {
      clearSelectedTextTable()
      if (restoreCaretSelection()) {
        pendingFontSizeRef.current = clampedSize
      }
      return
    } else if (shouldKeepStoredSelection() && !restoreSelectionFromTable()) {
      restoreSelection()
    }

    let selection = window.getSelection()
    if (
      (!selection || selection.rangeCount === 0 || selection.getRangeAt(0).collapsed) &&
      shouldKeepStoredSelection() &&
      (restoreSelectionFromTable() || selectTrackedFontSpan())
    ) {
      selection = window.getSelection()
    }
    if (!editor || !selection || selection.rangeCount === 0) return

    let range = selection.getRangeAt(0)
    if (
      (!editor.contains(range.commonAncestorContainer) || range.collapsed) &&
      shouldKeepStoredSelection() &&
      restoreSelectionByText()
    ) {
      selection = window.getSelection()
      if (selection?.rangeCount) {
        range = selection.getRangeAt(0)
      }
    }
    if (!editor.contains(range.commonAncestorContainer) || range.collapsed) return

    const workingRange = range.cloneRange()
    const commonAncestor =
      range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? (range.commonAncestorContainer as Element)
        : range.commonAncestorContainer.parentElement
    const existingFontSpan = commonAncestor?.closest<HTMLElement>('span[data-bl-font-size="true"]')
    if (existingFontSpan && existingFontSpan.textContent === range.toString()) {
      clearActiveFontMarkers()
      clearFontSizeOverrides(existingFontSpan, false)
      if (!existingFontSpan.dataset.blFontSelection) {
        existingFontSpan.dataset.blFontSelection = `font-${fontSelectionCounterRef.current + 1}`
        fontSelectionCounterRef.current += 1
      }
      activeFontSelectionRef.current = existingFontSpan.dataset.blFontSelection
      existingFontSpan.dataset.blFontActive = 'true'
      existingFontSpan.style.fontSize = `${clampedSize}px`
      selectElementContents(existingFontSpan)
      onChange(editor.innerHTML)
      queueTrackedFontSelection()
      return
    }

    const wrapper = document.createElement('span')
    clearActiveFontMarkers()
    wrapper.dataset.blFontSize = 'true'
    wrapper.dataset.blFontActive = 'true'
    fontSelectionCounterRef.current += 1
    wrapper.dataset.blFontSelection = `font-${fontSelectionCounterRef.current}`
    activeFontSelectionRef.current = wrapper.dataset.blFontSelection
    wrapper.style.fontSize = `${clampedSize}px`

    const fragment = workingRange.extractContents()
    clearFontSizeOverrides(fragment)
    wrapper.append(fragment)
    workingRange.insertNode(wrapper)

    editor.querySelectorAll('span').forEach((span: HTMLSpanElement) => {
      if (!span.textContent && span.children.length === 0) {
        span.remove()
      }
    })

    selectElementContents(wrapper)
    onChange(editor.innerHTML)
    queueTrackedFontSelection()
  }

  const insertPendingTextStyle = (nextText: string) => {
    const pendingSize = pendingFontSizeRef.current
    const pendingColor = pendingColorRef.current
    const pendingFormats = pendingFormatRef.current
    const enforceFormats = formatTypingOverrideRef.current
    const editor = editorRef.current
    const selection = window.getSelection()

    if (!hasPendingTextStyle() || !nextText || !editor || !selection) return false

    if (selection.rangeCount === 0 && !restoreCaretSelection()) return false
    let range = selection.getRangeAt(0)
    if (!editor.contains(range.commonAncestorContainer) && restoreCaretSelection()) {
      range = selection.getRangeAt(0)
    }
    if (!editor.contains(range.commonAncestorContainer) || !range.collapsed) return false

    const startElement =
      range.startContainer.nodeType === Node.ELEMENT_NODE
        ? (range.startContainer as Element)
        : range.startContainer.parentElement
    const activeFontSpan = startElement?.closest<HTMLElement>('span[data-bl-font-size="true"]')
    const activeFontSize = activeFontSpan
      ? Math.round(Number.parseFloat(window.getComputedStyle(activeFontSpan).fontSize))
      : null
    const activeColorSpan = startElement?.closest<HTMLElement>('span[data-bl-color="true"]')
    const activeColor = activeColorSpan?.style.color
      ? cssColorToHex(activeColorSpan.style.color)
      : startElement
        ? cssColorToHex(window.getComputedStyle(startElement).color)
        : null
    const activeFormats = startElement ? getNodeFormatState(startElement) : DEFAULT_NOTE_FORMAT_STATE

    const fontAlreadyActive = !pendingSize || activeFontSize === pendingSize
    const colorAlreadyActive = !pendingColor || activeColor === pendingColor
    const formatsAlreadyActive = !enforceFormats || NOTE_FORMAT_KEYS.every((key) => activeFormats[key] === pendingFormats[key])
    if (fontAlreadyActive && colorAlreadyActive && formatsAlreadyActive) {
      return false
    }

    const wrapper = document.createElement('span')
    if (pendingSize && activeFontSize !== pendingSize) {
      wrapper.dataset.blFontSize = 'true'
      wrapper.style.fontSize = `${pendingSize}px`
    }
    if (pendingColor && activeColor !== pendingColor) {
      wrapper.dataset.blColor = 'true'
      wrapper.style.color = pendingColor
    }
    if (enforceFormats && NOTE_FORMAT_KEYS.some((key) => activeFormats[key] !== pendingFormats[key])) {
      wrapper.dataset.blFormat = 'true'
      if (activeFormats.bold !== pendingFormats.bold) {
        wrapper.style.fontWeight = pendingFormats.bold ? '700' : '400'
      }
      if (activeFormats.italic !== pendingFormats.italic) {
        wrapper.style.fontStyle = pendingFormats.italic ? 'italic' : 'normal'
      }
      if (activeFormats.underline !== pendingFormats.underline) {
        wrapper.style.textDecoration = pendingFormats.underline ? 'underline' : 'none'
      }
    }
    const insertionRange = range.cloneRange()
    if (enforceFormats && activeFormats.underline && !pendingFormats.underline) {
      const underlineAncestor = findUnderlineAncestor(startElement)
      if (underlineAncestor && isRangeAtElementEnd(range, underlineAncestor)) {
        insertionRange.setStartAfter(underlineAncestor)
        insertionRange.collapse(true)
      }
    }
    const textNode = document.createTextNode(nextText === ' ' ? '\u00a0' : nextText)
    wrapper.append(textNode)
    insertionRange.insertNode(wrapper)

    const nextRange = document.createRange()
    nextRange.setStart(textNode, textNode.length)
    nextRange.collapse(true)
    selection.removeAllRanges()
    selection.addRange(nextRange)
    savedCaretRangeRef.current = nextRange.cloneRange()
    onChange(editor.innerHTML)
    return true
  }

  const handleNotesBeforeInput = (event: FormEvent<HTMLDivElement>) => {
    const inputEvent = event.nativeEvent as InputEvent
    const nextText = inputEvent.data

    if (inputEvent.inputType === 'insertText' && nextText && insertPendingTextStyle(nextText)) {
      event.preventDefault()
    }
  }

  const handleNotesKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (
      !hasPendingTextStyle() ||
      event.key.length !== 1 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    ) {
      return
    }

    if (insertPendingTextStyle(event.key)) {
      event.preventDefault()
    }
  }

  const applyFontSizeInput = () => {
    const nextSize = Number(fontSizeInput)
    if (Number.isFinite(nextSize)) {
      applyFontSize(nextSize)
      return
    }

    const selection = window.getSelection()
    const range = selection?.rangeCount ? selection.getRangeAt(0) : savedSelectionRef.current
    if (range) {
      syncFontSizeFromRange(range)
    }
  }

  const adjustFontSize = (direction: 'increase' | 'decrease') => {
    const selectedSizes = getActiveFontSizes()
    const baseSize = selectedSizes.length
      ? direction === 'increase'
        ? Math.max(...selectedSizes)
        : Math.min(...selectedSizes)
      : fontSize
    applyFontSize(baseSize + (direction === 'increase' ? 1 : -1))
  }

  const activeColorMarker = useCallback(
    () => editorRef.current?.querySelector<HTMLElement>('span[data-bl-color-active="true"]') ?? null,
    [],
  )

  const queueActiveColorSelection = useCallback(() => {
    const restoreActiveColorSelection = () => {
      const marker = activeColorMarker()
      const selection = window.getSelection()
      if (!marker || !selection) return

      editorRef.current?.focus()
      const nextRange = document.createRange()
      nextRange.selectNodeContents(marker)
      savedSelectionRef.current = nextRange.cloneRange()
      selection.removeAllRanges()
      selection.addRange(nextRange)
    }

    window.requestAnimationFrame(restoreActiveColorSelection)
    window.setTimeout(restoreActiveColorSelection, 80)
  }, [activeColorMarker])

  const nudgeColorPopover = () => {
    if (colorPopoverNudgeTimerRef.current) {
      window.clearTimeout(colorPopoverNudgeTimerRef.current)
    }

    setColorPopoverNudging(false)
    window.requestAnimationFrame(() => {
      setColorPopoverNudging(true)
      colorPopoverNudgeTimerRef.current = window.setTimeout(() => {
        setColorPopoverNudging(false)
        colorPopoverNudgeTimerRef.current = null
      }, 420)
    })
  }

  const syncColorFromHex = (nextHex: string) => {
    setHexInput(nextHex)
    const rgb = hexToRgb(nextHex)
    if (!rgb) return

    const normalized = rgbToHex(rgb)
    setTextColor(normalized)
    setRgbInput({ r: Math.round(rgb.r), g: Math.round(rgb.g), b: Math.round(rgb.b) })
    setColorHsv(rgbToHsv(rgb))
  }

  const syncColorFromRgb = (channel: keyof RgbColor, value: number) => {
    const nextRgb = {
      ...rgbInput,
      [channel]: clamp(Number.isFinite(value) ? value : 0, 0, 255),
    }
    const nextHex = rgbToHex(nextRgb)
    setRgbInput(nextRgb)
    setHexInput(nextHex)
    setTextColor(nextHex)
    setColorHsv(rgbToHsv(nextRgb))
  }

  const setPickerColor = (nextHsv: HsvColor, restoreEditorSelection = false) => {
    const nextHex = hsvToHex(nextHsv)
    const nextRgb = hexToRgb(nextHex) ?? rgbInput
    setColorHsv(nextHsv)
    setTextColor(nextHex)
    setHexInput(nextHex)
    setRgbInput(nextRgb)
    if (restoreEditorSelection) {
      queueActiveColorSelection()
    }
  }

  const setPickerFromHex = (nextHex: string) => {
    const rgb = hexToRgb(nextHex)
    if (!rgb) return

    const normalized = rgbToHex(rgb)
    setTextColor(normalized)
    setHexInput(normalized)
    setRgbInput({ r: Math.round(rgb.r), g: Math.round(rgb.g), b: Math.round(rgb.b) })
    setColorHsv(rgbToHsv(rgb))
  }

  const clearActiveColorMarker = useCallback(() => {
    const editor = editorRef.current
    const marker = activeColorMarker()
    if (!editor || !marker) return

    if (marker.dataset.blColor === 'true') {
      marker.style.color = colorPreviewOriginalColorRef.current ?? ''
      marker.removeAttribute('data-bl-color-active')
      colorPreviewOriginalColorRef.current = null
      return
    }

    const parent = marker.parentNode
    while (marker.firstChild) {
      parent?.insertBefore(marker.firstChild, marker)
    }
    marker.remove()
    parent?.normalize()
    colorPreviewOriginalColorRef.current = null
    onChange(editor.innerHTML)
  }, [activeColorMarker, onChange])

  useEffect(() => {
    if (!linkPopoverOpen && !colorPopoverOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (linkPopoverRef.current?.contains(target)) return
      if (colorPopoverRef.current?.contains(target)) return
      if (colorPopoverOpen) {
        event.preventDefault()
        event.stopPropagation()
        nudgeColorPopover()
        queueActiveColorSelection()
        return
      }
      if (editorRef.current?.contains(target)) return
      setLinkPopoverOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [colorPopoverOpen, linkPopoverOpen, queueActiveColorSelection])

  const markActiveColorSelection = () => {
    const editor = editorRef.current
    if (!editor) return null

    clearActiveColorMarker()
    const range = prepareToolbarRange({ allowCollapsed: false })
    if (!range) return null
    if (!editor.contains(range.commonAncestorContainer) || range.collapsed) return null

    const commonAncestor =
      range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? (range.commonAncestorContainer as Element)
        : range.commonAncestorContainer.parentElement
    const existingColorSpan = commonAncestor?.closest<HTMLElement>('span[data-bl-color="true"]')
    if (existingColorSpan && existingColorSpan.textContent === range.toString()) {
      colorPreviewOriginalColorRef.current = existingColorSpan.style.color || null
      existingColorSpan.dataset.blColorActive = 'true'
      selectElementContents(existingColorSpan)
      return existingColorSpan
    }

    const marker = document.createElement('span')
    colorPreviewOriginalColorRef.current = null
    marker.dataset.blColorActive = 'true'
    marker.append(range.extractContents())
    range.insertNode(marker)
    selectElementContents(marker)
    return marker
  }

  const updatePickerSquare = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const s = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100)
    const v = clamp(100 - ((event.clientY - rect.top) / rect.height) * 100, 0, 100)
    setPickerColor({ ...colorHsv, s, v }, true)
  }

  const openColorPopover = () => {
    const range = prepareToolbarRange({ allowCollapsed: false })
    const selectedHex = range ? getRangeColor(range) : null
    const nextColor = selectedHex ?? pendingColorRef.current ?? DEFAULT_NOTE_COLOR

    setToolbarColor(nextColor)
    setPickerFromHex(nextColor)
    setColorPopoverOpening(true)
    setColorPopoverOpen(true)
    if (colorPopoverOpenTimerRef.current) {
      window.clearTimeout(colorPopoverOpenTimerRef.current)
    }
    colorPopoverOpenTimerRef.current = window.setTimeout(() => {
      setColorPopoverOpening(false)
      colorPopoverOpenTimerRef.current = null
    }, 180)
    if (range) {
      window.requestAnimationFrame(markActiveColorSelection)
    }
  }

  const applyTextColor = () => {
    const normalizedHex = normalizeHex(hexInput) ?? textColor
    const editor = editorRef.current
    setTextColor(normalizedHex)
    setHexInput(normalizedHex)
    setRgbInput(hexToRgb(normalizedHex) ?? rgbInput)
    setColorHsv(rgbToHsv(hexToRgb(normalizedHex) ?? rgbInput))

    const marker = activeColorMarker()
    if (editor && marker) {
      const existingColorSpan = marker.matches('span[data-bl-color="true"]')
        ? marker
        : marker.closest<HTMLElement>('span[data-bl-color="true"]')
      const target = existingColorSpan ?? marker
      target.dataset.blColor = 'true'
      target.dataset.blColorActive = 'true'
      if (!target.dataset.blColorSelection) {
        target.dataset.blColorSelection = `color-${colorSelectionCounterRef.current + 1}`
        colorSelectionCounterRef.current += 1
      }
      activeColorSelectionRef.current = target.dataset.blColorSelection
      target.style.color = normalizedHex
      target.removeAttribute('data-bl-color-active')
      colorPreviewOriginalColorRef.current = null
      setToolbarColor(normalizedHex)
      pendingColorRef.current = null
      selectElementContents(target)
      onChange(editor.innerHTML)
      setColorPopoverOpen(false)
      queueTrackedColorSelection()
      return
    }

    const range = prepareToolbarRange({ allowCollapsed: false })
    if (!editor || !range) {
      pendingColorRef.current = normalizedHex
      setToolbarColor(normalizedHex)
      setColorPopoverOpen(false)
      restoreCaretSelection()
      return
    }

    if (!editor.contains(range.commonAncestorContainer) || range.collapsed) return

    const commonAncestor =
      range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
        ? (range.commonAncestorContainer as Element)
        : range.commonAncestorContainer.parentElement
    const existingColorSpan = commonAncestor?.closest<HTMLElement>('span[data-bl-color="true"]')
    if (existingColorSpan && existingColorSpan.textContent === range.toString()) {
      if (!existingColorSpan.dataset.blColorSelection) {
        existingColorSpan.dataset.blColorSelection = `color-${colorSelectionCounterRef.current + 1}`
        colorSelectionCounterRef.current += 1
      }
      activeColorSelectionRef.current = existingColorSpan.dataset.blColorSelection
      existingColorSpan.style.color = normalizedHex
      setToolbarColor(normalizedHex)
      pendingColorRef.current = null
      colorPreviewOriginalColorRef.current = null
      selectElementContents(existingColorSpan)
      onChange(editor.innerHTML)
      setColorPopoverOpen(false)
      queueTrackedColorSelection()
      return
    }

    const wrapper = document.createElement('span')
    wrapper.dataset.blColor = 'true'
    colorSelectionCounterRef.current += 1
    wrapper.dataset.blColorSelection = `color-${colorSelectionCounterRef.current}`
    activeColorSelectionRef.current = wrapper.dataset.blColorSelection
    wrapper.style.color = normalizedHex
    wrapper.append(range.extractContents())
    range.insertNode(wrapper)

    colorPreviewOriginalColorRef.current = null
    setToolbarColor(normalizedHex)
    pendingColorRef.current = null
    selectElementContents(wrapper)
    onChange(editor.innerHTML)
    setColorPopoverOpen(false)
    queueTrackedColorSelection()
  }

  const resetTextColorPicker = () => {
    pendingColorRef.current = null
    setToolbarColor(DEFAULT_NOTE_COLOR)
    setPickerFromHex(DEFAULT_NOTE_COLOR)
    if (activeColorMarker()) {
      queueActiveColorSelection()
    } else {
      restoreCaretSelection()
    }
  }

  const openLinkPopover = () => {
    const range = prepareToolbarRange({ allowCollapsed: false })
    const selection = range?.toString() ?? ''
    const hasSelectedText = Boolean(selection.trim())

    if (!hasSelectedText) {
      prepareToolbarRange()
    }

    setLinkText(selection)
    setLinkTextLocked(hasSelectedText)
    setLinkUrl('')
    setLinkPopoverOpen(true)
  }

  const applyLink = () => {
    const trimmedUrl = linkUrl.trim()
    if (!trimmedUrl) return

    const url = /^[a-z][a-z0-9+.-]*:/i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`
    const editor = editorRef.current
    const range = prepareToolbarRange({ allowCollapsed: !linkTextLocked })
    if (!editor || !range) return

    const anchor = document.createElement('a')
    anchor.href = url
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'

    if (linkTextLocked && !range.collapsed) {
      anchor.append(range.extractContents())
      range.insertNode(anchor)
    } else if (linkText.trim()) {
      if (!range.collapsed) {
        range.deleteContents()
      }
      anchor.textContent = linkText.trim()
      range.insertNode(anchor)
    } else if (!range.collapsed) {
      anchor.append(range.extractContents())
      range.insertNode(anchor)
    } else {
      return
    }

    const selection = window.getSelection()
    const nextRange = document.createRange()
    nextRange.setStartAfter(anchor)
    nextRange.collapse(true)
    selection?.removeAllRanges()
    selection?.addRange(nextRange)
    savedCaretRangeRef.current = nextRange.cloneRange()
    clearSelectedTextTable()
    onChange(editor.innerHTML)
    setLinkPopoverOpen(false)
    setLinkTextLocked(false)
  }

  const handleLinkClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    const anchor = target?.closest('a')
    if (!anchor) return

    event.preventDefault()
    window.open(anchor.href, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="bl-notes-editor">
      <div className="bl-notes-toolbar" aria-label="Notes formatting toolbar">
        <span className="bl-notes-size-stepper" aria-label="Font size controls">
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => adjustFontSize('decrease')} aria-label="Decrease font size">
            −
          </button>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={fontSizeInput}
            onChange={(event) => setFontSizeInput(event.target.value)}
            onBlur={applyFontSizeInput}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                applyFontSizeInput()
              }
            }}
            aria-label="Font size"
          />
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => adjustFontSize('increase')} aria-label="Increase font size">
            +
          </button>
        </span>
        <span className="bl-notes-divider" aria-hidden="true" />
        <button
          className={`bl-notes-tool is-bold ${formatState.bold ? 'is-active' : ''}`}
          type="button"
          onMouseDown={(event) => {
            event.preventDefault()
            toggleInlineFormat('bold')
          }}
          onKeyDown={(event) => {
            if (isToolbarActivationKey(event)) {
              event.preventDefault()
              toggleInlineFormat('bold')
            }
          }}
          title="Bold"
          aria-label="Bold"
          aria-pressed={formatState.bold}
        >
          B
        </button>
        <button
          className={`bl-notes-tool is-italic ${formatState.italic ? 'is-active' : ''}`}
          type="button"
          onMouseDown={(event) => {
            event.preventDefault()
            toggleInlineFormat('italic')
          }}
          onKeyDown={(event) => {
            if (isToolbarActivationKey(event)) {
              event.preventDefault()
              toggleInlineFormat('italic')
            }
          }}
          title="Italic"
          aria-label="Italic"
          aria-pressed={formatState.italic}
        >
          I
        </button>
        <button
          className={`bl-notes-tool is-underline ${formatState.underline ? 'is-active' : ''}`}
          type="button"
          onMouseDown={(event) => {
            event.preventDefault()
            toggleInlineFormat('underline')
          }}
          onKeyDown={(event) => {
            if (isToolbarActivationKey(event)) {
              event.preventDefault()
              toggleInlineFormat('underline')
            }
          }}
          title="Underline"
          aria-label="Underline"
          aria-pressed={formatState.underline}
        >
          U
        </button>
        <span className="bl-notes-color-wrap">
          <button
            className="bl-notes-tool is-color"
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={openColorPopover}
            title="Text color"
            aria-label="Text color"
            style={{ '--note-color': toolbarColor } as CSSProperties}
          >
            A
          </button>
          {colorPopoverOpen ? (
            <div
              className={`bl-color-popover ${colorPopoverOpening ? 'is-opening' : ''} ${colorPopoverNudging ? 'is-nudging' : ''}`}
              ref={colorPopoverRef}
              role="dialog"
              aria-label="Choose text color"
            >
              <div
                className="bl-color-square"
                style={{ '--picker-hue-color': hsvToHex({ h: colorHsv.h, s: 100, v: 100 }) } as CSSProperties}
                onPointerDown={(event) => {
                  event.preventDefault()
                  event.currentTarget.setPointerCapture(event.pointerId)
                  updatePickerSquare(event)
                }}
                onPointerMove={(event) => {
                  if (event.buttons === 1) updatePickerSquare(event)
                }}
                onPointerUp={(event) => {
                  event.preventDefault()
                  queueActiveColorSelection()
                }}
                onMouseUp={queueActiveColorSelection}
                aria-label="Color saturation and brightness"
              >
                <span
                  className="bl-color-square-dot"
                  style={{ left: `${colorHsv.s}%`, top: `${100 - colorHsv.v}%` }}
                  aria-hidden="true"
                />
              </div>
              <div className="bl-color-controls">
                <span className="bl-color-preview" style={{ background: textColor }} aria-label={`Current color ${textColor}`} />
                <label className="bl-color-hex-field">
                  <span>Hex</span>
                  <input
                    value={hexInput}
                    onChange={(event) => syncColorFromHex(event.target.value)}
                    onBlur={() => syncColorFromHex(normalizeHex(hexInput) ?? textColor)}
                    aria-label="Hex color"
                  />
                </label>
              </div>
              <input
                className="bl-color-hue"
                type="range"
                min="0"
                max="359"
                value={Math.round(colorHsv.h)}
                onChange={(event) => setPickerColor({ ...colorHsv, h: Number(event.target.value) })}
                aria-label="Hue"
              />
              <div className="bl-color-rgb">
                {(['r', 'g', 'b'] as Array<keyof RgbColor>).map((channel) => (
                  <label key={channel}>
                    <span>{channel.toUpperCase()}</span>
                    <input
                      type="number"
                      min="0"
                      max="255"
                      value={Math.round(rgbInput[channel])}
                      onChange={(event) => syncColorFromRgb(channel, Number(event.target.value))}
                      aria-label={`${channel.toUpperCase()} channel`}
                    />
                  </label>
                ))}
              </div>
              <div className="bl-color-actions">
                <button
                  className="secondary-action"
                  type="button"
                  onClick={() => {
                    clearActiveColorMarker()
                    setColorPopoverOpen(false)
                  }}
                >
                  Cancel
                </button>
                <button className="secondary-action" type="button" onClick={resetTextColorPicker}>
                  Reset
                </button>
                <button className="primary-action" type="button" onClick={applyTextColor}>
                  OK
                </button>
              </div>
            </div>
          ) : null}
        </span>
        <span className="bl-notes-divider" aria-hidden="true" />
        <span className="bl-notes-link-wrap">
          <button className="bl-notes-tool" type="button" onMouseDown={(event) => event.preventDefault()} onClick={openLinkPopover} title="Insert link" aria-label="Insert link">
            🔗
          </button>
          {linkPopoverOpen ? (
            <div className="bl-link-popover" ref={linkPopoverRef} role="dialog" aria-label="Create note link">
              <button className="bl-link-popover-close" type="button" onClick={() => setLinkPopoverOpen(false)} aria-label="Close link popover">
                ×
              </button>
              {linkTextLocked ? (
                <div className="bl-link-selected-text" title={linkText}>
                  <span>Selected text</span>
                  <strong>{linkText}</strong>
                </div>
              ) : (
                <label>
                  <span>Text</span>
                  <input value={linkText} onChange={(event) => setLinkText(event.target.value)} placeholder="Link label" />
                </label>
              )}
              <label>
                <span>URL</span>
                <input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://example.com" />
              </label>
              <button className="primary-action" type="button" onClick={applyLink}>
                Apply
              </button>
            </div>
          ) : null}
        </span>
        <button className="bl-notes-tool" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('justifyLeft')} title="Align left" aria-label="Align left">
          ☰
        </button>
        <button className="bl-notes-tool" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('justifyCenter')} title="Align center" aria-label="Align center">
          ≡
        </button>
        <button className="bl-notes-tool" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('justifyRight')} title="Align right" aria-label="Align right">
          ☷
        </button>
        <button className="bl-notes-tool" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('insertUnorderedList')} title="Bulleted list" aria-label="Bulleted list">
          •≡
        </button>
        <button className="bl-notes-tool" type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand('insertOrderedList')} title="Numbered list" aria-label="Numbered list">
          1≡
        </button>
      </div>
      <div
        className="bl-notes-box"
        contentEditable
        ref={editorRef}
        role="textbox"
        aria-label="Build notes"
        aria-multiline="true"
        data-placeholder="Add matchup notes, reminders, or build links..."
        onClick={handleLinkClick}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onPointerDown={() => {
          clearActiveFontMarkers()
          clearSelectedTextTable()
          pendingFontSizeRef.current = null
          pendingColorRef.current = null
        }}
        onBeforeInput={handleNotesBeforeInput}
        onKeyDown={handleNotesKeyDown}
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
        suppressContentEditableWarning
      />
    </div>
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
  onClose,
  onSave,
}: PokemonEditorPanelProps) {
  const selectedSlot = toSlotNumber(
    slotNumber ?? (slotIndex !== null && slotIndex !== undefined ? slotIndex + 1 : undefined) ?? pokemon?.slot ?? 1,
  )
  const initialPokemon = pokemon ?? null
  const [draftPokemon, setDraftPokemon] = useState<PokemonBuild | null>(initialPokemon)
  const [mode, setMode] = useState<EditorMode>('standard-evs')
  const [standardIvs, setStandardIvs] = useState<StatSpread>(initialPokemon?.ivs ?? { ...MAXED_IVS })
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
                  <div className="bl-editor-toggle" role="group" aria-label="Training mode" data-mode={mode}>
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
