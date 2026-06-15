import { createShowdownEngineArchiveContentsManifest } from './showdownEngineArchiveContentsManifest'
import { createShowdownEngineArchiveExtractionPlan } from './showdownEngineArchiveExtractionPlan'
import { fetchShowdownEngineArchiveBodyDownloadReadModel } from './showdownEngineArchiveBodyDownloadReadModel'
import { createShowdownEngineImmutableSourceRevision } from './showdownEngineImmutableSourceRevision'
import {
  createShowdownEngineFormatRegistryValidationPlan,
  type ShowdownEngineFormatRegistryValidationPlan,
} from './showdownEngineFormatRegistryValidationPlan'
import {
  sampleShowdownEngineFormatRegistryLoaderProofs,
} from './showdownEngineFormatRegistryLoaderProof'

export type ShowdownEngineFormatRegistryValidationPlanValidationSeverity = 'error' | 'warning'

export type ShowdownEngineFormatRegistryValidationPlanValidationCode =
  | 'fixture-coverage-invalid'
  | 'extraction-prerequisite-invalid'
  | 'registry-source-handoff-invalid'
  | 'registry-count-invalid'
  | 'promotion-gate-invalid'
  | 'overlay-policy-invalid'
  | 'preservation-invalid'
  | 'safety-boundary-invalid'
  | 'authority-boundary-invalid'

export interface ShowdownEngineFormatRegistryValidationPlanValidationIssue {
  code: ShowdownEngineFormatRegistryValidationPlanValidationCode
  severity: ShowdownEngineFormatRegistryValidationPlanValidationSeverity
  path: string
  message: string
}

export interface ShowdownEngineFormatRegistryValidationPlanValidationResult {
  isValid: boolean
  issues: ShowdownEngineFormatRegistryValidationPlanValidationIssue[]
  coveredStatuses: ShowdownEngineFormatRegistryValidationPlan['status'][]
  checkedPlanCount: number
  readyPlanCount: number
  blockedPlanCount: number
}

const immutableRevision = '0123456789abcdef0123456789abcdef01234567'
const requiredFiles = ['package.json', 'sim/dex.ts', 'sim/team-validator.ts', 'config/formats.ts']

const createIssue = (
  code: ShowdownEngineFormatRegistryValidationPlanValidationCode,
  severity: ShowdownEngineFormatRegistryValidationPlanValidationSeverity,
  path: string,
  message: string,
): ShowdownEngineFormatRegistryValidationPlanValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const createPlanFixtures = async (): Promise<ShowdownEngineFormatRegistryValidationPlan[]> => {
  const bodyReadModel = await fetchShowdownEngineArchiveBodyDownloadReadModel()
  const approvedSha = bodyReadModel.hash.sha256 ?? 'missing-observed-hash'
  const branchPolicy = createShowdownEngineImmutableSourceRevision({
    bodyReadModel,
    revisionPolicyId: 'format-registry-branch-preview',
  })
  const pinnedPolicy = createShowdownEngineImmutableSourceRevision({
    bodyReadModel,
    immutableRevision,
    approvedImmutableSha256: approvedSha,
    approvedAt: '2026-06-15T00:00:00.000Z',
    revisionPolicyId: 'format-registry-pinned-approved',
  })
  const blockedExtractionPlan = createShowdownEngineArchiveExtractionPlan({
    contentsManifest: createShowdownEngineArchiveContentsManifest({
      immutableSourcePolicy: branchPolicy,
      manifestId: 'format-registry-blocked-source-manifest',
    }),
    planId: 'format-registry-blocked-extraction-plan',
  })
  const readyExtractionPlan = createShowdownEngineArchiveExtractionPlan({
    contentsManifest: createShowdownEngineArchiveContentsManifest({
      immutableSourcePolicy: pinnedPolicy,
      fileStatuses: Object.fromEntries(requiredFiles.map((file) => [file, 'present'])),
      manifestId: 'format-registry-ready-manifest',
    }),
    planId: 'format-registry-ready-extraction-plan',
  })

  return [
    createShowdownEngineFormatRegistryValidationPlan({
      extractionPlan: blockedExtractionPlan,
      loaderProof: sampleShowdownEngineFormatRegistryLoaderProofs.stagedAvailable,
      planId: 'format-registry-validation-blocked-by-extraction-plan',
    }),
    createShowdownEngineFormatRegistryValidationPlan({
      extractionPlan: readyExtractionPlan,
      loaderProof: sampleShowdownEngineFormatRegistryLoaderProofs.unavailableFallback,
      planId: 'format-registry-validation-blocked-by-registry-source-file',
    }),
    createShowdownEngineFormatRegistryValidationPlan({
      extractionPlan: readyExtractionPlan,
      loaderProof: sampleShowdownEngineFormatRegistryLoaderProofs.stagedAvailable,
      planId: 'format-registry-validation-ready',
    }),
    createShowdownEngineFormatRegistryValidationPlan({
      extractionPlan: readyExtractionPlan,
      loaderProof: sampleShowdownEngineFormatRegistryLoaderProofs.stagedAvailable,
      scenario: 'failed',
      planId: 'format-registry-validation-failed-preserves-active',
    }),
    createShowdownEngineFormatRegistryValidationPlan({
      extractionPlan: readyExtractionPlan,
      loaderProof: sampleShowdownEngineFormatRegistryLoaderProofs.stagedAvailable,
      scenario: 'cancelled',
      planId: 'format-registry-validation-cancelled-preserves-active',
    }),
  ]
}

