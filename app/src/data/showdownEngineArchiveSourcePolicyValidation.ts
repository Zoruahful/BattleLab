import {
  createShowdownEngineArchiveSourcePolicy,
  fetchShowdownEngineArchiveSourcePolicy,
  type ShowdownEngineArchiveSourcePolicy,
} from './showdownEngineArchiveSourcePolicy'
import type { ShowdownEngineArchiveBodyDownloadReadModel } from './showdownEngineArchiveBodyDownloadReadModel'
import { fetchShowdownEngineArchiveBodyDownloadReadModel } from './showdownEngineArchiveBodyDownloadReadModel'

export type ShowdownEngineArchiveSourcePolicyValidationSeverity = 'error' | 'warning'

export type ShowdownEngineArchiveSourcePolicyValidationCode =
  | 'source-invalid'
  | 'status-invalid'
  | 'checksum-policy-invalid'
  | 'promotion-policy-invalid'
  | 'safety-invalid'
  | 'authority-boundary-invalid'
  | 'custom-overlay-invalid'

export interface ShowdownEngineArchiveSourcePolicyValidationIssue {
  code: ShowdownEngineArchiveSourcePolicyValidationCode
  severity: ShowdownEngineArchiveSourcePolicyValidationSeverity
  path: string
  message: string
}

export interface ShowdownEngineArchiveSourcePolicyValidationResult {
  isValid: boolean
  issues: ShowdownEngineArchiveSourcePolicyValidationIssue[]
  livePolicyStatus: ShowdownEngineArchiveSourcePolicy['status']
  coveredStatuses: ShowdownEngineArchiveSourcePolicy['status'][]
  observedSha256: string | null
  checkedPolicyCount: number
}

const createIssue = (
  code: ShowdownEngineArchiveSourcePolicyValidationCode,
  severity: ShowdownEngineArchiveSourcePolicyValidationSeverity,
  path: string,
  message: string,
): ShowdownEngineArchiveSourcePolicyValidationIssue => ({
  code,
  severity,
  path,
  message,
})

const createPolicyFixtures = (
  bodyReadModel: ShowdownEngineArchiveBodyDownloadReadModel,
): ShowdownEngineArchiveSourcePolicy[] => [
  createShowdownEngineArchiveSourcePolicy({
    bodyReadModel,
    policyId: 'source-policy-live-unpinned',
  }),
  createShowdownEngineArchiveSourcePolicy({
    bodyReadModel: {
      ...bodyReadModel,
      source: {
        ...bodyReadModel.source,
        archiveUrl: 'https://github.com/smogon/pokemon-showdown/archive/0123456789abcdef0123456789abcdef01234567.zip',
        revision: '0123456789abcdef0123456789abcdef01234567',
      },
    },
    approvedRevision: '0123456789abcdef0123456789abcdef01234567',
    approvedSha256: bodyReadModel.hash.sha256 ?? 'missing-observed-hash',
    approvedAt: '2026-06-15T00:00:00.000Z',
    policyId: 'source-policy-pinned-approved',
  }),
  createShowdownEngineArchiveSourcePolicy({
    bodyReadModel: {
      ...bodyReadModel,
      source: {
        ...bodyReadModel.source,
        archiveUrl: 'https://github.com/smogon/pokemon-showdown/archive/0123456789abcdef0123456789abcdef01234567.zip',
        revision: '0123456789abcdef0123456789abcdef01234567',
      },
    },
    approvedRevision: '0123456789abcdef0123456789abcdef01234567',
    approvedSha256: '0000000000000000000000000000000000000000000000000000000000000000',
    approvedAt: '2026-06-15T00:00:00.000Z',
    policyId: 'source-policy-mismatch-blocked',
  }),
  createShowdownEngineArchiveSourcePolicy({
    bodyReadModel: {
      ...bodyReadModel,
      hash: {
        ...bodyReadModel.hash,
        sha256: null,
      },
      source: {
        ...bodyReadModel.source,
        archiveUrl: 'https://github.com/smogon/pokemon-showdown/archive/refs/tags/preview.zip',
        revision: 'preview-tag',
      },
    },
    policyId: 'source-policy-needed',
  }),
]

