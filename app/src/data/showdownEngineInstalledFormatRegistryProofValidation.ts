import {
  runShowdownEngineInstalledFormatRegistryProof,
  type ShowdownEngineInstalledFormatRegistryProof,
} from './showdownEngineInstalledFormatRegistryProof'

export type ShowdownEngineInstalledFormatRegistryProofValidationSeverity = 'error' | 'warning'

export type ShowdownEngineInstalledFormatRegistryProofValidationCode =
  | 'available-proof-invalid'
  | 'unavailable-proof-invalid'
  | 'format-summary-invalid'
  | 'overlay-policy-invalid'
  | 'safety-boundary-invalid'
  | 'authority-boundary-invalid'
  | 'boundary-note-invalid'

export interface ShowdownEngineInstalledFormatRegistryProofValidationIssue {
  code: ShowdownEngineInstalledFormatRegistryProofValidationCode
  severity: ShowdownEngineInstalledFormatRegistryProofValidationSeverity
  path: string
  message: string
}

export interface ShowdownEngineInstalledFormatRegistryProofValidationResult {
  isValid: boolean
  issues: ShowdownEngineInstalledFormatRegistryProofValidationIssue[]
  installedProofStatus: ShowdownEngineInstalledFormatRegistryProof['status']
  installedOfficialFormatCount: number
  unavailableFallbackStatus: ShowdownEngineInstalledFormatRegistryProof['status']
  sampleFormatCount: number
}

const createIssue = (
  code: ShowdownEngineInstalledFormatRegistryProofValidationCode,
  severity: ShowdownEngineInstalledFormatRegistryProofValidationSeverity,
  path: string,
  message: string,
): ShowdownEngineInstalledFormatRegistryProofValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const validateCommonSafety = (
  proof: ShowdownEngineInstalledFormatRegistryProof,
  issues: ShowdownEngineInstalledFormatRegistryProofValidationIssue[],
  path: string,
) => {
  if (
    !proof.safety.explicitCallOnly ||
    !proof.safety.noImportTimeExecution ||
    !proof.safety.noAppLoadExecution ||
    !proof.safety.noPanelOpenExecution ||
    !proof.safety.noArchiveDownload ||
    !proof.safety.noArchiveExtraction ||
    !proof.safety.noFileIo ||
    !proof.safety.noDynamicImportFromDownloadedCode ||
    !proof.safety.noCatalogUpdatePanelWiring ||
    !proof.safety.noSimulationExecution ||
    !proof.safety.installedPackageMetadataReadOnly
  ) {
    issues.push(
      createIssue(
        'safety-boundary-invalid',
        'error',
        `${path}.safety`,
        'Installed format registry proof must remain explicit-call only, no archive execution, no file IO, no UI wiring, and no simulation.',
      ),
    )
  }

  if (
    proof.safety.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth' ||
    proof.safety.catalogRole !== 'enrichment-only' ||
    !proof.safety.customFormatsOverlayOnly
  ) {
    issues.push(
      createIssue(
        'authority-boundary-invalid',
        'error',
        `${path}.safety`,
        'Installed format registry proof must preserve Showdown authority, PokeAPI enrichment-only, and overlay-only custom formats.',
      ),
    )
  }

  if (
    proof.customOverlay.modifiesUpstreamSourceInPlace ||
    proof.customOverlay.overlayFolderKey !== 'battlelab-custom-overlays' ||
    proof.customOverlay.mergeStrategy !== 'read-overlay-after-official-registry' ||
    proof.customOverlay.status !== 'supported'
  ) {
    issues.push(
      createIssue(
        'overlay-policy-invalid',
        'error',
        `${path}.customOverlay`,
        'BattleLab custom format overlays must stay separate from upstream Pokemon Showdown source.',
      ),
    )
  }
}

const validateAvailableProof = (
  proof: ShowdownEngineInstalledFormatRegistryProof,
  issues: ShowdownEngineInstalledFormatRegistryProofValidationIssue[],
) => {
  validateCommonSafety(proof, issues, 'installedProof')

  if (
    proof.status !== 'available' ||
    proof.packageStatus.status !== 'available' ||
    proof.packageStatus.packageName !== 'pokemon-showdown' ||
    proof.registry.status !== 'available' ||
    proof.officialFormatCount < 1
  ) {
    issues.push(
      createIssue(
        'available-proof-invalid',
        proof.status === 'available' ? 'warning' : 'error',
        'installedProof',
        'Installed Pokemon Showdown package should expose at least one official format for this proof.',
      ),
    )
  }

  if (
    proof.sampleOfficialFormats.length < 1 ||
    proof.sampleOfficialFormats.some((format) => !format.formatId || !format.displayName || format.source !== 'official-pokemon-showdown')
  ) {
    issues.push(
      createIssue(
        'format-summary-invalid',
        'error',
        'installedProof.sampleOfficialFormats',
        'Available proof must expose sample official Pokemon Showdown format summaries.',
      ),
    )
  }

  if (
    !proof.boundaryNotes.some((note) => note.includes('explicit async helper')) ||
    !proof.boundaryNotes.some((note) => note.includes('does not download or extract'))
  ) {
    issues.push(
      createIssue(
        'boundary-note-invalid',
        'error',
        'installedProof.boundaryNotes',
        'Available proof boundary notes must state explicit-call and no archive download/extraction semantics.',
      ),
    )
  }
}

const validateUnavailableProof = (
  proof: ShowdownEngineInstalledFormatRegistryProof,
  issues: ShowdownEngineInstalledFormatRegistryProofValidationIssue[],
) => {
  validateCommonSafety(proof, issues, 'unavailableProof')

  if (
    proof.status !== 'unavailable' ||
    proof.packageStatus.status !== 'unavailable' ||
    !proof.packageStatus.errorMessage ||
    proof.officialFormatCount !== 0 ||
    proof.sampleOfficialFormats.length !== 0
  ) {
    issues.push(
      createIssue(
        'unavailable-proof-invalid',
        'error',
        'unavailableProof',
        'Unavailable fallback must report package/runtime unavailable without official format summaries.',
      ),
    )
  }
}

export async function validateShowdownEngineInstalledFormatRegistryProof(): Promise<ShowdownEngineInstalledFormatRegistryProofValidationResult> {
  const issues: ShowdownEngineInstalledFormatRegistryProofValidationIssue[] = []
  const installedProof = await runShowdownEngineInstalledFormatRegistryProof({
    checkedAt: '2026-06-15T00:00:00.000Z',
    proofId: 'installed-format-registry-validation-live',
  })
  const unavailableProof = await runShowdownEngineInstalledFormatRegistryProof({
    checkedAt: '2026-06-15T00:00:00.000Z',
    proofId: 'installed-format-registry-validation-unavailable',
    loadRegistry: async () => {
      throw new Error('Injected installed package unavailable fixture.')
    },
  })

  validateAvailableProof(installedProof, issues)
  validateUnavailableProof(unavailableProof, issues)

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    installedProofStatus: installedProof.status,
    installedOfficialFormatCount: installedProof.officialFormatCount,
    unavailableFallbackStatus: unavailableProof.status,
    sampleFormatCount: installedProof.sampleOfficialFormats.length,
  }
}
