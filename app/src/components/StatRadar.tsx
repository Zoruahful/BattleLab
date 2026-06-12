import { useEffect, useMemo, useRef, useState } from 'react'
import { getStatTier, STAT_LABELS, STAT_TIER_LABELS } from '../data/pokemonEditorData'
import type { StatSpread } from '../types'

const radarStats: Array<keyof StatSpread> = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']
const axisAngles = [-90, -30, 30, 90, 150, 210]
const center = 130
const radius = 86
const BASE_COLOR = '#f1b537'
const TOTAL_COLOR = '#2d9ce0'
const tooltipWidth = 82
const tooltipHeight = 34
const tooltipGap = 10
const RADAR_LABELS: Record<keyof StatSpread, string> = {
  hp: 'HP',
  atk: 'ATK',
  def: 'DEF',
  spa: 'SP.ATK',
  spd: 'Sp.DEF',
  spe: 'Speed',
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const normalizeStat = (stat: keyof StatSpread, value: number) => {
  const max = stat === 'hp' ? 240 : 220
  return clamp(value / max, 0, 1)
}

const pointFor = (angle: number, amount: number) => {
  const radians = (angle * Math.PI) / 180
  return {
    x: center + Math.cos(radians) * radius * amount,
    y: center + Math.sin(radians) * radius * amount,
  }
}

const labelPointFor = (angle: number, stat: keyof StatSpread) => {
  const amount = stat === 'atk' || stat === 'def' || stat === 'spe' || stat === 'spd' ? 1.2 : 1.14
  return pointFor(angle, amount)
}

const labelAnchorFor = (stat: keyof StatSpread) => {
  if (stat === 'atk' || stat === 'def') return 'start'
  if (stat === 'spe' || stat === 'spd') return 'end'
  return 'middle'
}

const tooltipForPoint = (point: { x: number; y: number }) => {
  const side = point.x < center ? 'right' : 'left'
  const x = side === 'left' ? point.x - tooltipWidth - tooltipGap : point.x + tooltipGap
  const y = clamp(point.y - tooltipHeight / 2, 4, 244 - tooltipHeight - 4)

  return {
    side,
    x,
    y,
    pointerX: side === 'left' ? x + tooltipWidth : x,
    pointerY: point.y,
  }
}

const pointsToString = (values: number[]) =>
  values
    .map((value, index) => {
      const point = pointFor(axisAngles[index], value)
      return `${point.x.toFixed(1)},${point.y.toFixed(1)}`
    })
    .join(' ')

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function StatRadar({ baseStats, totalStats }: { baseStats: StatSpread; totalStats: StatSpread }) {
  const { hp: baseHp, atk: baseAtk, def: baseDef, spa: baseSpa, spd: baseSpd, spe: baseSpe } = baseStats
  const { hp: totalHp, atk: totalAtk, def: totalDef, spa: totalSpa, spd: totalSpd, spe: totalSpe } = totalStats
  const baseRawValues = useMemo(
    () => [baseHp, baseAtk, baseDef, baseSpa, baseSpd, baseSpe],
    [baseAtk, baseDef, baseHp, baseSpa, baseSpd, baseSpe],
  )
  const totalRawValues = useMemo(
    () => [totalHp, totalAtk, totalDef, totalSpa, totalSpd, totalSpe],
    [totalAtk, totalDef, totalHp, totalSpa, totalSpd, totalSpe],
  )
  const baseTargets = useMemo(
    () => radarStats.map((stat, index) => normalizeStat(stat, baseRawValues[index])),
    [baseRawValues],
  )
  const totalTargets = useMemo(
    () => radarStats.map((stat, index) => normalizeStat(stat, totalRawValues[index])),
    [totalRawValues],
  )
  const [animatedValues, setAnimatedValues] = useState(() => ({
    base: radarStats.map(() => 0),
    total: radarStats.map(() => 0),
  }))
  const [hoveredDot, setHoveredDot] = useState<{
    point: { x: number; y: number }
    series: 'Base' | 'Total'
    stat: keyof StatSpread
    value: number
  } | null>(null)
  const valuesRef = useRef(animatedValues)
  const reducedMotion = prefersReducedMotion()

  useEffect(() => {
    if (reducedMotion) return

    let raf = 0
    const start = performance.now()
    const duration = 450
    const from = valuesRef.current

    const tick = (now: number) => {
      const progress = clamp((now - start) / duration, 0, 1)
      const eased = 1 - (1 - progress) ** 3
      const next = {
        base: baseTargets.map((target, index) => from.base[index] + (target - from.base[index]) * eased),
        total: totalTargets.map((target, index) => from.total[index] + (target - from.total[index]) * eased),
      }
      valuesRef.current = next
      setAnimatedValues(next)

      if (progress < 1) {
        raf = requestAnimationFrame(tick)
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [baseTargets, reducedMotion, totalTargets])

  const values = reducedMotion ? { base: baseTargets, total: totalTargets } : animatedValues
  const basePolygonPoints = pointsToString(values.base)
  const totalPolygonPoints = pointsToString(values.total)
  const summary = radarStats
    .map((stat, index) => `${STAT_LABELS[stat]} ${totalRawValues[index]} base ${baseRawValues[index]}`)
    .join(', ')
  const hoveredTooltip = hoveredDot
    ? {
        ...hoveredDot,
        ...tooltipForPoint(hoveredDot.point),
        tier: STAT_TIER_LABELS[getStatTier(hoveredDot.stat, hoveredDot.value)],
      }
    : null

  return (
    <figure className="bl-stat-radar" aria-label={`Base and total stat radar: ${summary}`}>
      <svg viewBox="0 0 260 244" role="img">
        <title>Base and total stat radar: {summary}</title>
        {[0.33, 0.66, 1].map((level) => (
          <polygon className="bl-stat-radar-grid" points={pointsToString(radarStats.map(() => level))} key={level} />
        ))}
        {axisAngles.map((angle, index) => {
          const end = pointFor(angle, 1)
          const stat = radarStats[index]
          const label = labelPointFor(angle, stat)
          return (
            <g key={stat}>
              <line className="bl-stat-radar-spoke" x1={center} y1={center} x2={end.x} y2={end.y} />
              <text className="bl-stat-radar-label" x={label.x} y={label.y} textAnchor={labelAnchorFor(stat)}>
                {RADAR_LABELS[stat]}
              </text>
            </g>
          )
        })}
        <polygon
          className="bl-stat-radar-plot bl-stat-radar-plot-total"
          points={totalPolygonPoints}
          style={{ fill: 'rgba(45, 156, 224, 0.34)', stroke: TOTAL_COLOR }}
        />
        <polygon
          className="bl-stat-radar-plot bl-stat-radar-plot-base"
          points={basePolygonPoints}
          style={{ fill: 'rgba(241, 181, 55, 0.68)', stroke: BASE_COLOR }}
        />
        {values.base.map((value, index) => {
          const point = pointFor(axisAngles[index], value)
          const stat = radarStats[index]
          const rawValue = baseRawValues[index]
          return (
            <circle
              className="bl-stat-radar-dot bl-stat-radar-dot-base"
              cx={point.x}
              cy={point.y}
              r="2"
              key={`base-${stat}`}
              onBlur={() => setHoveredDot(null)}
              onFocus={() => setHoveredDot({ point, series: 'Base', stat, value: rawValue })}
              onPointerEnter={() => setHoveredDot({ point, series: 'Base', stat, value: rawValue })}
              onPointerLeave={() => setHoveredDot(null)}
              tabIndex={0}
            />
          )
        })}
        {values.total.map((value, index) => {
          const point = pointFor(axisAngles[index], value)
          const stat = radarStats[index]
          return (
            <circle
              className="bl-stat-radar-dot"
              cx={point.x}
              cy={point.y}
              r="2.72"
              key={stat}
              onBlur={() => setHoveredDot(null)}
              onFocus={() => setHoveredDot({ point, series: 'Total', stat, value: totalRawValues[index] })}
              onPointerEnter={() => setHoveredDot({ point, series: 'Total', stat, value: totalRawValues[index] })}
              onPointerLeave={() => setHoveredDot(null)}
              tabIndex={0}
            >
            </circle>
          )
        })}
        {hoveredTooltip ? (
          <g
            className={`bl-stat-radar-tooltip is-${hoveredTooltip.side}`}
            key={`${hoveredTooltip.series}-${hoveredTooltip.stat}`}
            pointerEvents="none"
          >
            <path
              className="bl-stat-radar-tooltip-caret"
              d={
                hoveredTooltip.side === 'left'
                  ? `M ${hoveredTooltip.pointerX} ${hoveredTooltip.pointerY - 4} L ${
                      hoveredTooltip.pointerX + 6
                    } ${hoveredTooltip.pointerY} L ${hoveredTooltip.pointerX} ${hoveredTooltip.pointerY + 4} Z`
                  : `M ${hoveredTooltip.pointerX} ${hoveredTooltip.pointerY - 4} L ${
                      hoveredTooltip.pointerX - 6
                    } ${hoveredTooltip.pointerY} L ${hoveredTooltip.pointerX} ${hoveredTooltip.pointerY + 4} Z`
              }
            />
            <rect
              className="bl-stat-radar-tooltip-box"
              height={tooltipHeight}
              rx="5"
              width={tooltipWidth}
              x={hoveredTooltip.x}
              y={hoveredTooltip.y}
            />
            <text className="bl-stat-radar-tooltip-value" x={hoveredTooltip.x + 8} y={hoveredTooltip.y + 14}>
              {hoveredTooltip.series} {hoveredTooltip.value}
            </text>
            <text className="bl-stat-radar-tooltip-tier" x={hoveredTooltip.x + 8} y={hoveredTooltip.y + 27}>
              {hoveredTooltip.tier}
            </text>
          </g>
        ) : null}
      </svg>
      <figcaption className="bl-stat-radar-legend">
        <span>
          <i className="is-total" aria-hidden="true" />
          Total
        </span>
        <span>
          <i className="is-base" aria-hidden="true" />
          Base
        </span>
      </figcaption>
    </figure>
  )
}

export default StatRadar
