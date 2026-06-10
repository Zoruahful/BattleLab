import '../styles/theater.css'

const theaterStats = [
  { label: 'Local replays', value: '0' },
  { label: 'Imported codes', value: '0' },
  { label: 'Shared exports', value: '0' },
]

const futureSlots = [
  {
    title: 'Replay library',
    detail: 'Saved battles from local simulations will appear here after the runtime exists.',
  },
  {
    title: 'Import export code',
    detail: 'Future shared replay codes will be decoded as data before any battle is shown.',
  },
  {
    title: 'Export selected replay',
    detail: 'Export-code generation remains pending until the replay event format is defined.',
  },
]

export function TheaterView() {
  return (
    <section className="theater-shell" aria-label="Theater replay workspace">
      <div className="theater-toolbar" aria-label="Theater status">
        {theaterStats.map((stat) => (
          <span className="theater-stat" key={stat.label}>
            <strong>{stat.value}</strong>
            {stat.label}
          </span>
        ))}
      </div>

      <div className="theater-workspace">
        <section className="theater-stage-card" aria-labelledby="theater-stage-title">
          <div className="theater-stage-empty">
            <span className="theater-stage-mark" aria-hidden="true">
              TL
            </span>
            <div>
              <h2 id="theater-stage-title">No replay selected</h2>
              <p>
                Replay playback isn&rsquo;t available yet. This is a preview of where battles will
                live once the local replay runtime exists.
              </p>
            </div>
          </div>
        </section>

        <aside className="theater-rail" aria-label="Replay library">
          <header>
            <span className="eyebrow">Replay Library</span>
            <h2>Saved replays</h2>
          </header>

          <div className="theater-empty-list">
            <strong>No replays yet</strong>
            <span>
              Saved battles will appear here. Once simulations are running, you&rsquo;ll be able to
              watch them back in BattleLab.
            </span>
          </div>

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
              Replay import is coming soon. Imported codes will be decoded and validated as data
              only.
            </span>
          </div>
        </aside>
      </div>

      <div className="theater-future-grid">
        {futureSlots.map((slot) => (
          <article className="theater-future-card" key={slot.title}>
            <h3>{slot.title}</h3>
            <p>{slot.detail}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export default TheaterView
