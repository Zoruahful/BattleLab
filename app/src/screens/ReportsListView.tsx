import { useMemo, useState } from 'react'
import type { ReportHistoryEntry, ReportTier } from '../types'
import '../styles/reports-list.css'

type ReportSortId = 'newest' | 'best-win-rate' | 'most-battles' | 'fastest'
type TierFilterId = 'all' | ReportTier

export type ReportsListViewProps = {
  entries: ReportHistoryEntry[]
  selectedReportId?: string | null
  onSelectReport: (entry: ReportHistoryEntry) => void
  onOpenFilters: () => void
}

const sortLabels: Record<ReportSortId, string> = {
  newest: 'Newest first',
  'best-win-rate': 'Best win rate',
  'most-battles': 'Most battles',
  fastest: 'Fastest avg turns',
}

const tierFilters: TierFilterId[] = ['all', 'S-Tier', 'A-Tier', 'B-Tier', 'C-Tier']

export function ReportsListView({
  entries,
  selectedReportId,
  onSelectReport,
  onOpenFilters,
}: ReportsListViewProps) {
  const [sortBy, setSortBy] = useState<ReportSortId>('newest')
  const [tierFilter, setTierFilter] = useState<TierFilterId>('all')

  const visibleEntries = useMemo(() => {
    const filtered =
      tierFilter === 'all' ? entries : entries.filter((entry) => entry.summary.tier === tierFilter)

    return [...filtered].sort((left, right) => {
      if (sortBy === 'best-win-rate') {
        return right.summary.winRate - left.summary.winRate
      }

      if (sortBy === 'most-battles') {
        return right.summary.totalBattles - left.summary.totalBattles
      }

      if (sortBy === 'fastest') {
        return left.summary.avgTurns - right.summary.avgTurns
      }

      return new Date(right.generatedAt).getTime() - new Date(left.generatedAt).getTime()
    })
  }, [entries, sortBy, tierFilter])

  const totalBattles = visibleEntries.reduce((total, entry) => total + entry.summary.totalBattles, 0)

  return (
    <section className="bl-reports" aria-label="Reports history">
      <div className="bl-reports-toolbar" aria-label="Report filters and sorting">
        <span className="bl-report-pill">
          <span className="bl-report-pill-dot" aria-hidden="true" />
          <strong>{visibleEntries.length}</strong>
          of {entries.length} reports
        </span>
        <span className="bl-report-pill">
          <strong>{formatNumber(totalBattles)}</strong>
          battles shown
        </span>

        <div className="bl-reports-toolbar-spacer" aria-hidden="true" />

        <label className="bl-report-select-label">
          <span>Sort</span>
          <select
            className="bl-report-select"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as ReportSortId)}
          >
            {Object.entries(sortLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <button className="secondary-action" type="button" onClick={onOpenFilters}>
          Filters
        </button>
      </div>

      <div className="bl-report-tier-row" aria-label="Tier quick filters">
        {tierFilters.map((tier) => (
          <button
            className={`bl-tier-filter ${tierFilter === tier ? 'is-active' : ''}`}
            key={tier}
            type="button"
            onClick={() => setTierFilter(tier)}
          >
            {tier === 'all' ? 'All tiers' : tier}
          </button>
        ))}
      </div>

      <div className="bl-reports-list" aria-label="Saved simulation reports">
        {visibleEntries.length === 0 ? (
          <div className="bl-reports-empty">
            <strong>No reports match the current filters.</strong>
            <span>Clear the tier filter or choose a different sort to review history.</span>
          </div>
        ) : (
          visibleEntries.map((entry) => (
            <ReportHistoryCard
              active={entry.reportId === selectedReportId}
              entry={entry}
              key={entry.id}
              onSelect={() => onSelectReport(entry)}
            />
          ))
        )}
      </div>
    </section>
  )
}

function ReportHistoryCard({
  active,
  entry,
  onSelect,
}: {
  active: boolean
  entry: ReportHistoryEntry
  onSelect: () => void
}) {
  return (
    <button
      className={`bl-report-card ${active ? 'is-active' : ''}`}
      type="button"
      aria-pressed={active}
      onClick={onSelect}
    >
      <span className="bl-report-card-main">
        <span className="bl-report-title">{entry.title}</span>
        <span className="bl-report-description">{entry.description}</span>
        <span className="bl-report-meta" aria-label={`${entry.title} metadata`}>
          <span>
            <strong>{formatNumber(entry.summary.totalBattles)}</strong>
            battles
          </span>
          <span>
            <strong>{entry.summary.avgTurns.toFixed(1)}</strong>
            avg turns
          </span>
          <span>{entry.formatLabel}</span>
          <span>{entry.profileName}</span>
          <span>Generated {formatGeneratedAt(entry.generatedAt)}</span>
        </span>
      </span>

      <span className="bl-report-card-score">
        <span className="bl-report-win-rate">
          {formatWinRate(entry.summary.winRate)}
          <span>%</span>
        </span>
        <span className="bl-report-wr-label">WR</span>
        <span className={`bl-report-tier ${tierClassName(entry.summary.tier)}`}>{entry.summary.tier}</span>
        <span className="bl-report-card-cta">View report</span>
      </span>
    </button>
  )
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en').format(value)
}

function formatGeneratedAt(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatWinRate(value: number) {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
}

function tierClassName(tier: ReportTier) {
  return `is-${tier.toLowerCase().replace(/[^a-z]+/g, '-')}`
}

export default ReportsListView
