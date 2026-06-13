import { useMemo, useState, type CSSProperties, type KeyboardEvent } from 'react'
import type { ReportCallout, ReportTier, SimulationReport } from '../types'
import '../styles/report-detail-overview.css'

export type ReportDetailOverviewViewProps = {
  report: SimulationReport
  onBack: () => void
}

type ReportTabId = 'overview' | 'threats' | 'leads' | 'cores' | 'coverage'

const reportTabs: Array<{ id: ReportTabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'threats', label: 'Threats' },
  { id: 'leads', label: 'Leads' },
  { id: 'cores', label: 'Cores' },
  { id: 'coverage', label: 'Coverage' },
]

export function ReportDetailOverviewView({ report, onBack }: ReportDetailOverviewViewProps) {
  const [activeTab, setActiveTab] = useState<ReportTabId>('overview')
  const activeTabIndex = reportTabs.findIndex((tab) => tab.id === activeTab)
  const activeTabPanelId = `report-tabpanel-${activeTab}`
  const activeTabId = `report-tab-${activeTab}`

  const sortedThreats = useMemo(
    () => [...report.threats].sort((left, right) => right.lossRate - left.lossRate),
    [report.threats],
  )
  const sortedLeads = useMemo(
    () => [...report.leads].sort((left, right) => right.winRate - left.winRate),
    [report.leads],
  )
  const sortedCores = useMemo(
    () => [...report.cores].sort((left, right) => right.winRate - left.winRate),
    [report.cores],
  )
  const coverageMembers = useMemo(() => {
    const names = new Set<string>()
    report.coverage.forEach((coverage) => {
      coverage.members.forEach((member) => names.add(member.pokemon))
    })
    return [...names]
  }, [report.coverage])

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    let nextIndex: number

    if (event.key === 'ArrowRight') {
      nextIndex = (activeTabIndex + 1) % reportTabs.length
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (activeTabIndex - 1 + reportTabs.length) % reportTabs.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = reportTabs.length - 1
    } else {
      return
    }

    event.preventDefault()
    const nextTab = reportTabs[nextIndex]
    setActiveTab(nextTab.id)

    const tabButtons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    tabButtons?.[nextIndex]?.focus()
  }

  return (
    <section className="bl-report-detail" aria-label={`${report.teamName} report overview`}>
      <div className="bl-report-detail-topbar">
        <button className="bl-detail-back" type="button" onClick={onBack}>
          <span aria-hidden="true">‹</span>
          Back to Reports
        </button>
        <span className="bl-detail-generated">Generated {formatGeneratedAt(report.generatedAt)}</span>
      </div>

      <header className="bl-detail-header">
        <div>
          <span className="eyebrow">Simulation Report</span>
          <h2>
            {report.teamName} <span>vs</span> {report.opponentPool.name}
          </h2>
          <p>{report.opponentPool.description}</p>
        </div>
        <div className="bl-detail-header-actions">
          <span className="bl-detail-sample-pill">Sample data</span>
          <button className="secondary-action" type="button" disabled>
            Export PDF
          </button>
        </div>
      </header>

      <section className="bl-detail-hero" aria-label="Report summary">
        <div className="bl-detail-win-rate">
          <strong>{report.summary.winRate.toFixed(1)}</strong>
          <span>% WR</span>
        </div>
        <div className={`bl-detail-tier ${tierClassName(report.summary.tier)}`}>
          {report.summary.tier}
        </div>
        <div className="bl-detail-stat-grid">
          <SummaryStat label="Wins" value={formatNumber(report.summary.wins)} tone="good" />
          <SummaryStat label="Losses" value={formatNumber(report.summary.losses)} tone="danger" />
          <SummaryStat label="Battles" value={formatNumber(report.summary.totalBattles)} />
          <SummaryStat label="Avg Turns" value={report.summary.avgTurns.toFixed(1)} />
        </div>
      </section>

      <div className="bl-detail-tabs" role="tablist" aria-label="Report detail tabs">
        {reportTabs.map((tab) => (
          <button
            aria-controls={`report-tabpanel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            className={`bl-detail-tab ${activeTab === tab.id ? 'is-active' : ''}`}
            id={`report-tab-${tab.id}`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={handleTabKeyDown}
            role="tab"
            tabIndex={activeTab === tab.id ? 0 : -1}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        aria-labelledby={activeTabId}
        className="bl-detail-tab-body"
        id={activeTabPanelId}
        key={activeTab}
        role="tabpanel"
        tabIndex={0}
      >
        {activeTab === 'overview' ? <OverviewTab report={report} /> : null}
        {activeTab === 'threats' ? <ThreatsTab report={report} threats={sortedThreats} /> : null}
        {activeTab === 'leads' ? <LeadsTab leads={sortedLeads} /> : null}
        {activeTab === 'cores' ? <CoresTab cores={sortedCores} /> : null}
        {activeTab === 'coverage' ? (
          <CoverageTab memberNames={coverageMembers} report={report} />
        ) : null}
      </div>
    </section>
  )
}

function OverviewTab({ report }: { report: SimulationReport }) {
  return (
    <div className="bl-detail-overview-grid">
      <section className="bl-detail-panel bl-detail-narrative" aria-label="Overview">
        <h3>Overview</h3>
        <p className="bl-detail-headline">{report.overview.headline}</p>
        {report.overview.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <div className="bl-detail-takeaways">
          {report.overview.keyTakeaways.map((takeaway) => (
            <span key={takeaway}>{takeaway}</span>
          ))}
        </div>
      </section>

      <section className="bl-detail-panel" aria-label="Win Rate by Archetype">
        <div className="bl-detail-panel-heading">
          <h3>Win Rate by Archetype</h3>
          <span>Best to worst</span>
        </div>
        <div className="bl-archetype-bars">
          {report.archetypeWinRates.map((row, index) => (
            <MetricBarRow
              detail={row.notes}
              key={row.archetypeId}
              label={row.archetypeName}
              tone="win"
              value={row.winRate}
              valueLabel={`${formatPercent(row.winRate)}%`}
              index={index}
            />
          ))}
        </div>
      </section>

      <section className="bl-detail-panel" aria-label="Weaknesses">
        <div className="bl-detail-panel-heading">
          <h3>Weaknesses</h3>
          <span>Watch these lines</span>
        </div>
        <CalloutList items={report.weaknesses} />
      </section>

      <section className="bl-detail-panel" aria-label="Strategy Tips">
        <div className="bl-detail-panel-heading">
          <h3>Strategy Tips</h3>
          <span>First-pass guidance</span>
        </div>
        <CalloutList items={report.strategyTips} />
      </section>
    </div>
  )
}

function ThreatsTab({
  report,
  threats,
}: {
  report: SimulationReport
  threats: SimulationReport['threats']
}) {
  return (
    <section className="bl-detail-panel" aria-label="Pokemon threats">
      <div className="bl-detail-panel-heading">
        <h3>Threats</h3>
        <span>Sorted by loss rate</span>
      </div>
      <div className="bl-detail-row-list">
        {threats.map((threat, index) => (
          <article className="bl-detail-data-row" key={threat.id}>
            <div className="bl-detail-row-main">
              <span className="bl-pokemon-chip">{threat.pokemon}</span>
              <span className={`bl-severity-pill is-${threat.severity}`}>{threat.severity}</span>
              <span className="bl-row-muted">{formatNumber(threat.games)} games</span>
            </div>
            <p>{threat.detail}</p>
            <MetricBar
              ariaLabel={`${threat.pokemon} loss rate against ${report.teamName}`}
              index={index}
              tone="danger"
              value={threat.lossRate}
              valueLabel={`${formatPercent(threat.lossRate)}% loss rate`}
            />
          </article>
        ))}
      </div>
    </section>
  )
}

function LeadsTab({ leads }: { leads: SimulationReport['leads'] }) {
  return (
    <section className="bl-detail-panel" aria-label="Lead pairs">
      <div className="bl-detail-panel-heading">
        <h3>Leads</h3>
        <span>Sorted by win rate</span>
      </div>
      <div className="bl-detail-row-list">
        {leads.map((lead, index) => (
          <article className="bl-detail-data-row" key={lead.id}>
            <div className="bl-detail-row-main">
              <PokemonChipRow pokemon={lead.pokemon} />
              <span className="bl-row-muted">{formatPercent(lead.usagePercent)}% usage</span>
            </div>
            <p>{lead.notes}</p>
            <MetricBar
              ariaLabel={`${lead.pokemon.join(' and ')} lead win rate`}
              index={index}
              tone="win"
              value={lead.winRate}
              valueLabel={`${formatPercent(lead.winRate)}% win rate`}
            />
          </article>
        ))}
      </div>
    </section>
  )
}

function CoresTab({ cores }: { cores: SimulationReport['cores'] }) {
  return (
    <section className="bl-detail-panel" aria-label="Four Pokemon cores">
      <div className="bl-detail-panel-heading">
        <h3>Cores</h3>
        <span>Exact four-Pokemon groups</span>
      </div>
      <div className="bl-detail-row-list">
        {cores.map((core, index) => (
          <article className="bl-detail-data-row" key={core.id}>
            <div className="bl-detail-row-main">
              <PokemonChipRow pokemon={core.pokemon} />
            </div>
            <p>{core.notes}</p>
            <MetricBar
              ariaLabel={`${core.pokemon.join(', ')} core win rate`}
              index={index}
              tone="win"
              value={core.winRate}
              valueLabel={`${formatPercent(core.winRate)}% win rate`}
            />
          </article>
        ))}
      </div>
    </section>
  )
}

function CoverageTab({
  memberNames,
  report,
}: {
  memberNames: string[]
  report: SimulationReport
}) {
  return (
    <section className="bl-detail-panel" aria-label="Coverage strength heatmap">
      <div className="bl-detail-panel-heading">
        <h3>Coverage</h3>
        <span>Strength score, 0-100</span>
      </div>
      <div className="bl-coverage-copy">
        Higher scores indicate stronger offensive coverage contribution in this sample data.
      </div>
      <div className="bl-coverage-table-wrap">
        <table className="bl-coverage-table">
          <caption>Type-by-team-member offensive coverage strength heatmap</caption>
          <thead>
            <tr>
              <th scope="col">Type</th>
              <th scope="col">Aggregate</th>
              {memberNames.map((pokemon) => (
                <th key={pokemon} scope="col">
                  {pokemon}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.coverage.map((coverage) => (
              <tr key={coverage.type}>
                <th scope="row">
                  <span className="bl-type-pill">{coverage.type}</span>
                  <span className="bl-coverage-note">{coverage.notes}</span>
                </th>
                <td>
                  <CoverageCell
                    label={`${coverage.type} aggregate coverage strength`}
                    score={coverage.score}
                  />
                </td>
                {memberNames.map((pokemon) => {
                  const member = coverage.members.find((candidate) => candidate.pokemon === pokemon)

                  return (
                    <td key={`${coverage.type}-${pokemon}`}>
                      <CoverageCell
                        label={`${pokemon} coverage strength into ${coverage.type}`}
                        score={member?.score}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function PokemonChipRow({ pokemon }: { pokemon: readonly string[] }) {
  return (
    <span className="bl-pokemon-chip-row">
      {pokemon.map((name) => (
        <span className="bl-pokemon-chip" key={name}>
          {name}
        </span>
      ))}
    </span>
  )
}

function MetricBarRow({
  detail,
  index,
  label,
  tone,
  value,
  valueLabel,
}: {
  detail: string
  index: number
  label: string
  tone: 'danger' | 'win'
  value: number
  valueLabel: string
}) {
  return (
    <div className="bl-archetype-row">
      <span className="bl-archetype-label">{label}</span>
      <MetricBar ariaLabel={`${label} ${valueLabel}`} index={index} tone={tone} value={value} />
      <span className="bl-archetype-value">{valueLabel}</span>
      <span className="bl-archetype-note">{detail}</span>
    </div>
  )
}

function MetricBar({
  ariaLabel,
  index,
  tone,
  value,
  valueLabel,
}: {
  ariaLabel: string
  index: number
  tone: 'danger' | 'win'
  value: number
  valueLabel?: string
}) {
  return (
    <span
      aria-label={ariaLabel}
      className={`bl-metric-meter ${valueLabel ? 'has-value' : ''}`}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clampPercent(value))}
    >
      <span className={`bl-metric-track is-${tone}`}>
        <span
          className="bl-metric-fill"
          style={
            {
              '--bar-width': `${Math.max(4, clampPercent(value))}%`,
              '--bar-delay': `${index * 70}ms`,
            } as CSSProperties
          }
        />
      </span>
      {valueLabel ? <span className="bl-metric-value">{valueLabel}</span> : null}
    </span>
  )
}

function CoverageCell({ label, score }: { label: string; score?: number }) {
  if (score === undefined) {
    return <span className="bl-coverage-empty">-</span>
  }

  return (
    <span
      aria-label={`${label}: ${score} out of 100`}
      className="bl-coverage-cell"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
      style={{
        background: strengthBackground(score),
        color: score >= 72 ? '#ffffff' : undefined,
      }}
    >
      {score}
    </span>
  )
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'good' | 'danger'
}) {
  return (
    <span className={`bl-detail-stat ${tone ? `is-${tone}` : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </span>
  )
}

function CalloutList({ items }: { items: ReportCallout[] }) {
  return (
    <div className="bl-callout-list">
      {items.map((item) => (
        <article className={`bl-callout is-${item.severity}`} key={item.id}>
          <h4>{item.title}</h4>
          <p>{item.detail}</p>
        </article>
      ))}
    </div>
  )
}

function formatGeneratedAt(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en').format(value)
}

function formatPercent(value: number) {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(value, 100))
}

function strengthBackground(score: number) {
  const strength = clampPercent(score) / 100
  const alpha = 0.12 + strength * 0.76
  return `rgba(74, 124, 126, ${alpha.toFixed(2)})`
}

function tierClassName(tier: ReportTier) {
  return `is-${tier.toLowerCase().replace(/[^a-z]+/g, '-')}`
}

export default ReportDetailOverviewView