const validatePolicy = (
  policy: ShowdownEngineArchiveSourcePolicy,
  issues: ShowdownEngineArchiveSourcePolicyValidationIssue[],
  path: string,
) => {
  if (
    policy.source.repositoryOwner !== 'smogon' ||
    policy.source.repositoryName !== 'pokemon-showdown' ||
    !policy.source.archiveUrl.startsWith('https://github.com/smogon/pokemon-showdown/archive/')
  ) {
    issues.push(createIssue('source-invalid', 'error', `${path}.source`, 'Source policy must describe the Pokemon Showdown GitHub source archive.'))
  }

  if (policy.status === 'pinned-approved' && (policy.source.revisionPinStatus !== 'immutable-commit' || policy.checksum.approvedChecksumStatus !== 'approved')) {
    issues.push(
      createIssue(
        'status-invalid',
        'error',
        `${path}.status`,
        'Pinned-approved policy requires an immutable revision and approved checksum match.',
      ),
    )
  }

  if (
    policy.checksum.observedHashIsActivationAuthority ||
    !policy.checksum.downloadedBodyHashOnly ||
    (policy.status !== 'pinned-approved' && policy.checksum.approvedChecksumStatus === 'approved')
  ) {
    issues.push(
      createIssue(
        'checksum-policy-invalid',
        'error',
        `${path}.checksum`,
        'Observed downloaded-body SHA-256 must remain non-authoritative unless immutable revision and approved checksum policy are present.',
      ),
    )
  }

  if (policy.status !== 'pinned-approved' && !policy.promotion.promotionBlocked) {
    issues.push(
      createIssue(
        'promotion-policy-invalid',
        'error',
        `${path}.promotion`,
        'Promotion must remain blocked unless the archive source policy is pinned-approved.',
      ),
    )
  }

  if (!policy.promotion.previousActivePreserved) {
    issues.push(createIssue('promotion-policy-invalid', 'error', `${path}.promotion.previousActivePreserved`, 'Previous active Engine must remain preserved.'))
  }

  if (
    !policy.safety.noImportTimeDownload ||
    !policy.safety.noAppLoadDownload ||
    !policy.safety.noPanelOpenDownload ||
    !policy.safety.noArchiveExtraction ||
    !policy.safety.noFileIo ||
    !policy.safety.noDynamicImports ||
    !policy.safety.noLoaderExecution ||
    !policy.safety.noCatalogUpdatePanelWiring ||
    !policy.safety.noSimulationExecution
  ) {
    issues.push(
      createIssue(
        'safety-invalid',
        'error',
        `${path}.safety`,
        'Source policy must keep import/app/panel download, extraction, file IO, loader execution, UI wiring, and simulation closed.',
      ),
    )
  }

  if (
    policy.safety.pokemonShowdownAuthority !== 'pokemon-showdown-legality-source-of-truth' ||
    policy.safety.catalogRole !== 'enrichment-only'
  ) {
    issues.push(
      createIssue(
        'authority-boundary-invalid',
        'error',
        `${path}.safety`,
        'Pokemon Showdown must remain legality/simulation source of truth and PokeAPI/catalog data must remain enrichment-only.',
      ),
    )
  }

  if (!policy.safety.customFormatsOverlayOnly) {
    issues.push(createIssue('custom-overlay-invalid', 'error', `${path}.safety.customFormatsOverlayOnly`, 'BattleLab custom formats must remain overlays.'))
  }
}

export async function validateShowdownEngineArchiveSourcePolicy(): Promise<ShowdownEngineArchiveSourcePolicyValidationResult> {
  const issues: ShowdownEngineArchiveSourcePolicyValidationIssue[] = []
  const livePolicy = await fetchShowdownEngineArchiveSourcePolicy()
  const bodyReadModel = await fetchShowdownEngineArchiveBodyDownloadReadModel()
  const policies = createPolicyFixtures(bodyReadModel)

  policies.forEach((policy, index) => validatePolicy(policy, issues, `policies.${index}`))

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    issues,
    livePolicyStatus: livePolicy.status,
    coveredStatuses: Array.from(new Set(policies.map((policy) => policy.status))),
    observedSha256: bodyReadModel.hash.sha256,
    checkedPolicyCount: policies.length,
  }
}

