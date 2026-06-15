import { createShowdownEngineActivationGate, type ShowdownEngineActivationGate } from './showdownEngineActivationGate'
import { createShowdownEngineArchiveContentsManifest } from './showdownEngineArchiveContentsManifest'
import { createShowdownEngineArchiveExtractionPlan } from './showdownEngineArchiveExtractionPlan'
import { fetchShowdownEngineArchiveBodyDownloadReadModel } from './showdownEngineArchiveBodyDownloadReadModel'
import { createShowdownEngineFormatRegistryValidationPlan } from './showdownEngineFormatRegistryValidationPlan'
import { sampleShowdownEngineFormatRegistryLoaderProofs } from './showdownEngineFormatRegistryLoaderProof'
import { createShowdownEngineImmutableSourceRevision } from './showdownEngineImmutableSourceRevision'

export type ShowdownEngineActivationGateValidationSeverity = 'error' | 'warning'

export type ShowdownEngineActivationGateValidationCode =
  | 'fixture-coverage-invalid'
  | 'prerequisite-invalid'
  | 'storage-boundary-invalid'
  | 'promotion-invalid'
  | 'preservation-invalid'
  | 'safety-boundary-invalid'
  | 'authority-boundary-invalid'

export interface ShowdownEngineActivationGateValidationIssue {
  code: ShowdownEngineActivationGateValidationCode
  severity: ShowdownEngineActivationGateValidationSeverity
  path: string
  message: string
}

export interface ShowdownEngineActivationGateValidationResult {
  isValid: boolean
  issues: ShowdownEngineActivationGateValidationIssue[]
  coveredStatuses: ShowdownEngineActivationGate['status'][]
  checkedGateCount: number
  activationReadyCount: number
  blockedGateCount: number
}

const immutableRevision = '0123456789abcdef0123456789abcdef01234567'
const requiredFiles = ['package.json', 'sim/dex.ts', 'sim/team-validator.ts', 'config/formats.ts']

const createIssue = (
  code: ShowdownEngineActivationGateValidationCode,
  severity: ShowdownEngineActivationGateValidationSeverity,
  path: string,
  message: string,
): ShowdownEngineActivationGateValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const createGateFixtures = async (): Promise<ShowdownEngineActivationGate[]> => {
  const bodyReadModel = await fetchShowdownEngineArchiveBodyDownloadReadModel()
  const approvedSha = bodyReadModel.hash.sha256 ?? 'missing-observed-hash'
  const branchPolicy = createShowdownEngineImmutableSourceRevision({
    bodyReadModel,
    revisionPolicyId: 'activation-branch-preview',
  })
  const pinnedPolicy = createShowdownEngineImmutableSourceRevision({
    bodyReadModel,
    immutableRevision,
    approvedImmutableSha256: approvedSha,
    approvedAt: '2026-06-15T00:00:00.000Z',
    revisionPolicyId: 'activation-pinned-approved',
  })
  const blockedExtractionPlan = createShowdownEngineArchiveExtractionPlan({
    contentsManifest: createShowdownEngineArchiveContentsManifest({
      immutableSourcePolicy: branchPolicy,
      manifestId: 'activation-blocked-source-manifest',
    }),
    planId: 'activation-blocked-extraction-plan',
  })
  const readyExtractionPlan = createShowdownEngineArchiveExtractionPlan({
    contentsManifest: createShowdownEngineArchiveContentsManifest({
      immutableSourcePolicy: pinnedPolicy,
      fileStatuses: Object.fromEntries(requiredFiles.map((file) => [file, 'present'])),
      manifestId: 'activation-ready-manifest',
    }),
    planId: 'activation-ready-extraction-plan',
  })
  const blockedRegistryPlan = createShowdownEngineFormatRegistryValidationPlan({
    extractionPlan: blockedExtractionPlan,
    loaderProof: sampleShowdownEngineFormatRegistryLoaderProofs.stagedAvailable,
    planId: 'activation-blocked-registry-plan',
  })
  const readyRegistryPlan = createShowdownEngineFormatRegistryValidationPlan({
    extractionPlan: readyExtractionPlan,
    loaderProof: sampleShowdownEngineFormatRegistryLoaderProofs.stagedAvailable,
    planId: 'activation-ready-registry-plan',
  })

  return [
    createShowdownEngineActivationGate({
      registryValidationPlan: blockedRegistryPlan,
      gateId: 'activation-gate-blocked',
    }),
    createShowdownEngineActivationGate({
      registryValidationPlan: readyRegistryPlan,
      gateId: 'activation-gate-ready',
    }),
    createShowdownEngineActivationGate({
      registryValidationPlan: readyRegistryPlan,
      scenario: 'failed',
      gateId: 'activation-gate-failed-preserves-active',
    }),
    createShowdownEngineActivationGate({
      registryValidationPlan: readyRegistryPlan,
      scenario: 'cancelled',
      gateId: 'activation-gate-cancelled-preserves-active',
    }),
  ]
}

