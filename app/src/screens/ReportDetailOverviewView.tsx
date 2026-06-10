import type { CSSProperties } from 'react'
import type { ReportCallout, ReportTier, SimulationReport } from '../types'
import '../styles/report-detail-overview.css'

export type ReportDetailOverviewViewProps = {
  report: SimulationReport
  onBack: () => void
}

const reportTabs = ['Overview', 'Threats', 'Leads', 'Cores', 'Coverage']

export function ReportDetailOverviewView({ report, onBack }: ReportDetailOverviewViewProps) {
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

      <nav className="bl-detail-tabs" aria-label="Report detail tabs">
        {reportTabs.map((tab) => (
          <button
            className={`bl-detail-tab ${tab === 'Overview' ? 'is-active' : ''}`}
            disabled={tab !== 'Overview'}
            key={tab}
            type="button"
          >
            {tab}
          </button>
        ))}
      </nav>

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
              <div className="bl-archetype-row" key={row.archetypeId}>
                <span className="bl-archetype-label">{row.archetypeName}</span>
                <span className="bl-archetype-track">
                  <span
                    className="bl-archetype-fill"
                    style={{
                      '--bar-width': `${Math.max(4, Math.min(row.winRate, 100))}%`,
                      '--bar-delay': `${index * 70}ms`,
                    } as CSSProperties}
                  />
                </span>
                <span className="bl-archetype-value">{row.winRate.toFixed(1)}%</span>
                <span className="bl-archetype-note">{row.notes}</span>
              </div>
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
    </section>
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

function tierClassName(tier: ReportTier) {
  return `is-${tier.toLowerCase().replace(/[^a-z]+/g, '-')}`
}

export default ReportDetailOverviewView
