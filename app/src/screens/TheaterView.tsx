import { useEffect, useMemo, useRef, useState } from 'react'
import {
  getArchiveRecord,
  getFastestGame,
  theaterArchives,
  totalTheaterGames,
  type TheaterArchive,
  type TheaterGame,
  type TheaterLogEvent,
  type TheaterMon,
} from '../data/theaterArchives'
import '../styles/theater.css'

const SECONDS_PER_TURN = 1.1

const getInitials = (name: string) =>
  name
    .split(/[\s-]+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

function weatherTag(weather: string): string {
  const value = weather.toLowerCase()
  if (value.includes('sand')) return 'Sandstorm'
  if (value.includes('rain')) return 'Rain'
  if (value.includes('sun')) return 'Sun'
  if (value.includes('trick room')) return 'Trick Room'
  return 'Battle'
}

function hpAt(mon: TheaterMon, currentTurn: number): number {
  if (mon.koTurn === null) return mon.hp
  if (currentTurn >= mon.koTurn) return 0
  if (currentTurn === mon.koTurn - 1) return 28
  return 100
}

function hpClass(hp: number): string {
  if (hp <= 0) return 'is-ko'
  if (hp <= 25) return 'is-low'
  if (hp <= 55) return 'is-mid'
  return 'is-high'
}

const logKindLabel: Record<TheaterLogEvent['kind'], string> = {
  weather: 'WTHR',
  move: 'MOVE',
  ko: 'KO',
  swap: 'SWAP',
  status: 'STAT',
  end: 'END',
}

// ---- Shared faux-playback engine (fake data only) ----
function useFauxPlayback(game: TheaterGame) {
  const total = game.turns * SECONDS_PER_TURN
  const turnDur = total / game.turns
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = ((now - last) / 1000) * speed
      last = now
      setT((prev) => {
        const next = prev + dt
        if (next >= total) {
          setPlaying(false)
          return total
        }
        return next
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, speed, total])

  const currentTurn = Math.min(game.turns, Math.max(1, Math.floor(t / turnDur) + 1))
  const seekTurn = (turn: number) => {
    const clamped = Math.max(1, Math.min(game.turns, turn))
    setT(Math.min(total - 0.001, (clamped - 1) * turnDur))
  }

  return { t, total, currentTurn, playing, setPlaying, speed, setSpeed, seekTurn }
}

// ---- Scrubber with per-turn notches + KO markers (snaps to turns) ----
function Scrubber({
  game,
  t,
  total,
  currentTurn,
  onSeekTurn,
  compact,
}: {
  game: TheaterGame
  t: number
  total: number
  currentTurn: number
  onSeekTurn: (turn: number) => void
  compact?: boolean
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const dragging = useRef(false)
  const fraction = total ? Math.min(1, t / total) : 0

  const koTurns = useMemo(
    () =>
      [...game.yourTeam, ...game.theirTeam]
        .map((mon) => mon.koTurn)
        .filter((turn): turn is number => turn !== null),
    [game],
  )

  const seekToClientX = (clientX: number) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    onSeekTurn(Math.max(1, Math.round(frac * game.turns)))
  }

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (dragging.current) seekToClientX(event.clientX)
    }
    const onUp = () => {
      dragging.current = false
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.turns])

  return (
    <div
      className={`th-scrubber ${compact ? 'is-compact' : ''}`}
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label="Replay turn"
      aria-valuemin={1}
      aria-valuemax={game.turns}
      aria-valuenow={currentTurn}
      onPointerDown={(event) => {
        dragging.current = true
        seekToClientX(event.clientX)
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') onSeekTurn(currentTurn + 1)
        if (event.key === 'ArrowLeft') onSeekTurn(currentTurn - 1)
      }}
    >
      <span className="th-scrubber-track" aria-hidden="true" />
      <span className="th-scrubber-fill" style={{ width: `${fraction * 100}%` }} aria-hidden="true" />
      {Array.from({ length: Math.max(0, game.turns - 1) }).map((_, index) => (
        <span
          key={index}
          className="th-scrubber-notch"
          style={{ left: `${((index + 1) / game.turns) * 100}%` }}
          aria-hidden="true"
        />
      ))}
      {koTurns.map((turn, index) => (
        <span
          key={`ko-${index}`}
          className="th-scrubber-ko"
          style={{ left: `${(turn / game.turns) * 100}%` }}
          aria-hidden="true"
        />
      ))}
      <span className="th-scrubber-thumb" style={{ left: `${fraction * 100}%` }} aria-hidden="true" />
    </div>
  )
}

