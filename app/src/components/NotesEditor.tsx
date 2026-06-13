import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

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

export function NotesEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
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
                style={{ '--picker-hue-color': hsvToHex({ h: colorHsv.h, s: 100, v: 100 }) } as CSSProperties}
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

export default NotesEditor
