import { useRef, useState } from 'react'
import { TeamSlotCard } from '../components/TeamSlotCard'
import { detailedSimulationReport, submittedTeam } from '../data'
import { exportShowdownTeam, parseShowdownTeam } from '../utils/showdownTeam'
import type { BattleFormat, SimulationReport, SubmittedTeam } from '../types'
import '../styles/team-builder.css'

export type TeamBuilderViewProps = {
  team?: SubmittedTeam
  report?: SimulationReport
  onSlotSelect?: (slotIndex: number) => void
  onClearTeam?: () => void
  onSlotClear?: (slotIndex: number) => void
  onImportTeam?: (team: SubmittedTeam) => void
}

type IoMode = 'export' | 'import' | null

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
  onImportTeam,
}: TeamBuilderViewProps) {
  const [ioMode, setIoMode] = useState<IoMode>(null)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const exportTextRef = useRef<HTMLTextAreaElement | null>(null)

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

  const exportText = exportShowdownTeam(team)

  const openExport = () => {
    setCopied(false)
    setIoMode('export')
  }

  const openImport = () => {
    setImportText('')
    setImportError(null)
    setIoMode('import')
  }

  const closeIo = () => setIoMode(null)

  const handleCopy = async () => {
    let didCopy = false

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(exportText)
        didCopy = true
      }
    } catch {
      didCopy = false
    }

    if (!didCopy && exportTextRef.current) {
      exportTextRef.current.focus()
      exportTextRef.current.select()
      didCopy = document.execCommand('copy')
    }

    if (didCopy) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } else {
      setCopied(false)
    }
  }

  const handleImport = () => {
    if (!importText.trim()) {
      setImportError('Paste a Showdown team first.')
      return
    }

    const nextTeam = parseShowdownTeam(importText, team)
    const importedCount = nextTeam.slots.filter((slot) => slot.pokemon).length

    if (importedCount === 0) {
      setImportError('No Pokemon found. Check the Showdown format and try again.')
      return
    }

    onImportTeam?.(nextTeam)
    setIoMode(null)
  }

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
        <button className="secondary-action" type="button" onClick={openImport}>
          Import
        </button>
        <button
          className="secondary-action"
          type="button"
          onClick={openExport}
          disabled={filledCount === 0}
        >
          Export
        </button>
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

      {ioMode ? (
        <div className="bl-io-overlay" role="dialog" aria-modal="true" aria-label={`${ioMode} team`}>
          <button className="bl-io-scrim" type="button" aria-label="Close" onClick={closeIo} />
          <div className="bl-io-dialog">
            <header className="bl-io-header">
              <div>
                <span className="eyebrow">{ioMode === 'export' ? 'Export team' : 'Import team'}</span>
                <h3>{ioMode === 'export' ? 'Share as Showdown text' : 'Paste a Showdown team'}</h3>
              </div>
              <button className="bl-io-close" type="button" aria-label="Close" onClick={closeIo}>
                x
              </button>
            </header>

            <p className="bl-io-note">
              {ioMode === 'export'
                ? 'Copy this Pokemon Showdown export and send it to a friend. Format is text only.'
                : 'Paste a Pokemon Showdown team export below to load it into the builder.'}
            </p>

            {ioMode === 'export' ? (
              <textarea className="bl-io-text" readOnly ref={exportTextRef} value={exportText} rows={12} />
            ) : (
              <textarea
                className="bl-io-text"
                value={importText}
                rows={12}
                placeholder={'Garchomp @ Life Orb\nAbility: Rough Skin\nTera Type: Steel\nEVs: 252 Atk / 4 Def / 252 Spe\nJolly Nature\n- Earthquake\n- ...'}
                onChange={(event) => {
                  setImportText(event.target.value)
                  setImportError(null)
                }}
              />
            )}

            {importError ? <p className="bl-io-error">{importError}</p> : null}

            <div className="bl-io-actions">
              <button className="secondary-action" type="button" onClick={closeIo}>
                Close
              </button>
              {ioMode === 'export' ? (
                <button className="primary-action" type="button" onClick={handleCopy}>
                  {copied ? 'Copied' : 'Copy to clipboard'}
                </button>
              ) : (
                <button className="primary-action" type="button" onClick={handleImport}>
                  Import team
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default TeamBuilderView
