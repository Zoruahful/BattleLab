import { useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type Placement = 'top' | 'bottom'

export function Tooltip({
  children,
  content,
  className,
}: {
  children: ReactNode
  content: ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number; placement: Placement }>({
    left: 0,
    top: 0,
    placement: 'top',
  })
  const ref = useRef<HTMLSpanElement | null>(null)
  const tipId = useId()

  const show = () => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const placement: Placement = rect.top > 240 ? 'top' : 'bottom'
    setPos({
      left: rect.left + rect.width / 2,
      top: placement === 'top' ? rect.top - 8 : rect.bottom + 8,
      placement,
    })
    setOpen(true)
  }

  const hide = () => setOpen(false)

  return (
    <span
      ref={ref}
      className={`bl-tip-anchor ${className ?? ''}`}
      onMouseEnter={show}
      onMouseOver={show}
      onMouseMove={show}
      onPointerEnter={show}
      onPointerOver={show}
      onPointerMove={show}
      onMouseLeave={hide}
      onPointerLeave={hide}
      onFocus={show}
      onFocusCapture={show}
      onBlur={hide}
      aria-describedby={open ? tipId : undefined}
    >
      {children}
      {open ? createPortal(
        <span
          id={tipId}
          role="tooltip"
          className={`bl-tip is-${pos.placement}`}
          style={{ left: pos.left, top: pos.top }}
        >
          {content}
        </span>,
        document.body,
      ) : null}
    </span>
  )
}

export function TooltipCard({
  icon,
  title,
  subtitle,
  rows,
  description,
}: {
  icon?: ReactNode
  title: string
  subtitle?: string
  rows?: Array<{ label: string; value: ReactNode }>
  description?: string
}) {
  return (
    <span className="bl-tipcard">
      <span className="bl-tipcard-head">
        {icon ? <span className="bl-tipcard-icon">{icon}</span> : null}
        <span className="bl-tipcard-titles">
          <strong>{title}</strong>
          {subtitle ? <em>{subtitle}</em> : null}
        </span>
      </span>
      {rows && rows.length > 0 ? (
        <span className="bl-tipcard-rows">
          {rows.map((row) => (
            <span className="bl-tipcard-row" key={row.label}>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </span>
          ))}
        </span>
      ) : null}
      {description ? <span className="bl-tipcard-desc">{description}</span> : null}
    </span>
  )
}

export default Tooltip
