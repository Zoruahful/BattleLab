import { TeamSlotCard } from '../components/TeamSlotCard'
import { detailedSimulationReport, submittedTeam } from '../data'
import type { BattleFormat, SimulationReport, SubmittedTeam } from '../types'
import '../styles/team-builder.css'

export type TeamBuilderViewProps = {
  team?: SubmittedTeam
  report?: SimulationReport
  onSlotSelect?: (slotIndex: number) => void
  onClearTeam?: () => void
  onSlotClear?: (slotIndex: number) => void
}

const formatLabels: Record<BattleFormat, string> = {
  'vgc-regulation-h': 'VGC Regulation H',
  'vgc-regulation-g': 'VGC Regulation G',
  custom: 'Custom format',
}

const getCoverageTone = (score: number) => {
  if (score >= 75) {
    return 'good'
  }

  if (score >= 55) {
    return 'warning'
  }

  return 'danger'
}

export function TeamBuilderView({
  team = submittedTeam,
  report = detailedSimulationReport,
  onSlotSelect,
  onClearTeam,
  onSlotClear,
}: TeamBuilderViewProps) {
  const stableSlots = Array.from(
    { length: 6 },
    (_, index) => team.slots.find((slot) => slot.slot === index + 1)?.pokemon ?? null,
  )
  const filledCount = stableSlots.filter(Boolean).length
  const coverageItems = report.coverage.slice(0, 4).map((item) => ({
    label: item.type,
    value: `${item.score}%`,
    tone: getCoverageTone(item.score),
  }))

  return (
    <section className="bl-team-builder" aria-label="Team Builder">
      <div className="bl-team-meta" aria-label="Team metadata">
        <span className="bl-team-pill">
          <span className="bl-team-pill-dot" aria-hidden="true" />
          <strong>{filledCount} / 6</strong>
          Pokemon
        </span>
        <span className="bl-team-pill">
          <strong>{formatLabels[team.format]}</strong>
        </span>
        <span className="bl-team-pill">
          <strong>Gen 9</strong>
        </span>
        <span className="bl-team-meta-spacer" aria-hidden="true" />
        <button
          className="secondary-action bl-clear-team-button"
          type="button"
          disabled={filledCount === 0}
          onClick={onClearTeam}
        >
          Clear team
        </button>
      </div>

      <div className="bl-team-grid" aria-label="Pokemon team slots">
        {stableSlots.map((pokemon, index) => (
          <TeamSlotCard
            key={`${pokemon?.id ?? 'empty'}-${index}`}
            slotNumber={index + 1}
            pokemon={pokemon}
            onSelect={onSlotSelect}
            onClear={onSlotClear}
          />
        ))}
      </div>

      <section className="bl-coverage-panel" aria-label="Team coverage placeholder">
        <div>
          <h3>Team coverage</h3>
          <p>{report.overview.headline}</p>
        </div>

        <div className="bl-coverage-list">
          {coverageItems.map((item) => (
            <span className={`bl-coverage-chip is-${item.tone}`} key={item.label}>
              <strong>{item.label}</strong>
              {item.value}
            </span>
          ))}
        </div>

        <span className="bl-winrate-preview" aria-label="Win rate preview">
          {report.summary.winRate.toFixed(1)}% WR preview
        </span>
      </section>
    </section>
  )
}

export default TeamBuilderView
