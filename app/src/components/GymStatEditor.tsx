import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  CHAMPION_SP_MAX,
  CHAMPION_SP_TOTAL,
  STANDARD_EV_MAX,
  STANDARD_EV_TOTAL,
  STANDARD_IV_MAX,
  STAT_LABELS,
  STAT_TIER_LABELS,
  getStatBarColor,
  getStatTier,
} from '../data/pokemonEditorData'
import type { PokemonBuild, StatSpread } from '../types'
import { StatRadar } from './StatRadar'

export type EditorMode = 'standard-evs' | 'champion-points'

type GymStatEditorProps = {
  base: StatSpread
  computed: StatSpread
  draftPokemon: PokemonBuild
  isChampion: boolean
  mode: EditorMode
  spSpread: StatSpread
  spTotal: number
  evTotal: number
  budgetOver: number
  budgetBelow: number
  trimNotice: boolean
  onModeChange: (mode: EditorMode) => void
  onEvChange: (stat: keyof StatSpread, value: number) => void
  onIvChange: (stat: keyof StatSpread, value: number) => void
  onSpChange: (stat: keyof StatSpread, value: number) => void
}

const statKeys: Array<keyof StatSpread> = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']
const standardEvTickMarks = [0, 84, 168, STANDARD_EV_MAX]
const championSpTickMarks = [0, 8, 16, 24, CHAMPION_SP_MAX]

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

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

export function GymStatEditor({
  base,
  computed,
  draftPokemon,
  isChampion,
  mode,
  spSpread,
  spTotal,
  evTotal,
  budgetOver,
  budgetBelow,
  trimNotice,
  onModeChange,
  onEvChange,
  onIvChange,
  onSpChange,
}: GymStatEditorProps) {
  const budgetTotal = isChampion ? CHAMPION_SP_TOTAL : STANDARD_EV_TOTAL

  return (
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
            onClick={() => onModeChange('standard-evs')}
          >
            Standard Points
          </button>
          <button
            className={mode === 'champion-points' ? 'active' : ''}
            type="button"
            onClick={() => onModeChange('champion-points')}
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
            const sp = spSpread[stat]
            const points = isChampion ? sp : draftPokemon.evs[stat]
            const pointMax = isChampion ? CHAMPION_SP_MAX : STANDARD_EV_MAX
            const pointStep = 1
            const pointSpread = isChampion ? spSpread : draftPokemon.evs
            const allowedPointMax = statAllocationMax(budgetTotal, pointMax, pointSpread, stat)
            const controlMax = Math.max(points, allowedPointMax)
            const updatePoints = (next: number) => (isChampion ? onSpChange(stat, next) : onEvChange(stat, next))
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
                      onChange={(event) => onIvChange(stat, Number(event.target.value))}
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
  )
}

export default GymStatEditor
