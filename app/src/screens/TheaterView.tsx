import { useMemo, useState } from 'react'
import '../styles/theater.css'

type ReplayResult = 'win' | 'loss'

type SampleReplay = {
  id: string
  team: string
  opponent: string
  result: ReplayResult
  resultLabel: string
  format: string
  turns: number
  runtime: string
  date: string
  tag: string
  notes: string
  yourTeam: string[]
  theirTeam: string[]
}

const sampleReplays: SampleReplay[] = [
  {
    id: 'rp-001',
    team: 'Sandstorm Hyper Offense',
    opponent: 'Rain Stall',
    result: 'win',
    resultLabel: 'Victory 4-0',
    format: 'Champion Format / Doubles',
    turns: 14,
    runtime: '02:34',
    date: '2d ago',
    tag: 'Tournament finals',
    notes: 'Lead Garchomp + Tyranitar pressured early; Excadrill cleaned late.',
    yourTeam: ['Garchomp', 'Tyranitar', 'Excadrill', 'Rotom-Wash'],
    theirTeam: ['Ferrothorn', 'Rotom-Wash', 'Greninja', 'Gardevoir'],
  },
  {
    id: 'rp-002',
    team: 'Rain Balance',
    opponent: 'Sun Offense',
    result: 'win',
    resultLabel: 'Victory 4-2',
    format: 'Champion Format / Doubles',
    turns: 11,
    runtime: '01:58',
    date: '5d ago',
    tag: 'Ladder run',
    notes: 'Rain stayed active long enough for Greninja to clean.',
    yourTeam: ['Greninja', 'Rotom-Wash', 'Ferrothorn', 'Gardevoir'],
    theirTeam: ['Charizard', 'Heatran', 'Gardevoir', 'Dragonite'],
  },
  {
    id: 'rp-003',
    team: 'Hard Trick Room',
    opponent: 'Hyper Offense',
    result: 'loss',
    resultLabel: 'Defeat 0-3',
    format: 'Standard Format / Doubles',
    turns: 8,
    runtime: '01:12',
    date: '1w ago',
    tag: 'Practice',
    notes: 'Trick Room never went up; speed control denied turn one.',
    yourTeam: ['Metagross', 'Tyranitar', 'Ferrothorn', 'Gardevoir'],
    theirTeam: ['Greninja', 'Dragonite', 'Garchomp', 'Charizard'],
  },
  {
    id: 'rp-004',
    team: 'Sun Balance',
    opponent: 'Trick Room',
    result: 'win',
    resultLabel: 'Victory 3-1',
    format: 'Champion Format / Doubles',
    turns: 12,
    runtime: '02:08',
    date: '2w ago',
    tag: 'Tournament round 4',
    notes: 'Solar Power Charizard out-paced Trick Room after an early KO.',
    yourTeam: ['Charizard', 'Heatran', 'Garchomp', 'Rotom-Wash'],
    theirTeam: ['Metagross', 'Tyranitar', 'Ferrothorn', 'Gardevoir'],
  },
]

const getInitials = (name: string) =>
  name
    .split(/[\s-]+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

const parseRuntime = (runtime: string) => {
  const [minutes, seconds] = runtime.split(':').map((value) => Number(value))
  return (minutes || 0) * 60 + (seconds || 0)
}

const formatTotalRuntime = (replays: SampleReplay[]) => {
  const totalSeconds = replays.reduce((total, replay) => total + parseRuntime(replay.runtime), 0)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

export function TheaterView() {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(sampleReplays[0]?.id ?? null)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) {
      return sampleReplays
    }

    return sampleReplays.filter(
      (replay) =>
        replay.team.toLowerCase().includes(term) ||
        replay.opponent.toLowerCase().includes(term) ||
        replay.tag.toLowerCase().includes(term),
    )
  }, [query])

  const selected = selectedId ? sampleReplays.find((replay) => replay.id === selectedId) ?? null : null

  return (
    <section className="theater-shell" aria-label="Theater replay workspace">
      <p className="theater-note">
        Sample library &mdash; replay playback isn&rsquo;t wired yet. These placeholder battles show how
        saved replays will look. Replays stay on your PC.
      </p>

      <div className="theater-workspace">
        <div className="theater-library">
          <div className="theater-toolbar" aria-label="Replay library tools">
            <span className="theater-pill">
              <span className="theater-pill-dot" aria-hidden="true" />
              <strong>{filtered.length}</strong>
              replays
            </span>
            <span className="theater-pill">
              Total runtime
              <strong>{formatTotalRuntime(sampleReplays)}</strong>
            </span>

            <span className="theater-toolbar-spacer" aria-hidden="true" />

            <label className="theater-search">
              <span className="theater-search-icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search replays…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search replays"
              />
            </label>
          </div>

          <div className="theater-list" aria-label="Saved replays">
            {filtered.length === 0 ? (
              <div className="theater-empty-list">
                <strong>No replays match your search.</strong>
                <span>Try a team name, opponent, or tag.</span>
              </div>
            ) : (
              filtered.map((replay) => (
                <ReplayCard
                  key={replay.id}
                  replay={replay}
                  active={replay.id === selectedId}
                  onSelect={() => setSelectedId(replay.id)}
                />
              ))
            )}
          </div>
        </div>

        <aside className="theater-rail" aria-label="Replay preview">
          <StagePreview replay={selected} />

          <div className="theater-import" aria-label="Import a replay code">
            <span className="theater-import-label">Have a replay code?</span>
            <div className="theater-import-row">
              <input
                className="theater-import-input"
                type="text"
                placeholder="Paste a code a friend shared&hellip;"
                disabled
                aria-disabled="true"
              />
              <button className="theater-import-btn" type="button" disabled aria-disabled="true">
                Import
              </button>
            </div>
            <span className="theater-import-hint">
              Replay import is coming soon. Imported codes will be decoded and validated as data only.
            </span>
          </div>
        </aside>
      </div>
    </section>
  )
}

