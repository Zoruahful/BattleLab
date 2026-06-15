import {
  fetchShowdownEngineArchiveBodyDownloadReadModel,
  type ShowdownEngineArchiveBodyDownloadReadModel,
} from './showdownEngineArchiveBodyDownloadReadModel'
import type { ShowdownEngineArchiveBodyDownloadProofOptions } from './showdownEngineArchiveBodyDownloadProof'

export type ShowdownEngineArchiveSourcePolicyStatus =
  | 'policy-needed'
  | 'unpinned'
  | 'pinned-approved'
  | 'mismatch-blocked'

export type ShowdownEngineArchiveRevisionPinStatus = 'branch-style' | 'immutable-commit' | 'unknown'

export type ShowdownEngineArchiveApprovedChecksumStatus = 'not-approved' | 'approved' | 'mismatch'

export interface ShowdownEngineArchiveSourcePolicyInput {
  bodyReadModel: ShowdownEngineArchiveBodyDownloadReadModel
  approvedRevision?: string
  approvedSha256?: string
  approvedAt?: string
  policyId?: string
}

export interface ShowdownEngineArchiveSourcePolicySource {
  repositoryOwner: string
  repositoryName: string
  archiveUrl: string
  revision: string
  versionLabel: string
  revisionPinStatus: ShowdownEngineArchiveRevisionPinStatus
  immutableRevisionRequired: true
}

export interface ShowdownEngineArchiveSourcePolicyChecksum {
  observedSha256: string | null
  approvedSha256: string | null
  approvedAt: string | null
  downloadedBodyHashOnly: true
  approvedChecksumStatus: ShowdownEngineArchiveApprovedChecksumStatus
  observedHashIsActivationAuthority: false
}

export interface ShowdownEngineArchiveSourcePolicyPromotion {
  promotionBlocked: boolean
  reason: string
  previousActivePreserved: true
  previousActiveRevisionId: string
}

export interface ShowdownEngineArchiveSourcePolicySafety {
  noImportTimeDownload: true
  noAppLoadDownload: true
  noPanelOpenDownload: true
  noArchiveExtraction: true
  noFileIo: true
  noDynamicImports: true
  noLoaderExecution: true
  noCatalogUpdatePanelWiring: true
  noSimulationExecution: true
  customFormatsOverlayOnly: true
  pokemonShowdownAuthority: 'pokemon-showdown-legality-source-of-truth'
  catalogRole: 'enrichment-only'
}

export interface ShowdownEngineArchiveSourcePolicy {
  policyId: string
  status: ShowdownEngineArchiveSourcePolicyStatus
  message: string
  source: ShowdownEngineArchiveSourcePolicySource
  checksum: ShowdownEngineArchiveSourcePolicyChecksum
  promotion: ShowdownEngineArchiveSourcePolicyPromotion
  safety: ShowdownEngineArchiveSourcePolicySafety
  boundaryNotes: string[]
}

const commitArchivePattern = /\/archive\/(?:[a-f0-9]{40}|[a-f0-9]{64})\.zip$/i

const determineRevisionPinStatus = (archiveUrl: string, revision: string): ShowdownEngineArchiveRevisionPinStatus => {
  if (commitArchivePattern.test(archiveUrl) || /^[a-f0-9]{40}$/i.test(revision) || /^[a-f0-9]{64}$/i.test(revision)) {
    return 'immutable-commit'
  }

  if (archiveUrl.includes('/refs/heads/') || revision.toLowerCase().includes('master') || revision.toLowerCase().includes('main')) {
    return 'branch-style'
  }

  return 'unknown'
}

const determineStatus = (
  revisionPinStatus: ShowdownEngineArchiveRevisionPinStatus,
  observedSha256: string | null,
  approvedSha256: string | undefined,
): ShowdownEngineArchiveSourcePolicyStatus => {
  if (!approvedSha256 || !observedSha256) {
    return revisionPinStatus === 'branch-style' ? 'unpinned' : 'policy-needed'
  }

  if (observedSha256 !== approvedSha256) {
    return 'mismatch-blocked'
  }

  return revisionPinStatus === 'immutable-commit' ? 'pinned-approved' : 'policy-needed'
}