const validatePlan = (
  plan: ShowdownEngineFormatRegistryValidationPlan,
  issues: ShowdownEngineFormatRegistryValidationPlanValidationIssue[],
  path: string,
) => {
  if (plan.status === 'ready-for-future-validation' && plan.extractionPlanStatus !== 'ready-for-future-staging') {
    issues.push(
      createIssue(
        'extraction-prerequisite-invalid',
        'error',
        `${path}.extractionPlanStatus`,
        'Ready format registry validation requires a ready extraction/staging plan.',
      ),
    )
  }

  if (
    plan.status === 'ready-for-future-validation' &&
    (plan.registrySourceFile.purpose !== 'formats-registry' ||
      plan.registrySourceFile.readinessStatus !== 'valid' ||
      !plan.registrySourceFile.metadataOnly)
  ) {
    issues.push(
      createIssue(
        'registry-source-handoff-invalid',
        'error',
        `${path}.registrySourceFile`,
        'Ready format registry validation requires a metadata-only valid formats-registry source file handoff.',
      ),
    )
  }

  if (
    plan.status === 'ready-for-future-validation' &&
    (plan.expectedRegistry.readinessStatus !== 'available' ||
      plan.expectedRegistry.expectedOfficialFormatCount < 1 ||
      !plan.expectedRegistry.officialFormatsDiscoverable ||
      !plan.expectedRegistry.metadataOnly)
  ) {
    issues.push(
      createIssue(
        'registry-count-invalid',
        'error',
        `${path}.expectedRegistry`,
        'Ready format registry validation must represent discoverable official Pokemon Showdown formats as metadata.',
      ),
    )
  }

  if (
    plan.status === 'ready-for-future-validation' &&
    (plan.promotionGate.decision !== 'validation-ready' || plan.promotionGate.promotionBlocked)
  ) {
    issues.push(
      createIssue(
        'promotion-gate-invalid',
        'error',
        `${path}.promotionGate`,
        'Ready format registry plan must expose validation-ready promotion metadata.',
      ),
    )
  }

  if (plan.status !== 'ready-for-future-validation' && !plan.promotionGate.promotionBlocked) {
    issues.push(
      createIssue(
        'promotion-gate-invalid',
        'error',
        `${path}.promotionGate`,
        'Blocked, failed, and cancelled registry plans must keep promotion blocked.',
      ),
    )
  }

  if (
    plan.customOverlay.overlayFolderKey !== 'battlelab-custom-overlays' ||
    plan.customOverlay.mergeStrategy !== 'read-overlay-after-official-registry' ||
    plan.customOverlay.modifiesUpstreamSourceInPlace ||
    plan.customOverlay.readinessStatus !== 'supported'
  ) {
    issues.push(
      createIssue(
        'overlay-policy-invalid',
        'error',
        `${path}.customOverlay`,
        'BattleLab custom format overlays must remain separate from upstream Pokemon Showdown source.',
      ),
    )
  }

  if (!plan.promotionGate.previousActivePreserved) {
    issues.push(
      createIssue(
        'preservation-invalid',
        'error',
        `${path}.promotionGate.previousActivePreserved`,
        'Format registry validation plan must preserve previous active Engine metadata.',
      ),
    )
  }

  if (
    !plan.safety.noImportTimeDownload ||
    !plan.safety.noAppLoadDownload ||
    !plan.safety.noPanelOpenDownload ||
    !plan.safety.noArchiveInspection ||
    !plan.safety.noArchiveExtraction ||
    !plan.safety.noFileIo ||
    !plan.safety.noFileReads ||
    !plan.safety.noDynamicImports ||
    !plan.safety.noLoaderExecution ||
    !plan.safety.noCatalogUpdatePanelWiring ||
    !plan.safety.noSimulationExecution
  ) {
    issues.push(
      createIssue(
        'safety-boundary-invalid',
        'error',
        `${path}.safety`,
        'Format registry validation plan must remain metadata-only, no-IO, no-loader, no-UI-wiring, and no-simulation.',
      ),
    )
  }

  if (
    plan.safety.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth' ||
    plan.safety.catalogRole !== 'enrichment-only' ||
    !plan.safety.customFormatsOverlayOnly
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

export async function validateShowdownEngineFormatRegistryValidationPlan(): Promise<ShowdownEngineFormatRegistryValidationPlanValidationResult> {
  const issues: ShowdownEngineFormatRegistryValidationPlanValidationIssue[] = []
  const plans = await createPlanFixtures()
  const coveredStatuses = Array.from(new Set(plans.map((plan) => plan.status)))
  const requiredStatuses: ShowdownEngineFormatRegistryValidationPlan['status'][] = [
    'blocked-by-extraction-plan',
    'blocked-by-registry-source-file',
    'ready-for-future-validation',
    'failed-preserves-active',
    'cancelled-preserves-active',
  ]

  plans.forEach((plan, index) => validatePlan(plan, issues, `plans.${index}`))

  requiredStatuses.forEach((status) => {
    if (!coveredStatuses.includes(status)) {
      issues.push(
        createIssue(
          'fixture-coverage-invalid',
          'error',
          'coveredStatuses',
          `Format registry validation plan fixtures must cover ${status}.`,
        ),
      )
    }
  })

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    coveredStatuses,
    checkedPlanCount: plans.length,
    readyPlanCount: plans.filter((plan) => plan.status === 'ready-for-future-validation').length,
    blockedPlanCount: plans.filter((plan) => plan.promotionGate.promotionBlocked).length,
  }
}