function ReplayCard({
  replay,
  active,
  onSelect,
}: {
  replay: SampleReplay
  active: boolean
  onSelect: () => void
}) {
  const isWin = replay.result === 'win'

  return (
    <button
      className={`replay-card ${active ? 'is-active' : ''}`}
      type="button"
      aria-pressed={active}
      onClick={onSelect}
    >
      <span className={`replay-thumb ${isWin ? 'is-win' : 'is-loss'}`} aria-hidden="true">
        <span className="replay-thumb-play">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
        <span className="replay-team-strip">
          {replay.yourTeam.map((name) => (
            <span className="replay-chip" key={name} title={name}>
              {getInitials(name)}
            </span>
          ))}
        </span>
        <span className="replay-runtime">{replay.runtime}</span>
      </span>

      <span className="replay-body">
        <span className="replay-card-top">
          <span className="replay-title">
            {replay.team} <span className="replay-vs">vs</span> {replay.opponent}
          </span>
          <span className={`replay-result ${isWin ? 'is-win' : 'is-loss'}`}>{replay.resultLabel}</span>
        </span>
        <span className="replay-notes">{replay.notes}</span>
        <span className="replay-meta">
          <span>
            <strong>{replay.turns}</strong> turns
          </span>
          <span>{replay.format}</span>
          <span>{replay.tag}</span>
          <span>{replay.date}</span>
        </span>
      </span>
    </button>
  )
}

function StagePreview({ replay }: { replay: SampleReplay | null }) {
  if (!replay) {
    return (
      <section className="theater-stage" aria-label="Replay stage">
        <div className="theater-stage-empty">
          <span className="theater-stage-mark" aria-hidden="true">
            TL
          </span>
          <div>
            <h2>No replay selected</h2>
            <p>Choose a replay to preview the matchup here.</p>
          </div>
        </div>
      </section>
    )
  }

  const isWin = replay.result === 'win'

  return (
    <section className="theater-stage" aria-label={`${replay.team} versus ${replay.opponent} preview`}>
      <header className="theater-stage-head">
        <span className="eyebrow">Now previewing</span>
        <h2>
          {replay.team} <span>vs</span> {replay.opponent}
        </h2>
        <span className={`replay-result ${isWin ? 'is-win' : 'is-loss'}`}>{replay.resultLabel}</span>
      </header>

      <div className="theater-stage-matchup">
        <StageSide label="Your team" members={replay.yourTeam} />
        <span className="theater-stage-divider" aria-hidden="true">
          vs
        </span>
        <StageSide label="Opponent" members={replay.theirTeam} />
      </div>

      <div className="theater-transport" role="group" aria-label="Playback controls (coming soon)">
        <button type="button" disabled aria-disabled="true" title="Coming soon">
          ‹‹
        </button>
        <button className="is-play" type="button" disabled aria-disabled="true" title="Coming soon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        <button type="button" disabled aria-disabled="true" title="Coming soon">
          ››
        </button>
        <span className="theater-transport-time">Turn 0 / {replay.turns}</span>
      </div>

      <p className="theater-coming">Playback coming soon. This is a static preview of the saved battle.</p>
    </section>
  )
}

function StageSide({ label, members }: { label: string; members: string[] }) {
  return (
    <div className="theater-stage-side">
      <span className="theater-stage-side-label">{label}</span>
      <div className="theater-stage-team">
        {members.map((name) => (
          <span className="theater-stage-chip" key={name} title={name}>
            {getInitials(name)}
          </span>
        ))}
      </div>
    </div>
  )
}

export default TheaterView
