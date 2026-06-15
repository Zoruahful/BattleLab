import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
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
  const wrapRef = useRef<HTMLDivElement | null>(null)

  const selected = options.find((option) => option.value === value) ?? null

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return options
    return options.filter((option) => option.searchText.toLowerCase().includes(term))
  }, [query, options])

  const visibleOptions = useMemo(() => {
    const limited = filtered.slice(0, maxVisibleOptions)
    const selectedInVisible = selected ? limited.some((option) => option.value === selected.value) : true

    if (!selected || selectedInVisible) return limited

    return [{ ...selected, group: selected.group ?? 'Selected' }, ...limited]
  }, [filtered, maxVisibleOptions, selected])

  const enabledVisibleOptions = visibleOptions.filter((option) => !option.disabled)
  const activeIndex = enabledVisibleOptions.length > 0 ? Math.min(active, enabledVisibleOptions.length - 1) : 0
  const visibleActiveOption = enabledVisibleOptions[activeIndex]
  const limited = filtered.length > visibleOptions.length
  const footerText = limited
    ? `${resultLimitLabel} ${Math.min(filtered.length, visibleOptions.length)} of ${filtered.length} matches`
    : `${filtered.length} ${filtered.length === 1 ? 'match' : 'matches'}`

  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

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
            }}
            onKeyDown={onKeyDown}
            aria-label="Filter options"
          />
          <ul className="bl-combo-list" role="listbox">
            {loading ? (
              <li className="bl-combo-empty is-loading">Loading catalog options…</li>
            ) : errorText ? (
              <li className="bl-combo-empty is-error">{errorText}</li>
            ) : filtered.length === 0 ? (
              <li className="bl-combo-empty">{emptyText ?? 'No matches'}</li>
            ) : (
              visibleOptions.map((option, index) => {
                const previous = visibleOptions[index - 1]
                const showGroup = option.group && option.group !== previous?.group
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
                  <li key={`${option.group ?? 'ungrouped'}-${option.value}`}>
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
              })
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
