import {
  createShowdownEngineArchiveContentsManifest,
  type ShowdownEngineArchiveContentsManifest,
} from './showdownEngineArchiveContentsManifest'
import { createShowdownEngineImmutableSourceRevision } from './showdownEngineImmutableSourceRevision'
import { fetchShowdownEngineArchiveBodyDownloadReadModel } from './showdownEngineArchiveBodyDownloadReadModel'

export type ShowdownEngineArchiveContentsManifestValidationSeverity = 'error' | 'warning'

export type ShowdownEngineArchiveContentsManifestValidationCode =
  | 'required-files-invalid'
  | 'status-invalid'
  | 'overlay-invalid'
  | 'promotion-gate-invalid'
  | 'safety-invalid'
  | 'authority-boundary-invalid'

export interface ShowdownEngineArchiveContentsManifestValidationIssue {
  code: ShowdownEngineArchiveContentsManifestValidationCode
  severity: ShowdownEngineArchiveContentsManifestValidationSeverity
  path: string
  message: string
}

export interface ShowdownEngineArchiveContentsManifestValidationResult {
  isValid: boolean
  issues: ShowdownEngineArchiveContentsManifestValidationIssue[]
  coveredStatuses: ShowdownEngineArchiveContentsManifest['status'][]
  requiredFileCount: number
  checkedManifestCount: number
}

const immutableRevision = '0123456789abcdef0123456789abcdef01234567'
const expectedRequiredFiles = ['package.json', 'sim/dex.ts', 'sim/team-validator.ts', 'config/formats.ts']

const createIssue = (
  code: ShowdownEngineArchiveContentsManifestValidationCode,
  severity: ShowdownEngineArchiveContentsManifestValidationSeverity,
  path: string,
  message: string,
): ShowdownEngineArchiveContentsManifestValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const createManifestFixtures = async (): Promise<ShowdownEngineArchiveContentsManifest[]> => {
  const bodyReadModel = await fetchShowdownEngineArchiveBodyDownloadReadModel()
  const approvedSha = bodyReadModel.hash.sha256 ?? 'missing-observed-hash'
  const branchPreview = createShowdownEngineImmutableSourceRevision({
    bodyReadModel,
    revisionPolicyId: 'contents-branch-preview',
  })
  const pinnedApproved = createShowdownEngineImmutableSourceRevision({
    bodyReadModel,
    immutableRevision,
    approvedImmutableSha256: approvedSha,
    approvedAt: '2026-06-15T00:00:00.000Z',
    revisionPolicyId: 'contents-pinned-approved',
  })

  return [
    createShowdownEngineArchiveContentsManifest({
      immutableSourcePolicy: branchPreview,
      manifestId: 'contents-blocked-by-source-policy',
    }),
    createShowdownEngineArchiveContentsManifest({
      immutableSourcePolicy: pinnedApproved,
      fileStatuses: Object.fromEntries(expectedRequiredFiles.map((file) => [file, 'planned'])),
      manifestId: 'contents-not-inspected',
    }),
    createShowdownEngineArchiveContentsManifest({
      immutableSourcePolicy: pinnedApproved,
      fileStatuses: Object.fromEntries(expectedRequiredFiles.map((file) => [file, 'present'])),
      manifestId: 'contents-valid',
    }),
    createShowdownEngineArchiveContentsManifest({
      immutableSourcePolicy: pinnedApproved,
      fileStatuses: {
        'package.json': 'present',
        'sim/dex.ts': 'present',
        'sim/team-validator.ts': 'missing',
        'config/formats.ts': 'present',
      },
      manifestId: 'contents-missing-required-file',
    }),
  ]
}