function BattleSide({
  mons,
  currentTurn,
  label,
}: {
  mons: TheaterMon[]
  currentTurn: number
  label: string
}) {
  return (
    <div className="th-side">
      <div className="th-side-label">{label}</div>
      <div className="th-side-mons">
        {mons.map((mon) => {
          const hp = hpAt(mon, currentTurn)
          const ko = hp <= 0
          return (
            <div className={`th-mon ${ko ? 'is-ko' : ''}`} key={mon.name}>
              <div className="th-mon-avatar" aria-hidden="true">
                {getInitials(mon.name)}
              </div>
              <div className="th-mon-name">{mon.name}</div>
              <div className="th-mon-hp">
                <span className={hpClass(hp)} style={{ width: `${Math.max(0, hp)}%` }} />
              </div>
              <div className="th-mon-hpnum">{ko ? 'KO' : `${Math.round(hp)}/100`}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BattleStage({
  game,
  currentTurn,
  playing,
  onTogglePlay,
}: {
  game: TheaterGame
  currentTurn: number
  playing: boolean
  onTogglePlay: () => void
}) {
  return (
    <div className="th-stage">
      <div className="th-weather">
        <span className="th-weather-dot" aria-hidden="true" />
        {weatherTag(game.weather)} · Turn {currentTurn}
      </div>

      <BattleSide mons={game.theirTeam} currentTurn={currentTurn} label="Opponent" />

      <button
        className="th-stage-play"
        type="button"
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={onTogglePlay}
      >
        {playing ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <BattleSide mons={game.yourTeam} currentTurn={currentTurn} label="Your team" />
    </div>
  )
}

function BattleLog({ game, currentTurn }: { game: TheaterGame; currentTurn: number }) {
  const activeRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [currentTurn])

  return (
    <div className="th-log" aria-label="Battle log">
      <header className="th-log-head">
        <strong>Battle log</strong>
        <span>
          Turn {currentTurn} of {game.turns}
        </span>
      </header>
      <div className="th-log-list">
        {game.log.map((event, index) => {
          const isPast = event.turn <= currentTurn
          const isCurrent = event.turn === currentTurn
          return (
            <div
              key={index}
              ref={isCurrent ? activeRef : null}
              className={`th-log-row ${isPast ? 'is-past' : 'is-future'} ${isCurrent ? 'is-current' : ''}`}
            >
              <span className="th-log-turn">T{event.turn}</span>
              <span className={`th-log-kind k-${event.kind}`}>{logKindLabel[event.kind]}</span>
              <span className="th-log-text">{event.text}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ResultsCard({ archive, game }: { archive: TheaterArchive; game: TheaterGame }) {
  const kosScored = game.theirTeam.filter((mon) => mon.koTurn !== null).length
  const kosReceived = game.yourTeam.filter((mon) => mon.koTurn !== null).length
  const isWin = game.result === 'win'

  return (
    <div className="th-results">
      <div className="th-results-head">
        <strong>
          {archive.team} <span>vs</span> {game.opponent}
        </strong>
        <span>
          {archive.format} · {game.runtime} · {archive.tag}
        </span>
      </div>
      <div className="th-results-grid">
        <div>
          <span>Winner</span>
          <strong className={isWin ? 'is-win' : 'is-loss'}>{isWin ? 'Your team' : 'Opponent'}</strong>
        </div>
        <div>
          <span>Score</span>
          <strong>{game.score}</strong>
        </div>
        <div>
          <span>Turns</span>
          <strong>{game.turns}</strong>
        </div>
        <div>
          <span>Runtime</span>
          <strong>{game.runtime}</strong>
        </div>
        <div>
          <span>KOs scored</span>
          <strong>{kosScored}</strong>
        </div>
        <div>
          <span>KOs received</span>
          <strong>{kosReceived}</strong>
        </div>
      </div>
    </div>
  )
}

// ---- Now Previewing mini-player (fastest game across all archives) ----
function MiniPlayer({ archive, game }: { archive: TheaterArchive; game: TheaterGame }) {
  const { t, total, currentTurn, playing, setPlaying, seekTurn } = useFauxPlayback(game)
  const isWin = game.result === 'win'

  return (
    <section className="th-mini" aria-label="Now previewing fastest replay">
      <header className="th-mini-head">
        <span className="eyebrow">Fastest win · all archives</span>
        <h2>
          {archive.team} <span>vs</span> {game.opponent}
        </h2>
        <span className={`replay-result ${isWin ? 'is-win' : 'is-loss'}`}>
          {isWin ? 'Victory' : 'Defeat'} {game.score} · {game.turns} turns
        </span>
      </header>

      <div className="th-mini-stage">
        <BattleSide mons={game.theirTeam} currentTurn={currentTurn} label="Opponent" />
        <div className="th-mini-vs" aria-hidden="true">
          vs
        </div>
        <BattleSide mons={game.yourTeam} currentTurn={currentTurn} label="Your team" />
      </div>

      <div className="th-mini-controls">
        <button
          className="th-ctrl is-play"
          type="button"
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <Scrubber game={game} t={t} total={total} currentTurn={currentTurn} onSeekTurn={seekTurn} compact />
        <span className="th-mini-turn">
          {currentTurn}/{game.turns}
        </span>
      </div>
    </section>
  )
}

// ---- Archive card (library) ----
function ArchiveCard({
  archive,
  active,
  onSelect,
  onEnter,
}: {
  archive: TheaterArchive
  active: boolean
  onSelect: () => void
  onEnter: () => void
}) {
  const record = getArchiveRecord(archive)
  const isWin = record.wins >= record.losses
  const fastest = archive.games.reduce(
    (best, game) => (game.result === 'win' && game.turns < best ? game.turns : best),
    Infinity,
  )
  const yourTeam = archive.games[0]?.yourTeam ?? []

  return (
    <div
      className={`replay-card ${active ? 'is-active' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={active}
      onClick={onSelect}
      onDoubleClick={onEnter}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onEnter()
        if (event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
    >
      <span className={`replay-thumb ${isWin ? 'is-win' : 'is-loss'}`} aria-hidden="true">
        <span className="replay-team-strip">
          {yourTeam.map((mon) => (
            <span className="replay-chip" key={mon.name} title={mon.name}>
              {getInitials(mon.name)}
            </span>
          ))}
        </span>
        <span className="replay-games-badge">{archive.games.length} games</span>
      </span>

      <span className="replay-body">
        <span className="replay-card-top">
          <span className="replay-title">
            {archive.team} <span className="replay-vs">vs</span> {archive.pool}
          </span>
          <span className="replay-card-badges">
            <span className="replay-sample-tag">Sample</span>
            <span className={`replay-result ${isWin ? 'is-win' : 'is-loss'}`}>
              {record.wins}-{record.losses}
            </span>
          </span>
        </span>
        <span className="replay-notes">
          {archive.games.length} games simulated{Number.isFinite(fastest) ? ` · fastest win in ${fastest} turns` : ''}.
        </span>
        <span className="replay-meta">
          <span>{archive.format}</span>
          <span>{archive.tag}</span>
          <span>{archive.date}</span>
          <button
            type="button"
            className="replay-enter"
            onClick={(event) => {
              event.stopPropagation()
              onEnter()
            }}
          >
            Enter archive →
          </button>
        </span>
      </span>
    </div>
  )
}

// ---- Library view ----
function TheaterLibrary({
  selectedId,
  onSelect,
  onEnter,
}: {
  selectedId: string | null
  onSelect: (id: string) => void
  onEnter: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const best = useMemo(() => getFastestGame(), [])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return theaterArchives
    return theaterArchives.filter(
      (archive) =>
        archive.team.toLowerCase().includes(term) ||
        archive.pool.toLowerCase().includes(term) ||
        archive.tag.toLowerCase().includes(term),
    )
  }, [query])

  return (
    <section className="theater-shell" aria-label="Theater replay workspace">
      <p className="theater-note">
        Sample archives &mdash; a local replay preview built on fabricated battle data. Real replay
        decoding and shared replay codes are still future work. Replays stay on your PC.
      </p>

      <div className="theater-workspace">
        <div className="theater-library">
          <div className="theater-toolbar" aria-label="Replay archive tools">
            <span className="theater-pill">
              <span className="theater-pill-dot" aria-hidden="true" />
              <strong>{filtered.length}</strong>
              archives
            </span>
            <span className="theater-pill">
              Total games
              <strong>{totalTheaterGames}</strong>
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
                placeholder="Search archives…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search archives"
              />
            </label>
          </div>

          <div className="theater-list" aria-label="Saved archives">
            {filtered.length === 0 ? (
              <div className="theater-empty-list">
                <strong>No archives match your search.</strong>
                <span>Try a team name, pool, or tag.</span>
              </div>
            ) : (
              filtered.map((archive) => (
                <ArchiveCard
                  key={archive.id}
                  archive={archive}
                  active={archive.id === selectedId}
                  onSelect={() => onSelect(archive.id)}
                  onEnter={() => onEnter(archive.id)}
                />
              ))
            )}
          </div>
        </div>

        <aside className="theater-rail" aria-label="Fastest replay preview">
          {best ? (
            <MiniPlayer archive={best.archive} game={best.game} />
          ) : (
            <section className="th-mini">
              <p>No replays yet.</p>
            </section>
          )}
          <p className="th-mini-hint">
            Double-click an archive or use <strong>Enter archive</strong> to watch every game.
          </p>
        </aside>
      </div>
    </section>
  )
}

// ---- Archive view (full player) ----
function ArchivePlayer({
  archive,
  game,
  logOpen,
  onToggleLog,
  focus,
  onToggleFocus,
}: {
  archive: TheaterArchive
  game: TheaterGame
  logOpen: boolean
  onToggleLog: () => void
  focus: boolean
  onToggleFocus: () => void
}) {
  const { t, total, currentTurn, playing, setPlaying, speed, setSpeed, seekTurn } = useFauxPlayback(game)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return
      if (event.key === ' ') {
        event.preventDefault()
        setPlaying((prev) => !prev)
      } else if (event.key === 'ArrowRight') {
        seekTurn(currentTurn + 1)
      } else if (event.key === 'ArrowLeft') {
        seekTurn(currentTurn - 1)
      } else if (event.key === 'f' || event.key === 'F') {
        onToggleFocus()
      } else if (event.key === 'l' || event.key === 'L') {
        onToggleLog()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentTurn, seekTurn, setPlaying, onToggleFocus, onToggleLog])

  const speeds = [0.5, 1, 2]

  return (
    <>
      <div className="th-player-area">
        <div className="th-player">
          <BattleStage
            game={game}
            currentTurn={currentTurn}
            playing={playing}
            onTogglePlay={() => setPlaying(!playing)}
          />

          <div className="th-controls">
            <button
              className="th-ctrl is-play"
              type="button"
              aria-label={playing ? 'Pause' : 'Play'}
              onClick={() => setPlaying(!playing)}
            >
              {playing ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button className="th-ctrl" type="button" aria-label="Previous turn" onClick={() => seekTurn(currentTurn - 1)}>
              ‹‹
            </button>
            <button className="th-ctrl" type="button" aria-label="Next turn" onClick={() => seekTurn(currentTurn + 1)}>
              ››
            </button>

            <Scrubber game={game} t={t} total={total} currentTurn={currentTurn} onSeekTurn={seekTurn} />

            <span className="th-time">
              Turn {currentTurn} / {game.turns}
            </span>
            <span className="th-focus-sample-pill">Sample data</span>

            <button
              className="th-ctrl th-speed"
              type="button"
              aria-label="Playback speed"
              onClick={() => setSpeed(speeds[(speeds.indexOf(speed) + 1) % speeds.length])}
            >
              {speed}×
            </button>
            <button
              className={`th-ctrl ${logOpen ? 'is-on' : ''}`}
              type="button"
              aria-label="Toggle battle log"
              onClick={onToggleLog}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 4h14v16H5z" />
                <path d="M8 8h8M8 12h8M8 16h5" />
              </svg>
            </button>
            <button
              className={`th-ctrl ${focus ? 'is-on' : ''}`}
              type="button"
              aria-label="Toggle focus mode"
              onClick={onToggleFocus}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
              </svg>
            </button>
          </div>
        </div>

        {!focus ? <ResultsCard archive={archive} game={game} /> : null}
      </div>

      {logOpen && !focus ? <BattleLog game={game} currentTurn={currentTurn} /> : null}
    </>
  )
}

function TheaterArchiveView({ archive, onBack }: { archive: TheaterArchive; onBack: () => void }) {
  const [gameId, setGameId] = useState(archive.games[0]?.id ?? '')
  const [logOpen, setLogOpen] = useState(true)
  const [focus, setFocus] = useState(false)
  const game = archive.games.find((candidate) => candidate.id === gameId) ?? archive.games[0]

  return (
    <section className={`theater-archive ${focus ? 'is-focus' : ''}`} aria-label={`${archive.team} archive`}>
      {!focus ? (
        <div className="th-topbar">
          <button className="th-back" type="button" onClick={onBack}>
            ‹ All archives
          </button>
          <div className="th-topbar-title">
            <strong>
              {archive.team} <span>vs</span> {archive.pool}
            </strong>
            <span>
              {archive.format} · {archive.games.length} games · {archive.tag} · {archive.date}
            </span>
          </div>
          <span className="th-sample-pill">Sample data</span>
        </div>
      ) : null}

      <div className={`th-archive-body ${logOpen && !focus ? 'log-open' : ''}`}>
        {!focus ? (
          <aside className="th-games" aria-label="Games in this simulation">
            <header>
              Games <span>{archive.games.length}</span>
            </header>
            <div className="th-games-list">
              {archive.games.map((candidate, index) => {
                const isWin = candidate.result === 'win'
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    className={`th-game-row ${candidate.id === game.id ? 'is-active' : ''}`}
                    onClick={() => setGameId(candidate.id)}
                  >
                    <span className="th-game-index">G{index + 1}</span>
                    <span className="th-game-main">
                      <span className="th-game-opp">vs {candidate.opponent}</span>
                      <span className="th-game-meta">
                        {candidate.turns} turns · {candidate.runtime}
                      </span>
                    </span>
                    <span className={`th-game-result ${isWin ? 'is-win' : 'is-loss'}`}>{candidate.score}</span>
                  </button>
                )
              })}
            </div>
          </aside>
        ) : null}

        <ArchivePlayer
          key={game.id}
          archive={archive}
          game={game}
          logOpen={logOpen}
          onToggleLog={() => setLogOpen((prev) => !prev)}
          focus={focus}
          onToggleFocus={() => setFocus((prev) => !prev)}
        />
      </div>
    </section>
  )
}

export function TheaterView() {
  const [selectedId, setSelectedId] = useState<string | null>(theaterArchives[0]?.id ?? null)
  const [archiveId, setArchiveId] = useState<string | null>(null)

  const openArchive = theaterArchives.find((archive) => archive.id === archiveId) ?? null

  if (openArchive) {
    return <TheaterArchiveView archive={openArchive} onBack={() => setArchiveId(null)} />
  }

  return (
    <TheaterLibrary selectedId={selectedId} onSelect={setSelectedId} onEnter={setArchiveId} />
  )
}

export default TheaterView
