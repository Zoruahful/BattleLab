import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode, type UIEvent } from 'react'
import { Tooltip } from './Tooltip'

export interface ComboOption {
  value: string
  label: string
  searchText: string
  group?: string
  disabled?: boolean
  disabledReason?: string
  leading?: ReactNode
  meta?: ReactNode
  selectedMeta?: ReactNode
  tooltip?: ReactNode
}

const VIRTUAL_OPTION_HEIGHT = 38
const VIRTUAL_GROUP_HEIGHT = 22
const VIRTUAL_VIEWPORT_HEIGHT = 320
const VIRTUAL_OVERSCAN = 8
const VIRTUALIZE_THRESHOLD = 80

export function Combobox({
  value,
  options,
  onChange,
  placeholder,
  ariaLabel,
  emptyText,
  loading = false,
  errorText,
  maxVisibleOptions = 50,
  resultLimitLabel = 'Showing',
}: {
  value: string
  options: ComboOption[]
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel?: string
  emptyText?: string
  loading?: boolean
  errorText?: string
  maxVisibleOptions?: number
  resultLimitLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)

  const selected = options.find((option) => option.value === value) ?? null

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return options
    return options.filter((option) => option.searchText.toLowerCase().includes(term))
  }, [query, options])

  const visibleOptions = useMemo(() => {
    const unlimited = maxVisibleOptions <= 0
    const limited = unlimited ? filtered : filtered.slice(0, maxVisibleOptions)
    const selectedInVisible = selected ? limited.some((option) => option.value === selected.value) : true

    if (!selected || selectedInVisible) return limited

    return [{ ...selected, group: selected.group ?? 'Selected' }, ...limited]
  }, [filtered, maxVisibleOptions, selected])

  const enabledVisibleOptions = visibleOptions.filter((option) => !option.disabled)
  const activeIndex = enabledVisibleOptions.length > 0 ? Math.min(active, enabledVisibleOptions.length - 1) : 0
  const visibleActiveOption = enabledVisibleOptions[activeIndex]
  const activeVisibleIndex = visibleActiveOption
    ? visibleOptions.findIndex((option) => option.value === visibleActiveOption.value)
    : -1
  const limited = maxVisibleOptions > 0 && filtered.length > visibleOptions.length
  const virtualized = maxVisibleOptions <= 0 && visibleOptions.length > VIRTUALIZE_THRESHOLD
  const footerText = limited
    ? `${resultLimitLabel} ${Math.min(filtered.length, visibleOptions.length)} of ${filtered.length} matches`
    : `${filtered.length} ${filtered.length === 1 ? 'match' : 'matches'}`

  const virtualRows = useMemo(() => {
    const rows: Array<{
      height: number
      index: number
      offset: number
      option: ComboOption
      showGroup: boolean
    }> = []

    visibleOptions.reduce((offset, option, index) => {
      const previous = visibleOptions[index - 1]
      const showGroup = Boolean(option.group && option.group !== previous?.group)
      const height = VIRTUAL_OPTION_HEIGHT + (showGroup ? VIRTUAL_GROUP_HEIGHT : 0)
      rows.push({ height, index, offset, option, showGroup })

      return offset + height
    }, 0)

    return rows
  }, [visibleOptions])
  const virtualTotalHeight = virtualRows.reduce((total, row) => total + row.height, 0)
  const virtualStartIndex = virtualized
    ? Math.max(
        0,
        virtualRows.findIndex((row) => row.offset + row.height >= scrollTop) - VIRTUAL_OVERSCAN,
      )
    : 0
  const firstRowAfterViewport = virtualRows.findIndex((row) => row.offset > scrollTop + VIRTUAL_VIEWPORT_HEIGHT)
  const virtualEndIndex = virtualized
    ? Math.min(
        virtualRows.length,
        Math.max(virtualStartIndex + 1, firstRowAfterViewport >= 0 ? firstRowAfterViewport : virtualRows.length) +
          VIRTUAL_OVERSCAN,
      )
    : visibleOptions.length
  const renderedRows = virtualized ? virtualRows.slice(virtualStartIndex, virtualEndIndex) : virtualRows

  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (!open || !virtualized || activeVisibleIndex < 0) return

    const row = virtualRows[activeVisibleIndex]
    const list = listRef.current
    if (!row || !list) return

    const viewportTop = list.scrollTop
    const viewportBottom = viewportTop + list.clientHeight

    if (row.offset < viewportTop) {
      list.scrollTop = row.offset
    } else if (row.offset + row.height > viewportBottom) {
      list.scrollTop = row.offset + row.height - list.clientHeight
    }
  }, [activeVisibleIndex, open, virtualRows, virtualized])

  const choose = (next: string) => {
    const option = options.find((candidate) => candidate.value === next)
    if (option?.disabled) return
    onChange(next)
    setOpen(false)
    setQuery('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      event.stopPropagation()
      if (enabledVisibleOptions.length > 0) {
        setActive(Math.min(activeIndex + 1, enabledVisibleOptions.length - 1))
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      event.stopPropagation()
      if (enabledVisibleOptions.length > 0) {
        setActive(Math.max(activeIndex - 1, 0))
      }
    } else if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      const option = visibleActiveOption
      if (option) choose(option.value)
    } else if (event.key === 'Escape') {
      event.stopPropagation()
      setOpen(false)
    }
  }

  const handleListScroll = (event: UIEvent<HTMLUListElement>) => {
    if (virtualized) {
      setScrollTop(event.currentTarget.scrollTop)
    }
  }

  const renderOptionRow = (
    option: ComboOption,
    index: number,
    showGroup: boolean,
    style?: CSSProperties,
  ) => {
    const enabledIndex = option.disabled
      ? -1
      : enabledVisibleOptions.findIndex((candidate) => candidate.value === option.value)
    const optionButton = (
      <button
        type="button"
        className={`bl-combo-option ${enabledIndex === activeIndex ? 'is-active' : ''} ${
          option.value === value ? 'is-selected' : ''
        } ${option.disabled ? 'is-disabled' : ''}`}
        disabled={option.disabled}
        title={option.disabledReason}
        onMouseEnter={() => {
          if (enabledIndex >= 0) setActive(enabledIndex)
        }}
        onClick={() => choose(option.value)}
      >
        {option.leading}
        <span className="bl-combo-option-label">{option.label}</span>
        {option.meta ? <span className="bl-combo-option-meta">{option.meta}</span> : null}
      </button>
    )

    return (
      <li
        className={virtualized ? 'bl-combo-virtual-row' : undefined}
        key={`${option.group ?? 'ungrouped'}-${option.value}-${index}`}
        style={style}
      >
        {showGroup ? <div className="bl-combo-group">{option.group}</div> : null}
        <div role="option" aria-selected={option.value === value} aria-disabled={option.disabled}>
          {option.tooltip && !option.disabled ? (
            <Tooltip content={option.tooltip} className="bl-combo-option-tip">
              {optionButton}
            </Tooltip>
          ) : (
            optionButton
          )}
        </div>
      </li>
    )
  }

  const triggerLabel = selected ? selected.label : placeholder ?? 'Select…'
  const triggerInner = (
    <span className="bl-combo-trigger-inner">
      {selected?.leading}
      <span className="bl-combo-value">{triggerLabel}</span>
      {selected?.selectedMeta ? <span className="bl-combo-selected-meta">{selected.selectedMeta}</span> : null}
    </span>
  )
  const triggerButton = (
    <button
      type="button"
      className="bl-combo-trigger"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label={ariaLabel}
      onClick={() => {
        setOpen((prev) => {
          if (!prev) setScrollTop(0)
          return !prev
        })
        setActive(0)
      }}
    >
      {triggerInner}
      <span className="bl-combo-caret" aria-hidden="true">
        ▾
      </span>
    </button>
  )

  return (
    <div className={`bl-combo ${open ? 'is-open' : ''}`} ref={wrapRef}>
      {selected?.tooltip ? (
        <Tooltip content={selected.tooltip} className="bl-combo-trigger-tip">
          {triggerButton}
        </Tooltip>
      ) : (
        triggerButton
      )}

      {open ? (
        <div className="bl-combo-pop">
          <input
            className="bl-combo-search"
            autoFocus
            type="text"
            placeholder="Type to filter…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActive(0)
              setScrollTop(0)
            }}
            onKeyDown={onKeyDown}
            aria-label="Filter options"
          />
          <ul
            className={`bl-combo-list ${virtualized ? 'is-virtualized' : ''}`}
            role="listbox"
            ref={listRef}
            onScroll={handleListScroll}
          >
            {loading ? (
              <li className="bl-combo-empty is-loading">Loading catalog options…</li>
            ) : errorText ? (
              <li className="bl-combo-empty is-error">{errorText}</li>
            ) : filtered.length === 0 ? (
              <li className="bl-combo-empty">{emptyText ?? 'No matches'}</li>
            ) : (
              <>
                {virtualized ? (
                  <li
                    className="bl-combo-virtual-spacer"
                    key="virtual-spacer"
                    style={{ height: virtualTotalHeight }}
                    aria-hidden="true"
                  />
                ) : null}
                {renderedRows.map((row) =>
                  renderOptionRow(
                    row.option,
                    row.index,
                    row.showGroup,
                    virtualized
                      ? {
                          height: row.height,
                          transform: `translateY(${row.offset}px)`,
                        }
                      : undefined,
                  ),
                )}
              </>
            )}
          </ul>
          {!loading && !errorText && filtered.length > 0 ? (
            <div className="bl-combo-footer">{footerText}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default Combobox