const validateManifest = (
  manifest: ShowdownEngineArchiveContentsManifest,
  issues: ShowdownEngineArchiveContentsManifestValidationIssue[],
  path: string,
) => {
  const filePaths = new Set(manifest.requiredFiles.map((file) => file.relativePath))
  const missingExpectedFiles = expectedRequiredFiles.filter((file) => !filePaths.has(file))

  if (manifest.requiredFiles.length !== expectedRequiredFiles.length || missingExpectedFiles.length > 0) {
    issues.push(
      createIssue(
        'required-files-invalid',
        'error',
        `${path}.requiredFiles`,
        `Required contents manifest must include package metadata, Dex entrypoint, TeamValidator, and official format registry. Missing: ${missingExpectedFiles.join(', ')}`,
      ),
    )
  }

  if (manifest.requiredFiles.some((file) => !file.required || !file.expectedAfterExtraction)) {
    issues.push(
      createIssue(
        'required-files-invalid',
        'error',
        `${path}.requiredFiles`,
        'Required file entries must remain required expected-after-extraction metadata.',
      ),
    )
  }

  if (
    manifest.status === 'manifest-valid' &&
    (manifest.immutableSourcePolicy.status !== 'immutable-pinned-approved' ||
      manifest.requiredFiles.some((file) => file.status !== 'present') ||
      manifest.promotionGate.promotionBlocked)
  ) {
    issues.push(
      createIssue(
        'status-invalid',
        'error',
        `${path}.status`,
        'Manifest-valid requires pinned-approved immutable source policy, present required files, and open manifest promotion gate.',
      ),
    )
  }

  if (manifest.status !== 'manifest-valid' && !manifest.promotionGate.promotionBlocked) {
    issues.push(
      createIssue(
        'promotion-gate-invalid',
        'error',
        `${path}.promotionGate`,
        'Promotion must remain blocked unless manifest is valid.',
      ),
    )
  }

  if (!manifest.promotionGate.previousActivePreserved) {
    issues.push(
      createIssue(
        'promotion-gate-invalid',
        'error',
        `${path}.promotionGate.previousActivePreserved`,
        'Previous active Engine must remain preserved by contents manifest planning.',
      ),
    )
  }

  if (!manifest.overlayHandoff.supported || manifest.overlayHandoff.modifyUpstreamSourceInPlace) {
    issues.push(
      createIssue(
        'overlay-invalid',
        'error',
        `${path}.overlayHandoff`,
        'BattleLab custom format overlays must be supported without modifying upstream Pokemon Showdown source in place.',
      ),
    )
  }

  if (
    !manifest.safety.noImportTimeDownload ||
    !manifest.safety.noAppLoadDownload ||
    !manifest.safety.noPanelOpenDownload ||
    !manifest.safety.noArchiveInspection ||
    !manifest.safety.noArchiveExtraction ||
    !manifest.safety.noFileIo ||
    !manifest.safety.noDynamicImports ||
    !manifest.safety.noLoaderExecution ||
    !manifest.safety.noCatalogUpdatePanelWiring ||
    !manifest.safety.noSimulationExecution
  ) {
    issues.push(
      createIssue(
        'safety-invalid',
        'error',
        `${path}.safety`,
        'Contents manifest planning must keep import/app/panel download, archive inspection/extraction, file IO, loader execution, UI wiring, and simulation closed.',
      ),
    )
  }

  if (
    manifest.safety.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth' ||
    manifest.safety.catalogRole !== 'enrichment-only' ||
    !manifest.safety.customFormatsOverlayOnly
  ) {
    issues.push(
      createIssue(
        'authority-boundary-invalid',
        'error',
        `${path}.safety`,
        'Authority boundaries must preserve Pokemon Showdown source-of-truth, PokeAPI enrichment-only, and custom format overlays.',
      ),
    )
  }
}

export async function validateShowdownEngineArchiveContentsManifest(): Promise<ShowdownEngineArchiveContentsManifestValidationResult> {
  const issues: ShowdownEngineArchiveContentsManifestValidationIssue[] = []
  const manifests = await createManifestFixtures()

  manifests.forEach((manifest, index) => validateManifest(manifest, issues, `manifests.${index}`))

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    coveredStatuses: Array.from(new Set(manifests.map((manifest) => manifest.status))),
    requiredFileCount: manifests[0]?.requiredFiles.length ?? 0,
    checkedManifestCount: manifests.length,
  }
}

