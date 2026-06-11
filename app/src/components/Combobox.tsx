import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Tooltip } from './Tooltip'

export interface ComboOption {
  value: string
  label: string
  searchText: string
  leading?: ReactNode
  meta?: ReactNode
  tooltip?: ReactNode
}

export function Combobox({
  value,
  options,
  onChange,
  placeholder,
  ariaLabel,
  emptyText,
}: {
  value: string
  options: ComboOption[]
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel?: string
  emptyText?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  const selected = options.find((option) => option.value === value) ?? null

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return options
    return options.filter((option) => option.searchText.toLowerCase().includes(term))
  }, [query, options])

  const activeIndex = filtered.length > 0 ? Math.min(active, filtered.length - 1) : 0

  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const choose = (next: string) => {
    onChange(next)
    setOpen(false)
    setQuery('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive(Math.min(activeIndex + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive(Math.max(activeIndex - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const option = filtered[activeIndex]
      if (option) choose(option.value)
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const triggerLabel = selected ? selected.label : placeholder ?? 'Select…'
  const triggerInner = (
    <span className="bl-combo-trigger-inner">
      {selected?.leading}
      <span className="bl-combo-value">{triggerLabel}</span>
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
        setOpen((prev) => !prev)
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
    <div className="bl-combo" ref={wrapRef}>
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
            }}
            onKeyDown={onKeyDown}
            aria-label="Filter options"
          />
          <ul className="bl-combo-list" role="listbox">
            {filtered.length === 0 ? (
              <li className="bl-combo-empty">{emptyText ?? 'No matches'}</li>
            ) : (
              filtered.map((option, index) => {
                const optionButton = (
                  <button
                    type="button"
                    className={`bl-combo-option ${index === activeIndex ? 'is-active' : ''} ${
                      option.value === value ? 'is-selected' : ''
                    }`}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(option.value)}
                  >
                    {option.leading}
                    <span className="bl-combo-option-label">{option.label}</span>
                    {option.meta}
                  </button>
                )
                return (
                  <li key={option.value} role="option" aria-selected={option.value === value}>
                    {option.tooltip ? (
                      <Tooltip content={option.tooltip} className="bl-combo-option-tip">
                        {optionButton}
                      </Tooltip>
                    ) : (
                      optionButton
                    )}
                  </li>
                )
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export default Combobox
