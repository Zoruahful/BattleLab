import type { FormEvent } from 'react'
import type {
  BattleFormat,
  OpponentPool,
  PerformanceProfile,
  SimulationSettings,
} from '../types'
import '../styles/simulation-settings-panel.css'

export type SimulationSettingsPanelProps = {
  open?: boolean
  settings: SimulationSettings
  opponentPools: OpponentPool[]
  performanceProfiles: PerformanceProfile[]
  onChange: (settings: SimulationSettings) => void
  onClose?: () => void
  onStart?: (settings: SimulationSettings) => void
}

const formatOptions: BattleFormat[] = ['vgc-regulation-h', 'vgc-regulation-g', 'custom']

const formatLabels: Record<BattleFormat, string> = {
  'vgc-regulation-h': 'VGC Regulation H',
  'vgc-regulation-g': 'VGC Regulation G',
  custom: 'Custom format',
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function parseNumber(value: string, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function getSelectedProfile(
  profiles: PerformanceProfile[],
  profileId: string,
) {
  return profiles.find((profile) => profile.id === profileId) ?? profiles[0]
}

function getSelectedPool(pools: OpponentPool[], poolId: string) {
  return pools.find((pool) => pool.id === poolId) ?? pools[0]
}

export function SimulationSettingsPanel({
  open = true,
  settings,
  opponentPools,
  performanceProfiles,
  onChange,
  onClose,
  onStart,
}: SimulationSettingsPanelProps) {
  const selectedPool = getSelectedPool(opponentPools, settings.opponentPoolId)
  const selectedProfile = getSelectedProfile(performanceProfiles, settings.performanceProfileId)
  const maxWorkerCount = selectedProfile?.maxWorkerCount ?? Math.max(settings.workerCount, 1)
  const workerCount = clampNumber(settings.workerCount, 1, maxWorkerCount)
  const teamSize = clampNumber(settings.teamSize, 1, 6)
  const bringCount = clampNumber(settings.bringCount, 1, teamSize)

  const updateSettings = (updates: Partial<SimulationSettings>) => {
    onChange({
      ...settings,
      ...updates,
    })
  }

  const handleTeamSizeChange = (value: string) => {
    const nextTeamSize = clampNumber(parseNumber(value, teamSize), 1, 6)

    updateSettings({
      teamSize: nextTeamSize,
      bringCount: clampNumber(settings.bringCount, 1, nextTeamSize),
    })
  }

  const handleProfileChange = (profileId: string) => {
    const nextProfile = getSelectedProfile(performanceProfiles, profileId)

    updateSettings({
      performanceProfileId: profileId,
      workerCount: nextProfile
        ? clampNumber(nextProfile.recommendedWorkerCount, 1, nextProfile.maxWorkerCount)
        : settings.workerCount,
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onStart?.({
      ...settings,
      workerCount,
      teamSize,
      bringCount,
    })
  }

  return (
    <aside
      className={`bl-sim-panel side-panel wide ${open ? 'is-open open' : ''}`}
      aria-labelledby="simulation-settings-title"
      aria-hidden={!open}
      data-open={open}
    >
      <form className="bl-sim-form" onSubmit={handleSubmit}>
        <header className="bl-sim-header ph">
          <div>
            <span className="eyebrow">Simulation Settings</span>
            <h2 id="simulation-settings-title">Prepare simulation</h2>
            <p>Review the local run setup before starting.</p>
          </div>
          <button className="bl-sim-icon-button" type="button" aria-label="Close" onClick={onClose}>
            x
          </button>
        </header>

        <div className="bl-sim-body pb">
          <section className="bl-sim-summary" aria-label="Selected simulation summary">
            <div>
              <span>Format</span>
              <strong>{formatLabels[settings.format]}</strong>
            </div>
            <div>
              <span>Battles</span>
              <strong>{settings.battleCount.toLocaleString('en')}</strong>
            </div>
            <div>
              <span>Workers</span>
              <strong>{workerCount}</strong>
            </div>
          </section>

          <section className="bl-sim-section">
            <div className="bl-sim-section-heading">
              <h3>Battle setup</h3>
              <span>Frontend-only</span>
            </div>

            <div className="bl-sim-grid-2">
              <label className="bl-sim-field">
                <span>Format</span>
                <select
                  value={settings.format}
                  onChange={(event) => updateSettings({ format: event.target.value as BattleFormat })}
                >
                  {formatOptions.map((format) => (
                    <option value={format} key={format}>
                      {formatLabels[format]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="bl-sim-field">
                <span>Battle count</span>
                <input
                  type="number"
                  min="100"
                  max="5000"
                  step="50"
                  value={settings.battleCount}
                  onChange={(event) =>
                    updateSettings({
                      battleCount: clampNumber(parseNumber(event.target.value, settings.battleCount), 100, 5000),
                    })
                  }
                />
              </label>

              <label className="bl-sim-field">
                <span>Team size</span>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={teamSize}
                  onChange={(event) => handleTeamSizeChange(event.target.value)}
                />
              </label>

              <label className="bl-sim-field">
                <span>Bring count</span>
                <input
                  type="number"
                  min="1"
                  max={teamSize}
                  value={bringCount}
                  onChange={(event) =>
                    updateSettings({
                      bringCount: clampNumber(parseNumber(event.target.value, bringCount), 1, teamSize),
                    })
                  }
                />
              </label>

              <label className="bl-sim-field bl-sim-field-wide">
                <span>Random seed</span>
                <input
                  value={settings.randomSeed ?? ''}
                  placeholder="Auto"
                  onChange={(event) =>
                    updateSettings({
                      randomSeed: event.target.value.trim() ? event.target.value : undefined,
                    })
                  }
                />
              </label>
            </div>
          </section>

          <section className="bl-sim-section">
            <div className="bl-sim-section-heading">
              <h3>Opponent pool</h3>
              <span>{selectedPool?.tags.join(' / ') ?? 'No pool selected'}</span>
            </div>

            <label className="bl-sim-field">
              <span>Pool</span>
              <select
                value={settings.opponentPoolId}
                onChange={(event) => updateSettings({ opponentPoolId: event.target.value })}
              >
                {opponentPools.map((pool) => (
                  <option value={pool.id} key={pool.id}>
                    {pool.name}
                  </option>
                ))}
              </select>
            </label>

            {selectedPool ? (
              <div className="bl-sim-pool-card">
                <p>{selectedPool.description}</p>
                <div className="bl-sim-archetypes">
                  {selectedPool.archetypes.map((archetype) => (
                    <span key={archetype.id}>
                      {archetype.name} {archetype.sharePercent}%
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="bl-sim-section">
            <div className="bl-sim-section-heading">
              <h3>Performance</h3>
              <span>{selectedProfile ? `${selectedProfile.targetCpuPercent}% target CPU` : 'Local only'}</span>
            </div>

            <label className="bl-sim-field">
              <span>Profile</span>
              <select value={settings.performanceProfileId} onChange={(event) => handleProfileChange(event.target.value)}>
                {performanceProfiles.map((profile) => (
                  <option value={profile.id} key={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </label>

            {selectedProfile ? (
              <div className="bl-sim-profile-card">
                <strong>{selectedProfile.name}</strong>
                <p>{selectedProfile.description}</p>
                <span>
                  Recommended {selectedProfile.recommendedWorkerCount} workers / max {selectedProfile.maxWorkerCount}
                </span>
              </div>
            ) : null}

            <label className="bl-sim-range">
              <span>
                <strong>Worker count</strong>
                {workerCount}
              </span>
              <input
                type="range"
                min="1"
                max={maxWorkerCount}
                value={workerCount}
                onChange={(event) =>
                  updateSettings({
                    workerCount: clampNumber(parseNumber(event.target.value, workerCount), 1, maxWorkerCount),
                  })
                }
              />
            </label>

            <label className="bl-sim-check">
              <input
                type="checkbox"
                checked={settings.openTeamSheets}
                onChange={(event) => updateSettings({ openTeamSheets: event.target.checked })}
              />
              <span>
                <strong>Open team sheets</strong>
                <em>Use visible sets in this first-pass local run setup.</em>
              </span>
            </label>
          </section>

          <section className="bl-sim-note">
            <strong>No backend run yet</strong>
            <p>
              Start Simulation confirms these settings in the UI only. Showdown, report generation,
              storage, and desktop worker orchestration are intentionally not wired in this checkpoint.
            </p>
          </section>
        </div>

        <footer className="bl-sim-footer pf">
          <button className="secondary-action" type="button" onClick={onClose}>
            Close
          </button>
          <button className="primary-action" type="submit">
            Start Simulation
          </button>
        </footer>
      </form>
    </aside>
  )
}

export default SimulationSettingsPanel
