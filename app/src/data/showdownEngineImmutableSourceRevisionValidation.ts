import {
  createShowdownEngineImmutableSourceRevision,
  type ShowdownEngineImmutableSourceRevision,
} from './showdownEngineImmutableSourceRevision'
import { fetchShowdownEngineArchiveBodyDownloadReadModel } from './showdownEngineArchiveBodyDownloadReadModel'

export type ShowdownEngineImmutableSourceRevisionValidationSeverity = 'error' | 'warning'

export type ShowdownEngineImmutableSourceRevisionValidationCode =
  | 'candidate-invalid'
  | 'status-invalid'
  | 'checksum-invalid'
  | 'source-policy-handoff-invalid'
  | 'promotion-gate-invalid'
  | 'safety-invalid'
  | 'authority-boundary-invalid'

export interface ShowdownEngineImmutableSourceRevisionValidationIssue {
  code: ShowdownEngineImmutableSourceRevisionValidationCode
  severity: ShowdownEngineImmutableSourceRevisionValidationSeverity
  path: string
  message: string
}

export interface ShowdownEngineImmutableSourceRevisionValidationResult {
  isValid: boolean
  issues: ShowdownEngineImmutableSourceRevisionValidationIssue[]
  coveredStatuses: ShowdownEngineImmutableSourceRevision['status'][]
  observedSha256: string | null
  checkedRevisionCount: number
}

const immutableRevision = '0123456789abcdef0123456789abcdef01234567'

const createIssue = (
  code: ShowdownEngineImmutableSourceRevisionValidationCode,
  severity: ShowdownEngineImmutableSourceRevisionValidationSeverity,
  path: string,
  message: string,
): ShowdownEngineImmutableSourceRevisionValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const validateRevision = (
  revision: ShowdownEngineImmutableSourceRevision,
  issues: ShowdownEngineImmutableSourceRevisionValidationIssue[],
  path: string,
) => {
  if (
    revision.candidate.repositoryOwner !== 'smogon' ||
    revision.candidate.repositoryName !== 'pokemon-showdown' ||
    !revision.candidate.branchArchiveUrl.includes('/refs/heads/') ||
    !revision.candidate.branchPreviewAllowed ||
    !revision.candidate.activationRequiresImmutableRevision
  ) {
    issues.push(
      createIssue(
        'candidate-invalid',
        'error',
        `${path}.candidate`,
        'Immutable source revision candidate must keep branch archive preview-only and require immutable revision for activation.',
      ),
    )
  }

  if (
    revision.status === 'immutable-pinned-approved' &&
    (!revision.candidate.revisionIsImmutable ||
      revision.checksum.approvalStatus !== 'approved' ||
      revision.sourcePolicyHandoff.status !== 'pinned-approved')
  ) {
    issues.push(
      createIssue(
        'status-invalid',
        'error',
        `${path}.status`,
        'Pinned-approved immutable revision must have immutable commit metadata, approved checksum, and pinned source policy handoff.',
      ),
    )
  }

  if (
    revision.status === 'immutable-mismatch-blocked' &&
    (revision.checksum.approvalStatus !== 'mismatch' || revision.sourcePolicyHandoff.status !== 'mismatch-blocked')
  ) {
    issues.push(
      createIssue(
        'source-policy-handoff-invalid',
        'error',
        `${path}.sourcePolicyHandoff`,
        'Mismatch immutable revision must hand off to mismatch-blocked source policy.',
      ),
    )
  }

  if (
    revision.checksum.observedHashIsActivationAuthority ||
    (revision.status !== 'immutable-pinned-approved' && !revision.promotionGate.activationBlocked)
  ) {
    issues.push(
      createIssue(
        'promotion-gate-invalid',
        'error',
        `${path}.promotionGate`,
        'Observed branch hash must stay non-authoritative and activation must remain blocked unless immutable pinned policy is approved.',
      ),
    )
  }

  if (!revision.promotionGate.previousActivePreserved) {
    issues.push(
      createIssue(
        'promotion-gate-invalid',
        'error',
        `${path}.promotionGate.previousActivePreserved`,
        'Previous active Engine must remain preserved through immutable revision policy checks.',
      ),
    )
  }

  if (
    !revision.safety.noImportTimeDownload ||
    !revision.safety.noAppLoadDownload ||
    !revision.safety.noPanelOpenDownload ||
    !revision.safety.noArchiveExtraction ||
    !revision.safety.noFileIo ||
    !revision.safety.noDynamicImports ||
    !revision.safety.noLoaderExecution ||
    !revision.safety.noCatalogUpdatePanelWiring ||
    !revision.safety.noSimulationExecution
  ) {
    issues.push(
      createIssue(
        'safety-invalid',
        'error',
        `${path}.safety`,
        'Immutable source revision policy must keep download-on-import, extraction, file IO, loader execution, UI wiring, and simulation closed.',
      ),
    )
  }

  if (
    revision.safety.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth' ||
    revision.safety.catalogRole !== 'enrichment-only' ||
    !revision.safety.customFormatsOverlayOnly
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

export async function validateShowdownEngineImmutableSourceRevision(): Promise<ShowdownEngineImmutableSourceRevisionValidationResult> {
  const issues: ShowdownEngineImmutableSourceRevisionValidationIssue[] = []
  const bodyReadModel = await fetchShowdownEngineArchiveBodyDownloadReadModel()
  const approvedSha = bodyReadModel.hash.sha256 ?? 'missing-observed-hash'
  const revisions = [
    createShowdownEngineImmutableSourceRevision({
      bodyReadModel,
      revisionPolicyId: 'immutable-source-branch-preview',
    }),
    createShowdownEngineImmutableSourceRevision({
      bodyReadModel,
      immutableRevision,
      revisionPolicyId: 'immutable-source-policy-needed',
    }),
    createShowdownEngineImmutableSourceRevision({
      bodyReadModel,
      immutableRevision,
      approvedImmutableSha256: approvedSha,
      approvedAt: '2026-06-15T00:00:00.000Z',
      revisionPolicyId: 'immutable-source-pinned-approved',
    }),
    createShowdownEngineImmutableSourceRevision({
      bodyReadModel,
      immutableRevision,
      approvedImmutableSha256: '0000000000000000000000000000000000000000000000000000000000000000',
      approvedAt: '2026-06-15T00:00:00.000Z',
      revisionPolicyId: 'immutable-source-mismatch-blocked',
    }),
  ]

  revisions.forEach((revision, index) => validateRevision(revision, issues, `revisions.${index}`))

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    coveredStatuses: Array.from(new Set(revisions.map((revision) => revision.status))),
    observedSha256: bodyReadModel.hash.sha256,
    checkedRevisionCount: revisions.length,
  }
}

