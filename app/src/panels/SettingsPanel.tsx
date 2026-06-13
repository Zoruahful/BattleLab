import { useState } from 'react'
import { localBattleLabSettings, performanceProfiles } from '../data'
import type { BattleLabSettings, BattleFormat, PerformanceProfile, StatEditorModePreference } from '../types'
import '../styles/settings-catalog-panels.css'

export type SettingsPanelProps = {
  open?: boolean
  settings?: BattleLabSettings
  profiles?: PerformanceProfile[]
  onClose?: () => void
  onSave?: (settings: BattleLabSettings) => void
}

const formatOptions: Array<{ value: BattleFormat; label: string }> = [
  { value: 'vgc-regulation-h', label: 'VGC Regulation H' },
  { value: 'vgc-regulation-g', label: 'VGC Regulation G' },
  { value: 'custom', label: 'Custom format' },
]

const generationOptions: BattleLabSettings['generationCap'][] = ['Gen 9', 'Gen 8', 'Gen 7', 'Custom']

const statModeOptions: Array<{ value: StatEditorModePreference; label: string }> = [
  { value: 'standard-evs', label: 'Standard EVs' },
  { value: 'champion-points', label: 'Champion points' },
]

export function SettingsPanel({
  open = true,
  settings = localBattleLabSettings,
  profiles = performanceProfiles,
  onClose,
  onSave,
}: SettingsPanelProps) {
  const [draft, setDraft] = useState<BattleLabSettings>(settings)
  const [saveAcknowledged, setSaveAcknowledged] = useState(false)

  const updateDraft = (updates: Partial<BattleLabSettings>) => {
    setDraft((current) => ({
      ...current,
      ...updates,
    }))
  }

  const handleSave = () => {
    if (saveAcknowledged) {
      return
    }

    setSaveAcknowledged(true)
    window.setTimeout(() => {
      onSave?.(draft)
      setSaveAcknowledged(false)
      onClose?.()
    }, 1500)
  }

  return (
    <aside
      className={`bl-settings-panel side-panel ${open ? 'is-open' : ''}`}
      aria-labelledby="battlelab-settings-title"
      aria-hidden={!open}
    >
      <div className="bl-settings-shell">
        <header className="bl-settings-header">
          <div>
            <span className="eyebrow">Settings</span>
            <h2 id="battlelab-settings-title">Preferences</h2>
            <p>Settings apply to your current session. Durable preferences are coming in a later update.</p>
          </div>
          <button className="bl-panel-icon-button" type="button" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </header>

        <div className="bl-settings-body">
          <section className="bl-settings-section">
            <div className="bl-settings-section-heading">
              <h3>Battle defaults</h3>
            </div>

            <div className="bl-settings-grid-2">
              <label className="bl-settings-field">
                <span>Default format</span>
                <select
                  value={draft.defaultFormat}
                  onChange={(event) => updateDraft({ defaultFormat: event.target.value as BattleFormat })}
                >
                  {formatOptions.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="bl-settings-field">
                <span>Generation cap</span>
                <select
                  value={draft.generationCap}
                  onChange={(event) =>
                    updateDraft({ generationCap: event.target.value as BattleLabSettings['generationCap'] })
                  }
                >
                  {generationOptions.map((generation) => (
                    <option value={generation} key={generation}>
                      {generation}
                    </option>
                  ))}
                </select>
                <span className="bl-settings-field-hint">
                  Limits which Pokemon appear in the editor. Takes effect when catalog data is available.
                </span>
              </label>

              <label className="bl-settings-field">
                <span>Stat editor mode</span>
                <select
                  value={draft.statEditorMode}
                  onChange={(event) =>
                    updateDraft({ statEditorMode: event.target.value as StatEditorModePreference })
                  }
                >
                  {statModeOptions.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="bl-settings-field">
                <span>Performance profile</span>
                <select
                  value={draft.defaultPerformanceProfileId}
                  onChange={(event) => updateDraft({ defaultPerformanceProfileId: event.target.value })}
                >
                  {profiles.map((profile) => (
                    <option value={profile.id} key={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
                <span className="bl-settings-field-hint">
                  Controls simulation worker load on your PC. Balanced works for most setups.
                </span>
              </label>
            </div>
          </section>

          <section className="bl-settings-section">
            <div className="bl-settings-section-heading">
              <h3>Workspace</h3>
              <span>Session only</span>
            </div>

            <div className="bl-settings-toggle-list">
              <SettingsToggle
                checked={draft.animationsEnabled}
                description="Use subtle transitions across shell panels and report surfaces."
                label="Animations"
                onChange={(checked) => updateDraft({ animationsEnabled: checked })}
              />
              <SettingsToggle
                checked={draft.autosaveTeams}
                description="Automatically saves your team after each edit. Requires local persistence — coming in a future update."
                label="Autosave teams"
                onChange={(checked) => updateDraft({ autosaveTeams: checked })}
              />
              <SettingsToggle
                checked={draft.checkCatalogUpdatesOnLaunch}
                description="Checks for catalog updates when the app opens. Requires catalog sync — coming in a future update."
                label="Check catalog updates on launch"
                onChange={(checked) => updateDraft({ checkCatalogUpdatesOnLaunch: checked })}
              />
              <SettingsToggle
                checked={draft.diagnosticsEnabled}
                description="Captures local troubleshooting details. Requires diagnostics storage — coming in a future update."
                label="Diagnostic logs"
                onChange={(checked) => updateDraft({ diagnosticsEnabled: checked })}
              />
            </div>
          </section>

          <section className="bl-settings-section">
            <div className="bl-settings-section-heading">
              <h3>Appearance</h3>
            </div>

            <div className="bl-settings-segmented" role="group" aria-label="Theme preference">
              <button
                className={draft.theme === 'light' ? 'active' : ''}
                type="button"
                onClick={() => updateDraft({ theme: 'light' })}
              >
                Light
              </button>
              <button
                className={draft.theme === 'system' ? 'active' : ''}
                type="button"
                onClick={() => updateDraft({ theme: 'system' })}
              >
                System
              </button>
            </div>
            <p className="bl-settings-field-hint" style={{ marginTop: '10px' }}>
              System matches your OS light/dark preference. Dark mode palette is planned — both options currently use the light theme.
            </p>
          </section>

          <section className="bl-settings-note">
            <strong>Session settings</strong>
            <p>
              These settings are not saved between sessions yet. Durable preferences and profile sync are
              planned for a future update.
            </p>
          </section>

          <section className="bl-settings-section">
            <div className="bl-settings-section-heading">
              <h3>About</h3>
              <span>Local build</span>
            </div>

            <div className="bl-settings-about">
              <p>
                <strong>BattleLab</strong> 0.1 &middot; frontend shell
              </p>
              <p>
                An independent, local-first competitive Pokemon team-building and battle-simulation
                tool. Battle legality and simulation results come from Pokemon Showdown. Not
                affiliated with Nintendo, Game Freak, The Pokemon Company, or Pokemon Showdown.
              </p>
            </div>
          </section>
        </div>

        <footer className="bl-settings-footer">
          <button className="secondary-action" type="button" onClick={() => setDraft(settings)}>
            Reset to defaults
          </button>
          <button className="secondary-action" type="button" onClick={onClose}>
            Close
          </button>
          <button className="primary-action" type="button" onClick={handleSave} disabled={saveAcknowledged}>
            {saveAcknowledged ? 'Saved' : 'Save settings'}
          </button>
        </footer>
      </div>
    </aside>
  )
}

function SettingsToggle({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean
  description: string
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="bl-settings-toggle">
      <input checked={checked} type="checkbox" onChange={(event) => onChange(event.target.checked)} />
      <span>
        <strong>{label}</strong>
        <em>{description}</em>
      </span>
    </label>
  )
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M6 6l12 12M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  )
}

export default SettingsPanel