const createMessage = (status: ShowdownEngineArchiveSourcePolicyStatus): string => {
  if (status === 'pinned-approved') {
    return 'Archive source revision and checksum are pinned and approved for a future staged validation handoff.'
  }

  if (status === 'mismatch-blocked') {
    return 'Observed archive SHA-256 does not match the approved checksum; activation must remain blocked.'
  }

  if (status === 'unpinned') {
    return 'Archive source is branch-style or otherwise unpinned; observed body hash is not activation authority.'
  }

  return 'Archive source needs an immutable revision and approved checksum policy before activation.'
}

const createPromotionReason = (status: ShowdownEngineArchiveSourcePolicyStatus): string => {
  if (status === 'pinned-approved') {
    return 'Promotion can proceed only after later extraction, required-file, and format-registry validation are approved.'
  }

  if (status === 'mismatch-blocked') {
    return 'Promotion blocked because observed SHA-256 differs from the approved pinned checksum.'
  }

  return 'Promotion blocked until immutable revision and approved checksum policy are available.'
}

export function createShowdownEngineArchiveSourcePolicy(
  input: ShowdownEngineArchiveSourcePolicyInput,
): ShowdownEngineArchiveSourcePolicy {
  const { bodyReadModel, approvedRevision, approvedSha256, approvedAt, policyId } = input
  const revision = approvedRevision ?? bodyReadModel.source.revision
  const revisionPinStatus = determineRevisionPinStatus(bodyReadModel.source.archiveUrl, revision)
  const status = determineStatus(revisionPinStatus, bodyReadModel.hash.sha256, approvedSha256)

  return {
    policyId: policyId ?? `${bodyReadModel.readModelId}-source-policy`,
    status,
    message: createMessage(status),
    source: {
      repositoryOwner: bodyReadModel.source.repositoryOwner,
      repositoryName: bodyReadModel.source.repositoryName,
      archiveUrl: bodyReadModel.source.archiveUrl,
      revision,
      versionLabel: bodyReadModel.source.versionLabel,
      revisionPinStatus,
      immutableRevisionRequired: true,
    },
    checksum: {
      observedSha256: bodyReadModel.hash.sha256,
      approvedSha256: approvedSha256 ?? null,
      approvedAt: approvedAt ?? null,
      downloadedBodyHashOnly: true,
      approvedChecksumStatus:
        approvedSha256 && bodyReadModel.hash.sha256
          ? approvedSha256 === bodyReadModel.hash.sha256
            ? 'approved'
            : 'mismatch'
          : 'not-approved',
      observedHashIsActivationAuthority: false,
    },
    promotion: {
      promotionBlocked: status !== 'pinned-approved',
      reason: createPromotionReason(status),
      previousActivePreserved: bodyReadModel.preservation.previousActivePreserved,
      previousActiveRevisionId: bodyReadModel.preservation.previousActiveRevisionId,
    },
    safety: {
      noImportTimeDownload: bodyReadModel.safety.noImportTimeDownload,
      noAppLoadDownload: bodyReadModel.safety.noAppLoadDownload,
      noPanelOpenDownload: bodyReadModel.safety.noPanelOpenDownload,
      noArchiveExtraction: bodyReadModel.safety.noArchiveExtraction,
      noFileIo: bodyReadModel.safety.noFileIo,
      noDynamicImports: bodyReadModel.safety.noDynamicImports,
      noLoaderExecution: bodyReadModel.safety.noLoaderExecution,
      noCatalogUpdatePanelWiring: bodyReadModel.safety.noCatalogUpdatePanelWiring,
      noSimulationExecution: bodyReadModel.safety.noSimulationExecution,
      customFormatsOverlayOnly: bodyReadModel.safety.customFormatsOverlayOnly,
      pokemonShowdownAuthority: bodyReadModel.safety.pokemonShowdownAuthority,
      catalogRole: bodyReadModel.safety.catalogRole,
    },
    boundaryNotes: [
      ...bodyReadModel.boundaryNotes,
      'Source policy metadata does not download, extract, write, import, load, or execute Pokemon Showdown archive code.',
      'Observed SHA-256 from a downloaded archive body must not become activation authority until a pinned immutable revision policy is approved.',
    ],
  }
}

export async function fetchShowdownEngineArchiveSourcePolicy(
  options: ShowdownEngineArchiveBodyDownloadProofOptions = {},
): Promise<ShowdownEngineArchiveSourcePolicy> {
  return createShowdownEngineArchiveSourcePolicy({
    bodyReadModel: await fetchShowdownEngineArchiveBodyDownloadReadModel(options),
  })
}