const validateGate = (
  gate: ShowdownEngineActivationGate,
  issues: ShowdownEngineActivationGateValidationIssue[],
  path: string,
) => {
  const expectedKeys: ShowdownEngineActivationGate['prerequisites'][number]['key'][] = [
    'immutable-source-policy',
    'archive-contents-manifest',
    'extraction-staging',
    'required-files',
    'format-registry-validation',
    'custom-format-overlay',
  ]

  expectedKeys.forEach((key) => {
    const prerequisite = gate.prerequisites.find((candidate) => candidate.key === key)

    if (!prerequisite || !prerequisite.metadataOnly) {
      issues.push(
        createIssue(
          'prerequisite-invalid',
          'error',
          `${path}.prerequisites.${key}`,
          `Activation gate must include metadata-only ${key} prerequisite.`,
        ),
      )
    }
  })

  if (gate.status === 'activation-ready' && gate.prerequisites.some((prerequisite) => prerequisite.status !== 'ready')) {
    issues.push(
      createIssue(
        'prerequisite-invalid',
        'error',
        `${path}.prerequisites`,
        'Activation-ready gate requires every prerequisite to be ready.',
      ),
    )
  }

  if (
    gate.storageTarget.rootFolderKey !== 'battlelab-showdown-engine' ||
    gate.storageTarget.writesFiles ||
    !gate.storageTarget.pathResolvedByFutureAdapter
  ) {
    issues.push(
      createIssue(
        'storage-boundary-invalid',
        'error',
        `${path}.storageTarget`,
        'Activation gate storage target must remain app-managed, metadata-only, and no-write.',
      ),
    )
  }

  if (
    gate.status === 'activation-ready' &&
    (gate.promotion.decision !== 'promote-staged-revision' ||
      gate.promotion.promotionBlocked ||
      !gate.promotion.stagedRevisionId)
  ) {
    issues.push(
      createIssue(
        'promotion-invalid',
        'error',
        `${path}.promotion`,
        'Activation-ready gate must expose staged-revision promotion metadata.',
      ),
    )
  }

  if (gate.status !== 'activation-ready' && !gate.promotion.promotionBlocked) {
    issues.push(
      createIssue(
        'promotion-invalid',
        'error',
        `${path}.promotion`,
        'Blocked, failed, and cancelled activation gates must keep promotion blocked.',
      ),
    )
  }

  if (!gate.promotion.previousActivePreserved) {
    issues.push(
      createIssue(
        'preservation-invalid',
        'error',
        `${path}.promotion.previousActivePreserved`,
        'Activation gate must preserve previous active Engine metadata.',
      ),
    )
  }

  if (
    !gate.safety.noImportTimeDownload ||
    !gate.safety.noAppLoadDownload ||
    !gate.safety.noPanelOpenDownload ||
    !gate.safety.noArchiveInspection ||
    !gate.safety.noArchiveExtraction ||
    !gate.safety.noFileIo ||
    !gate.safety.noFileReads ||
    !gate.safety.noDynamicImports ||
    !gate.safety.noLoaderExecution ||
    !gate.safety.noCatalogUpdatePanelWiring ||
    !gate.safety.noSimulationExecution
  ) {
    issues.push(
      createIssue(
        'safety-boundary-invalid',
        'error',
        `${path}.safety`,
        'Activation gate must remain metadata-only, no-IO, no-loader, no-UI-wiring, and no-simulation.',
      ),
    )
  }

  if (
    gate.safety.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth' ||
    gate.safety.catalogRole !== 'enrichment-only' ||
    !gate.safety.customFormatsOverlayOnly
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

export async function validateShowdownEngineActivationGate(): Promise<ShowdownEngineActivationGateValidationResult> {
  const issues: ShowdownEngineActivationGateValidationIssue[] = []
  const gates = await createGateFixtures()
  const coveredStatuses = Array.from(new Set(gates.map((gate) => gate.status)))
  const requiredStatuses: ShowdownEngineActivationGate['status'][] = [
    'blocked',
    'activation-ready',
    'failed-preserves-active',
    'cancelled-preserves-active',
  ]

  gates.forEach((gate, index) => validateGate(gate, issues, `gates.${index}`))

  requiredStatuses.forEach((status) => {
    if (!coveredStatuses.includes(status)) {
      issues.push(
        createIssue(
          'fixture-coverage-invalid',
          'error',
          'coveredStatuses',
          `Activation gate fixtures must cover ${status}.`,
        ),
      )
    }
  })

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    coveredStatuses,
    checkedGateCount: gates.length,
    activationReadyCount: gates.filter((gate) => gate.status === 'activation-ready').length,
    blockedGateCount: gates.filter((gate) => gate.promotion.promotionBlocked).length,
  }
}
